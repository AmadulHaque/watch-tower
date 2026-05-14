<?php

use App\Models\CacheEvent;
use App\Models\ErrorGroup;
use App\Models\ErrorOccurrence;
use App\Models\LogEntry;
use App\Models\Project;
use App\Models\Trace;
use App\Models\TraceQuery;
use App\Watch\EventStore;
use App\Watch\Fingerprinter;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->store = new EventStore(new Fingerprinter);
    $this->project = Project::factory()->create();
});

it('upserts traces by correlation id', function () {
    $correlationId = (string) Str::uuid();

    $this->store->store($this->project, [
        'type' => 'request',
        'data' => ['request_id' => $correlationId, 'method' => 'GET', 'uri' => '/foo', 'status_code' => 200, 'duration_ms' => 50],
    ]);
    $this->store->store($this->project, [
        'type' => 'request',
        'data' => ['request_id' => $correlationId, 'method' => 'GET', 'uri' => '/foo', 'status_code' => 500, 'duration_ms' => 75],
    ]);

    expect(Trace::where('correlation_id', $correlationId)->count())->toBe(1);

    $trace = Trace::where('correlation_id', $correlationId)->first();
    expect($trace->status_code)->toBe(500)
        ->and($trace->duration_ms)->toBe(75);
});

it('groups exceptions sharing class, file and line into one error group and increments count', function () {
    $this->store->store($this->project, [
        'type' => 'exception',
        'data' => ['class' => 'RuntimeException', 'file' => 'app/A.php', 'line' => 5, 'message' => 'first'],
    ]);
    $this->store->store($this->project, [
        'type' => 'exception',
        'data' => ['class' => 'RuntimeException', 'file' => 'app/A.php', 'line' => 5, 'message' => 'second'],
    ]);
    $this->store->store($this->project, [
        'type' => 'exception',
        'data' => ['class' => 'RuntimeException', 'file' => 'app/B.php', 'line' => 5, 'message' => 'different file'],
    ]);

    expect(ErrorGroup::where('project_id', $this->project->id)->count())->toBe(2);
    expect(ErrorOccurrence::where('project_id', $this->project->id)->count())->toBe(3);

    $group = ErrorGroup::where('project_id', $this->project->id)
        ->where('first_file', 'app/A.php')
        ->first();
    expect($group->total_count)->toBe(2);
});

it('marks the parent trace as having errors when an exception is stored', function () {
    $correlationId = (string) Str::uuid();

    $this->store->store($this->project, [
        'type' => 'request',
        'data' => ['request_id' => $correlationId, 'method' => 'POST', 'uri' => '/x', 'status_code' => 500],
    ]);
    $this->store->store($this->project, [
        'type' => 'exception',
        'data' => ['request_id' => $correlationId, 'class' => 'RuntimeException', 'file' => 'app/A.php', 'line' => 5, 'message' => 'boom'],
    ]);

    $trace = Trace::where('correlation_id', $correlationId)->first();
    expect($trace->has_errors)->toBeTrue();
    expect(ErrorOccurrence::where('trace_id', $trace->id)->count())->toBe(1);
});

it('stores log entries and links them to a trace by correlation id', function () {
    $correlationId = (string) Str::uuid();

    $this->store->store($this->project, [
        'type' => 'request',
        'data' => ['request_id' => $correlationId, 'method' => 'GET', 'uri' => '/home'],
    ]);
    $this->store->store($this->project, [
        'type' => 'log',
        'data' => [
            'request_id' => $correlationId,
            'level' => 'info',
            'message' => 'HomeController@index called',
            'source_type' => 'request',
            'source_label' => 'GET /home',
            'user_name' => 'amal',
            'context' => ['foo' => 'bar'],
            'environment' => 'production',
        ],
    ]);

    $trace = Trace::where('correlation_id', $correlationId)->first();
    $log = LogEntry::where('project_id', $this->project->id)->first();

    expect($log)->not->toBeNull()
        ->and($log->trace_id)->toBe($trace->id)
        ->and($log->level)->toBe('info')
        ->and($log->message)->toBe('HomeController@index called')
        ->and($log->source_type)->toBe('request')
        ->and($log->source_label)->toBe('GET /home')
        ->and($log->user_name)->toBe('amal')
        ->and($log->context)->toBe(['foo' => 'bar'])
        ->and($log->environment)->toBe('production');
});

it('stores cache events linked to a trace by correlation id', function () {
    $correlationId = (string) Str::uuid();

    $this->store->store($this->project, [
        'type' => 'request',
        'data' => ['request_id' => $correlationId, 'method' => 'GET', 'uri' => '/home'],
    ]);
    $this->store->store($this->project, [
        'type' => 'cache-event',
        'data' => [
            'request_id' => $correlationId,
            'key' => 'test',
            'store' => 'database',
            'operation' => 'write',
            'succeeded' => true,
            'duration_ms' => 3,
            'environment' => 'production',
        ],
    ]);

    $trace = Trace::where('correlation_id', $correlationId)->first();
    $event = CacheEvent::where('project_id', $this->project->id)->first();

    expect($event)->not->toBeNull()
        ->and($event->trace_id)->toBe($trace->id)
        ->and($event->key)->toBe('test')
        ->and($event->store)->toBe('database')
        ->and($event->operation)->toBe('write')
        ->and($event->succeeded)->toBeTrue()
        ->and($event->duration_ms)->toBe(3)
        ->and($event->environment)->toBe('production');
});

it('stores log entries without a trace when correlation id is unknown', function () {
    $this->store->store($this->project, [
        'type' => 'log',
        'data' => [
            'request_id' => (string) Str::uuid(),
            'level' => 'warning',
            'message' => 'orphaned log',
        ],
    ]);

    $log = LogEntry::where('project_id', $this->project->id)->first();
    expect($log)->not->toBeNull()
        ->and($log->trace_id)->toBeNull()
        ->and($log->level)->toBe('warning');
});

it('attaches queries to traces by correlation id and skips orphan queries', function () {
    $correlationId = (string) Str::uuid();

    // Orphan query (no trace yet) is dropped.
    $this->store->store($this->project, [
        'type' => 'query',
        'data' => ['request_id' => $correlationId, 'sql' => 'SELECT 1', 'duration_ms' => 1.5],
    ]);
    expect(TraceQuery::count())->toBe(0);

    $this->store->store($this->project, [
        'type' => 'request',
        'data' => ['request_id' => $correlationId, 'method' => 'GET', 'uri' => '/q'],
    ]);
    $this->store->store($this->project, [
        'type' => 'query',
        'data' => ['request_id' => $correlationId, 'sql' => 'SELECT * FROM users', 'duration_ms' => 12.345, 'is_slow' => true],
    ]);

    $trace = Trace::where('correlation_id', $correlationId)->first();
    expect(TraceQuery::where('trace_id', $trace->id)->count())->toBe(1);

    $query = TraceQuery::first();
    expect($query->query_type)->toBe('SELECT')
        ->and($query->is_slow)->toBeTrue();
});
