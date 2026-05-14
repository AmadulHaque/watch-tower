<?php

use App\Jobs\ProcessWatchEvent;
use App\Models\Project;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;

function ingestToken(int|string $projectId, int $expiresInSeconds = 3600): string
{
    return Crypt::encryptString(json_encode([
        'project_id' => $projectId,
        'expires_at' => time() + $expiresInSeconds,
    ]));
}

function postNightwatchRecords(array $records, ?string $token = null, bool $gzip = true): TestResponse
{
    $body = json_encode(['records' => $records]);
    $headers = [
        'Authorization' => 'Bearer '.($token ?? 'invalid'),
        'Content-Type' => 'application/json',
        'Accept' => 'application/json',
    ];

    if ($gzip) {
        $body = gzencode($body);
        $headers['Content-Encoding'] = 'gzip';
    }

    return test()->call('POST', '/api/nightwatch-ingest', [], [], [], array_merge(
        ['CONTENT_TYPE' => 'application/json'],
        collect($headers)->mapWithKeys(fn ($v, $k) => ['HTTP_'.strtoupper(str_replace('-', '_', $k)) => $v])->all(),
    ), $body);
}

it('rejects ingest without a token', function () {
    test()->call('POST', '/api/nightwatch-ingest')->assertStatus(401);
});

it('rejects ingest with an invalid token', function () {
    postNightwatchRecords([], 'not-an-encrypted-token')->assertStatus(401);
});

it('rejects ingest with an expired token', function () {
    $project = Project::factory()->create();
    $token = ingestToken($project->id, expiresInSeconds: -10);

    postNightwatchRecords([], $token)
        ->assertStatus(401)
        ->assertJson(['message' => 'Expired ingest token']);
});

it('queues a translated request record', function () {
    Queue::fake();
    $project = Project::factory()->create();

    $record = [
        'v' => 1,
        't' => 'request',
        'timestamp' => 1762000000.123,
        'trace_id' => 'trace-abc',
        'method' => 'POST',
        'url' => 'https://app.test/login',
        'route_path' => '/login',
        'status_code' => 200,
        'duration' => 125000, // microseconds
        'ip' => '203.0.113.4',
        'server' => 'web-1',
        'deploy' => 'production',
        'user' => '42',
        'queries' => 3,
        'peak_memory_usage' => 4194304, // 4 MB
    ];

    postNightwatchRecords([$record], ingestToken($project->id))
        ->assertOk()
        ->assertJson(['records_received' => 1, 'records_queued' => 1]);

    Queue::assertPushed(ProcessWatchEvent::class, function ($job) use ($project) {
        return $job->projectId === $project->id
            && $job->event['type'] === 'request'
            && $job->event['data']['method'] === 'POST'
            && $job->event['data']['duration_ms'] === 125
            && $job->event['data']['memory_used_kb'] === 4096
            && $job->event['data']['request_id'] === 'trace-abc';
    });
});

it('skips unknown record types', function () {
    Queue::fake();
    $project = Project::factory()->create();

    postNightwatchRecords([
        ['v' => 1, 't' => 'something-new', 'trace_id' => 'x'],
    ], ingestToken($project->id))
        ->assertOk()
        ->assertJson(['records_received' => 1, 'records_queued' => 0]);

    Queue::assertNotPushed(ProcessWatchEvent::class);
});

it('queues a translated cache-event record', function () {
    Queue::fake();
    $project = Project::factory()->create();

    $record = [
        'v' => 1,
        't' => 'cache-event',
        'timestamp' => 1778755417.835628,
        'deploy' => 'production',
        'server' => 'web-1',
        '_group' => 'group-hash',
        'trace_id' => 'trace-cache-1',
        'execution_source' => 'request',
        'execution_preview' => 'GET /home',
        'store' => 'database',
        'key' => 'test',
        'type' => 'write',
        'duration' => 3223,
        'ttl' => 60,
    ];

    postNightwatchRecords([$record], ingestToken($project->id))
        ->assertOk()
        ->assertJson(['records_received' => 1, 'records_queued' => 1]);

    Queue::assertPushed(ProcessWatchEvent::class, function ($job) use ($project) {
        return $job->projectId === $project->id
            && $job->event['type'] === 'cache-event'
            && $job->event['data']['key'] === 'test'
            && $job->event['data']['store'] === 'database'
            && $job->event['data']['operation'] === 'write'
            && $job->event['data']['succeeded'] === true
            && $job->event['data']['duration_ms'] === 3
            && $job->event['data']['environment'] === 'production'
            && $job->event['data']['request_id'] === 'trace-cache-1';
    });
});

it('queues a translated log record', function () {
    Queue::fake();
    $project = Project::factory()->create();

    $record = [
        'v' => 1,
        't' => 'log',
        'timestamp' => 1778754766.635732,
        'deploy' => 'production',
        'server' => 'web-1',
        'trace_id' => 'trace-log-1',
        'execution_source' => 'request',
        'execution_preview' => 'GET /home',
        'user' => 'amal',
        'level' => 'info',
        'message' => 'HomeController@index called',
        'context' => '{"foo":"bar"}',
    ];

    postNightwatchRecords([$record], ingestToken($project->id))
        ->assertOk()
        ->assertJson(['records_received' => 1, 'records_queued' => 1]);

    Queue::assertPushed(ProcessWatchEvent::class, function ($job) use ($project) {
        return $job->projectId === $project->id
            && $job->event['type'] === 'log'
            && $job->event['data']['level'] === 'info'
            && $job->event['data']['message'] === 'HomeController@index called'
            && $job->event['data']['source_type'] === 'request'
            && $job->event['data']['source_label'] === 'GET /home'
            && $job->event['data']['user_name'] === 'amal'
            && $job->event['data']['context'] === ['foo' => 'bar']
            && $job->event['data']['environment'] === 'production'
            && $job->event['data']['request_id'] === 'trace-log-1';
    });
});

it('rejects payload with malformed JSON', function () {
    $project = Project::factory()->create();

    test()->call('POST', '/api/nightwatch-ingest', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer '.ingestToken($project->id),
        'HTTP_CONTENT_TYPE' => 'application/json',
        'HTTP_ACCEPT' => 'application/json',
    ], 'not valid json')
        ->assertStatus(400);
});
