<?php

namespace App\Watch;

use App\Models\ErrorGroup;
use App\Models\ErrorOccurrence;
use App\Models\EventOccurrence;
use App\Models\Project;
use App\Models\QueueJobRun;
use App\Models\Trace;
use App\Models\TraceQuery;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class EventStore
{
    public function __construct(private readonly Fingerprinter $fingerprinter) {}

    /**
     * Persist a single ingested event for a project.
     *
     * @param  array{type: string, id?: string, data: array<string, mixed>}  $event
     */
    public function store(Project $project, array $event): void
    {
        match ($event['type']) {
            'request' => $this->storeRequest($project, $event['data']),
            'query' => $this->storeQuery($project, $event['data']),
            'exception' => $this->storeException($project, $event['data']),
            'event' => $this->storeEvent($project, $event['data']),
            'job' => $this->storeJob($project, $event['data']),
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function storeRequest(Project $project, array $data): void
    {
        $correlationId = (string) ($data['request_id'] ?? $data['correlation_id'] ?? '');

        if ($correlationId === '') {
            return;
        }

        Trace::updateOrCreate(
            ['correlation_id' => $correlationId],
            [
                'project_id' => $project->id,
                'method' => (string) ($data['method'] ?? 'GET'),
                'uri' => (string) ($data['uri'] ?? '/'),
                'status_code' => $this->intOrNull($data['status_code'] ?? null),
                'user_identifier' => $this->stringOrNull($data['user_id'] ?? null),
                'user_email' => $this->stringOrNull($data['user_email'] ?? null),
                'duration_ms' => $this->intOrNull($data['duration_ms'] ?? null),
                'db_queries_count' => (int) ($data['db_queries_count'] ?? 0),
                'db_time_ms' => (int) ($data['db_time_ms'] ?? 0),
                'memory_used_kb' => $this->intOrNull($data['memory_used_kb'] ?? null),
                'memory_peak_kb' => $this->intOrNull($data['memory_peak_kb'] ?? null),
                'environment' => $this->stringOrNull($data['environment'] ?? null),
                'release_version' => $this->stringOrNull($data['release'] ?? null),
                'hostname' => $this->stringOrNull($data['hostname'] ?? null),
                'ip_address' => $this->stringOrNull($data['ip_address'] ?? null),
                'user_agent' => $this->stringOrNull($data['user_agent'] ?? null),
                'headers' => $data['headers'] ?? null,
                'request_data' => $data['request_data'] ?? null,
                'response_data' => $data['response_data'] ?? null,
                'has_errors' => (bool) ($data['has_errors'] ?? false),
                'has_slow_queries' => (bool) ($data['has_slow_queries'] ?? false),
                'occurred_at' => $this->parseTimestamp($data['occurred_at'] ?? $data['timestamp'] ?? null),
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function storeQuery(Project $project, array $data): void
    {
        $trace = $this->resolveTrace($project, $data);

        if (! $trace) {
            return;
        }

        TraceQuery::create([
            'project_id' => $project->id,
            'trace_id' => $trace->id,
            'query_type' => $this->detectQueryType((string) ($data['sql'] ?? '')),
            'sql' => (string) ($data['sql'] ?? ''),
            'bindings' => $data['bindings'] ?? null,
            'connection_name' => $this->stringOrNull($data['connection'] ?? null),
            'duration_ms' => (float) ($data['duration_ms'] ?? 0),
            'row_count' => $this->intOrNull($data['row_count'] ?? null),
            'is_n_plus_one' => (bool) ($data['is_n_plus_one'] ?? false),
            'n_plus_one_group' => $this->stringOrNull($data['n_plus_one_group'] ?? null),
            'is_slow' => (bool) ($data['is_slow'] ?? false),
            'occurred_at' => $this->parseTimestamp($data['occurred_at'] ?? null),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function storeException(Project $project, array $data): void
    {
        $trace = $this->resolveTrace($project, $data);

        $fingerprint = $this->fingerprinter->forException($data);
        $exceptionClass = (string) ($data['class'] ?? $data['exception_class'] ?? 'Exception');
        $message = $this->stringOrNull($data['message'] ?? null);
        $file = $this->stringOrNull($data['file'] ?? null);
        $line = $this->intOrNull($data['line'] ?? null);
        $occurredAt = $this->parseTimestamp($data['occurred_at'] ?? null);

        DB::transaction(function () use ($project, $trace, $fingerprint, $exceptionClass, $message, $file, $line, $occurredAt, $data) {
            $group = ErrorGroup::where('project_id', $project->id)
                ->where('fingerprint', $fingerprint)
                ->lockForUpdate()
                ->first();

            if ($group) {
                $group->forceFill([
                    'total_count' => $group->total_count + 1,
                    'last_occurrence_at' => $occurredAt,
                ])->save();
            } else {
                $nextDisplayNumber = (int) (ErrorGroup::where('project_id', $project->id)->max('display_number') ?? 0) + 1;

                $group = ErrorGroup::create([
                    'project_id' => $project->id,
                    'fingerprint' => $fingerprint,
                    'display_number' => $nextDisplayNumber,
                    'exception_class' => $exceptionClass,
                    'first_message' => $message,
                    'first_file' => $file,
                    'first_line' => $line,
                    'total_count' => 1,
                    'first_occurrence_at' => $occurredAt,
                    'last_occurrence_at' => $occurredAt,
                    'status' => 'unresolved',
                ]);
            }

            ErrorOccurrence::create([
                'project_id' => $project->id,
                'trace_id' => $trace?->id,
                'error_group_id' => $group->id,
                'exception_class' => $exceptionClass,
                'message' => $message,
                'stacktrace' => $data['trace'] ?? $data['stacktrace'] ?? [],
                'fingerprint' => $fingerprint,
                'user_identifier' => $this->stringOrNull($data['user_id'] ?? null),
                'user_email' => $this->stringOrNull($data['user_email'] ?? null),
                'file' => $file,
                'line' => $line,
                'environment' => $this->stringOrNull($data['environment'] ?? null),
                'release_version' => $this->stringOrNull($data['release'] ?? null),
                'context' => $data['context'] ?? null,
                'occurred_at' => $occurredAt,
            ]);

            if ($trace) {
                $trace->forceFill(['has_errors' => true])->save();
            }
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function storeEvent(Project $project, array $data): void
    {
        $trace = $this->resolveTrace($project, $data);

        EventOccurrence::create([
            'project_id' => $project->id,
            'trace_id' => $trace?->id,
            'event_class' => (string) ($data['class'] ?? $data['event_class'] ?? 'UnknownEvent'),
            'fired_by' => $this->stringOrNull($data['fired_by'] ?? null),
            'duration_ms' => $this->intOrNull($data['duration_ms'] ?? null),
            'listeners_count' => (int) ($data['listeners_count'] ?? 0),
            'payload' => $data['payload'] ?? null,
            'occurred_at' => $this->parseTimestamp($data['occurred_at'] ?? null),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function storeJob(Project $project, array $data): void
    {
        $trace = $this->resolveTrace($project, $data);

        QueueJobRun::create([
            'project_id' => $project->id,
            'trace_id' => $trace?->id,
            'job_class' => (string) ($data['class'] ?? $data['job_class'] ?? 'UnknownJob'),
            'queue' => $this->stringOrNull($data['queue'] ?? null),
            'connection' => $this->stringOrNull($data['connection'] ?? null),
            'dispatched_at' => $this->parseTimestamp($data['dispatched_at'] ?? null, allowNull: true),
            'started_at' => $this->parseTimestamp($data['started_at'] ?? null, allowNull: true),
            'completed_at' => $this->parseTimestamp($data['completed_at'] ?? null, allowNull: true),
            'failed_at' => $this->parseTimestamp($data['failed_at'] ?? null, allowNull: true),
            'duration_ms' => $this->intOrNull($data['duration_ms'] ?? null),
            'attempts' => (int) ($data['attempts'] ?? 0),
            'status' => (string) ($data['status'] ?? 'pending'),
            'payload' => $data['payload'] ?? null,
            'exception' => $data['exception'] ?? null,
            'environment' => $this->stringOrNull($data['environment'] ?? null),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveTrace(Project $project, array $data): ?Trace
    {
        $correlationId = $data['request_id'] ?? $data['correlation_id'] ?? null;

        if (! $correlationId) {
            return null;
        }

        return Trace::where('project_id', $project->id)
            ->where('correlation_id', (string) $correlationId)
            ->first();
    }

    private function detectQueryType(string $sql): ?string
    {
        $trimmed = ltrim($sql);

        if ($trimmed === '') {
            return null;
        }

        $first = strtoupper(strtok($trimmed, " \t\n"));

        return in_array($first, ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'REPLACE'], true)
            ? $first
            : null;
    }

    private function parseTimestamp(mixed $value, bool $allowNull = false): ?CarbonImmutable
    {
        if (! $value) {
            return $allowNull ? null : CarbonImmutable::now();
        }

        try {
            return CarbonImmutable::parse((string) $value);
        } catch (\Throwable) {
            return $allowNull ? null : CarbonImmutable::now();
        }
    }

    private function intOrNull(mixed $value): ?int
    {
        return $value === null || $value === '' ? null : (int) $value;
    }

    private function stringOrNull(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
    }
}
