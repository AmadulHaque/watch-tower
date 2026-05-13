<?php

namespace Database\Seeders;

use App\Models\ErrorGroup;
use App\Models\ErrorOccurrence;
use App\Models\Organization;
use App\Models\Project;
use App\Models\QueueJobRun;
use App\Models\Trace;
use App\Models\TraceQuery;
use App\Models\User;
use App\Watch\Fingerprinter;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::query()->firstOrCreate(
            ['slug' => 'acme'],
            ['name' => 'Acme Inc.', 'plan' => 'pro', 'retention_days' => 30]
        );

        $teamMembers = [
            ['name' => 'Jordan Pierce', 'email' => 'jordan@acme.test'],
            ['name' => 'Riley Chen', 'email' => 'riley@acme.test'],
            ['name' => 'Sam Okafor', 'email' => 'sam@acme.test'],
            ['name' => 'Avery Patel', 'email' => 'avery@acme.test'],
        ];

        $teamUsers = collect($teamMembers)->map(fn (array $member) => User::query()->firstOrCreate(
            ['email' => $member['email']],
            [
                'name' => $member['name'],
                'password' => Hash::make('password'),
                'organization_id' => $organization->id,
                'role' => 'member',
            ]
        ))->all();

        $project = Project::query()->firstOrCreate(
            ['slug' => 'acme-app'],
            [
                'organization_id' => $organization->id,
                'name' => 'Acme App',
                'description' => 'Production demo project',
                'api_key' => 'pk_demo_'.Str::random(40),
                'api_secret_hash' => Hash::make('sk_demo_'.Str::random(40)),
                'sampling_rate' => 1.0,
                'retention_days' => 30,
            ]
        );

        $this->command?->info("Seeding traces for project: {$project->name}");

        $now = CarbonImmutable::now();
        $start = $now->subDay();

        $routes = [
            ['GET', '/api/users', 200, 12],
            ['GET', '/api/users', 200, 18],
            ['GET', '/api/users/{id}', 200, 9],
            ['POST', '/api/users', 201, 45],
            ['POST', '/api/orders', 201, 132],
            ['GET', '/api/orders', 200, 27],
            ['GET', '/api/orders/{id}', 200, 16],
            ['PUT', '/api/orders/{id}', 200, 64],
            ['DELETE', '/api/orders/{id}', 204, 30],
            ['GET', '/dashboard', 200, 88],
            ['GET', '/settings', 200, 44],
            ['POST', '/api/payments', 200, 412],
            ['POST', '/api/payments', 500, 1240],
            ['GET', '/api/reports/heavy', 200, 1850],
            ['GET', '/api/search', 200, 230],
            ['GET', '/api/search', 404, 21],
            ['GET', '/api/products', 200, 22],
            ['POST', '/api/checkout', 422, 18],
            ['POST', '/api/checkout', 200, 320],
            ['GET', '/api/notifications', 200, 14],
        ];

        $totalTraces = 480;
        $traces = [];

        for ($i = 0; $i < $totalTraces; $i++) {
            $route = $routes[array_rand($routes)];
            [$method, $uri, $baseStatus, $baseDuration] = $route;

            $jitter = random_int(-30, 200) / 100;
            $duration = max(2, (int) round($baseDuration * (1 + $jitter)));

            $status = $baseStatus;
            if (random_int(1, 100) <= 4) {
                $status = 500;
            } elseif (random_int(1, 100) <= 8 && $baseStatus < 400) {
                $status = [400, 401, 403, 404, 422][array_rand([400, 401, 403, 404, 422])];
            }

            $offsetSeconds = random_int(0, 86_400);
            $occurredAt = $start->addSeconds($offsetSeconds);

            $traces[] = [
                'id' => (string) Str::uuid(),
                'project_id' => $project->id,
                'correlation_id' => (string) Str::uuid(),
                'method' => $method,
                'uri' => $uri,
                'status_code' => $status,
                'duration_ms' => $duration,
                'db_queries_count' => random_int(0, 18),
                'db_time_ms' => random_int(0, max(1, (int) ($duration / 3))),
                'memory_used_kb' => random_int(2_048, 32_768),
                'memory_peak_kb' => random_int(4_096, 65_536),
                'environment' => 'production',
                'release_version' => 'v1.4.2',
                'hostname' => 'web-'.random_int(1, 3),
                'ip_address' => '203.0.113.'.random_int(1, 254),
                'user_agent' => 'Mozilla/5.0 (compatible; Demo/1.0)',
                'headers' => json_encode(['accept' => 'application/json']),
                'request_data' => json_encode([]),
                'response_data' => json_encode(['status' => 'ok']),
                'has_errors' => $status >= 500,
                'has_slow_queries' => $duration > 800,
                'occurred_at' => $occurredAt,
                'created_at' => $occurredAt,
                'updated_at' => $occurredAt,
            ];
        }

        foreach (array_chunk($traces, 200) as $chunk) {
            Trace::query()->insert($chunk);
        }

        $this->seedExceptions($project, $traces, $start, $teamUsers);
        $this->seedQueries($project, $traces);
        $this->seedJobs($project, $start);
    }

    /**
     * @param  list<array<string, mixed>>  $traces
     * @param  list<User>  $teamUsers
     */
    private function seedExceptions(Project $project, array $traces, CarbonImmutable $start, array $teamUsers): void
    {
        $templates = [
            [
                'class' => 'Illuminate\\Database\\QueryException',
                'message' => 'SQLSTATE[42S22]: Column not found: orders.status',
                'file' => 'app/Repositories/OrderRepository.php',
                'line' => 84,
                'is_handled' => false,
                'stacktrace' => [
                    ['file' => 'app/Repositories/OrderRepository.php', 'line' => 84, 'function' => 'findByStatus', 'class' => 'App\\Repositories\\OrderRepository'],
                    ['file' => 'app/Http/Controllers/OrderController.php', 'line' => 47, 'function' => 'index', 'class' => 'App\\Http\\Controllers\\OrderController'],
                    ['file' => 'vendor/laravel/framework/src/Illuminate/Routing/Controller.php', 'line' => 54, 'function' => 'callAction', 'class' => 'Illuminate\\Routing\\Controller'],
                    ['file' => 'vendor/laravel/framework/src/Illuminate/Routing/ControllerDispatcher.php', 'line' => 43, 'function' => 'dispatch', 'class' => 'Illuminate\\Routing\\ControllerDispatcher'],
                    ['file' => 'vendor/laravel/framework/src/Illuminate/Routing/Route.php', 'line' => 260, 'function' => 'runController', 'class' => 'Illuminate\\Routing\\Route'],
                ],
            ],
            [
                'class' => 'GuzzleHttp\\Exception\\ConnectException',
                'message' => 'cURL error 28: Connection timed out after 30000 ms',
                'file' => 'app/Services/PaymentGateway.php',
                'line' => 122,
                'is_handled' => true,
                'stacktrace' => [
                    ['file' => 'app/Services/PaymentGateway.php', 'line' => 122, 'function' => 'charge', 'class' => 'App\\Services\\PaymentGateway'],
                    ['file' => 'app/Http/Controllers/PaymentController.php', 'line' => 73, 'function' => 'store', 'class' => 'App\\Http\\Controllers\\PaymentController'],
                    ['file' => 'vendor/guzzlehttp/guzzle/src/Handler/CurlFactory.php', 'line' => 211, 'function' => 'createRejection', 'class' => 'GuzzleHttp\\Handler\\CurlFactory'],
                ],
            ],
            [
                'class' => 'TypeError',
                'message' => 'Argument #1 ($id) must be of type int, string given',
                'file' => 'app/Http/Controllers/UserController.php',
                'line' => 56,
                'is_handled' => false,
                'stacktrace' => [
                    ['file' => 'app/Http/Controllers/UserController.php', 'line' => 56, 'function' => 'show', 'class' => 'App\\Http\\Controllers\\UserController'],
                    ['file' => 'app/Services/UserResolver.php', 'line' => 21, 'function' => 'resolve', 'class' => 'App\\Services\\UserResolver'],
                    ['file' => 'vendor/laravel/framework/src/Illuminate/Routing/Route.php', 'line' => 260, 'function' => 'runController', 'class' => 'Illuminate\\Routing\\Route'],
                ],
            ],
            [
                'class' => 'Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException',
                'message' => 'The route api/legacy could not be found.',
                'file' => 'vendor/symfony/http-kernel/HttpKernel.php',
                'line' => 138,
                'is_handled' => true,
                'stacktrace' => [
                    ['file' => 'vendor/symfony/http-kernel/HttpKernel.php', 'line' => 138, 'function' => 'handleRaw', 'class' => 'Symfony\\Component\\HttpKernel\\HttpKernel'],
                    ['file' => 'vendor/laravel/framework/src/Illuminate/Foundation/Http/Kernel.php', 'line' => 169, 'function' => 'handle', 'class' => 'Illuminate\\Foundation\\Http\\Kernel'],
                ],
            ],
            [
                'class' => 'RuntimeException',
                'message' => 'Failed to dispatch InvoiceMailer: queue connection unavailable',
                'file' => 'app/Jobs/SendInvoice.php',
                'line' => 41,
                'is_handled' => false,
                'stacktrace' => [
                    ['file' => 'app/Jobs/SendInvoice.php', 'line' => 41, 'function' => 'handle', 'class' => 'App\\Jobs\\SendInvoice'],
                    ['file' => 'vendor/laravel/framework/src/Illuminate/Queue/CallQueuedHandler.php', 'line' => 122, 'function' => 'call', 'class' => 'Illuminate\\Queue\\CallQueuedHandler'],
                    ['file' => 'vendor/laravel/framework/src/Illuminate/Queue/Jobs/Job.php', 'line' => 99, 'function' => 'fire', 'class' => 'Illuminate\\Queue\\Jobs\\Job'],
                ],
            ],
            [
                'class' => 'Illuminate\\Auth\\AuthenticationException',
                'message' => 'Unauthenticated.',
                'file' => 'app/Http/Middleware/Authenticate.php',
                'line' => 27,
                'is_handled' => true,
                'stacktrace' => [
                    ['file' => 'app/Http/Middleware/Authenticate.php', 'line' => 27, 'function' => 'redirectTo', 'class' => 'App\\Http\\Middleware\\Authenticate'],
                    ['file' => 'vendor/laravel/framework/src/Illuminate/Auth/Middleware/Authenticate.php', 'line' => 81, 'function' => 'unauthenticated', 'class' => 'Illuminate\\Auth\\Middleware\\Authenticate'],
                ],
            ],
            [
                'class' => 'Illuminate\\Validation\\ValidationException',
                'message' => 'The given data was invalid.',
                'file' => 'app/Http/Requests/CheckoutRequest.php',
                'line' => 38,
                'is_handled' => true,
                'stacktrace' => [
                    ['file' => 'app/Http/Requests/CheckoutRequest.php', 'line' => 38, 'function' => 'rules', 'class' => 'App\\Http\\Requests\\CheckoutRequest'],
                    ['file' => 'vendor/laravel/framework/src/Illuminate/Foundation/Http/FormRequest.php', 'line' => 145, 'function' => 'failedValidation', 'class' => 'Illuminate\\Foundation\\Http\\FormRequest'],
                ],
            ],
            [
                'class' => 'Redis\\RedisException',
                'message' => 'Connection refused: tcp://redis:6379',
                'file' => 'app/Services/CacheWarmer.php',
                'line' => 64,
                'is_handled' => false,
                'stacktrace' => [
                    ['file' => 'app/Services/CacheWarmer.php', 'line' => 64, 'function' => 'warm', 'class' => 'App\\Services\\CacheWarmer'],
                    ['file' => 'app/Console/Commands/WarmCache.php', 'line' => 22, 'function' => 'handle', 'class' => 'App\\Console\\Commands\\WarmCache'],
                ],
            ],
        ];

        $priorities = ['none', 'none', 'none', 'low', 'low', 'medium', 'medium', 'high'];
        $descriptions = [
            null,
            null,
            "Started appearing after the **v1.4.2** deploy.\n\nLikely related to the new orders table migration that added the `status` column.",
            "Customer reports indicate this happens at checkout when payment provider is slow.\n\n- Affecting ~3% of payments\n- Retry queue picks up most failures",
            "Reproduced locally by passing a numeric string to the `users.show` route.\n\nNeed to add explicit casting at the controller boundary.",
        ];

        $errorTraces = array_values(array_filter($traces, fn (array $t): bool => $t['has_errors']));
        $errorRows = [];
        $groups = [];
        $fingerprinter = new Fingerprinter;
        $environments = ['production', 'production', 'production', 'staging'];

        $errorCount = max(120, count($errorTraces) * 2);

        for ($i = 0; $i < $errorCount; $i++) {
            $tpl = $templates[array_rand($templates)];
            $trace = $errorTraces !== [] && random_int(1, 100) <= 70
                ? $errorTraces[array_rand($errorTraces)]
                : null;

            $occurredAt = $trace
                ? CarbonImmutable::parse($trace['occurred_at'])
                : $start->addSeconds(random_int(0, 86_400));

            $fingerprint = $fingerprinter->forException([
                'class' => $tpl['class'],
                'file' => $tpl['file'],
                'line' => $tpl['line'],
            ]);

            if (! isset($groups[$fingerprint])) {
                $groups[$fingerprint] = [
                    'id' => (string) Str::uuid(),
                    'project_id' => $project->id,
                    'fingerprint' => $fingerprint,
                    'display_number' => count($groups) + 1,
                    'exception_class' => $tpl['class'],
                    'first_message' => $tpl['message'],
                    'first_file' => $tpl['file'],
                    'first_line' => $tpl['line'],
                    'total_count' => 0,
                    'first_occurrence_at' => $occurredAt,
                    'last_occurrence_at' => $occurredAt,
                    'status' => 'unresolved',
                    'priority' => $priorities[array_rand($priorities)],
                    'description' => $descriptions[array_rand($descriptions)],
                    'is_handled' => $tpl['is_handled'],
                    'linear_issue_url' => null,
                    'subscriber_ids' => json_encode([]),
                    'framework_version' => '12.35.1',
                    'language_version' => '8.4.0',
                    'assigned_to_user_id' => random_int(1, 100) <= 60 ? $teamUsers[array_rand($teamUsers)]->id : null,
                    'tags' => json_encode([]),
                    'created_at' => $occurredAt,
                    'updated_at' => $occurredAt,
                ];
            }

            $groups[$fingerprint]['total_count']++;
            if ($occurredAt->lt($groups[$fingerprint]['first_occurrence_at'])) {
                $groups[$fingerprint]['first_occurrence_at'] = $occurredAt;
            }
            if ($occurredAt->gt($groups[$fingerprint]['last_occurrence_at'])) {
                $groups[$fingerprint]['last_occurrence_at'] = $occurredAt;
                $groups[$fingerprint]['updated_at'] = $occurredAt;
            }

            $errorRows[] = [
                'id' => (string) Str::uuid(),
                'project_id' => $project->id,
                'trace_id' => $trace['id'] ?? null,
                'error_group_id' => $groups[$fingerprint]['id'],
                'exception_class' => $tpl['class'],
                'message' => $tpl['message'],
                'stacktrace' => json_encode($tpl['stacktrace']),
                'fingerprint' => $fingerprint,
                'user_identifier' => random_int(1, 100) <= 70 ? 'user_'.random_int(1, 40) : null,
                'user_email' => random_int(1, 100) <= 40 ? 'user'.random_int(1, 40).'@example.test' : null,
                'file' => $tpl['file'],
                'line' => $tpl['line'],
                'is_handled' => $tpl['is_handled'],
                'environment' => $environments[array_rand($environments)],
                'release_version' => 'v1.4.2',
                'context' => json_encode([
                    'request' => ['method' => 'GET', 'url' => '/api/example'],
                ]),
                'occurred_at' => $occurredAt,
                'created_at' => $occurredAt,
                'updated_at' => $occurredAt,
            ];
        }

        ErrorGroup::query()->insert(array_values($groups));
        foreach (array_chunk($errorRows, 200) as $chunk) {
            ErrorOccurrence::query()->insert($chunk);
        }
    }

    /**
     * @param  list<array<string, mixed>>  $traces
     */
    private function seedQueries(Project $project, array $traces): void
    {
        $queries = [
            'SELECT * FROM users WHERE id = ?',
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            'UPDATE orders SET status = ? WHERE id = ?',
            'INSERT INTO sessions (id, user_id, payload) VALUES (?, ?, ?)',
            'SELECT count(*) FROM notifications WHERE user_id = ? AND read_at IS NULL',
        ];

        $rows = [];
        foreach ($traces as $trace) {
            $count = (int) $trace['db_queries_count'];
            for ($i = 0; $i < $count; $i++) {
                $sql = $queries[array_rand($queries)];
                $duration = random_int(1, 220) / 10;
                $rows[] = [
                    'id' => (string) Str::uuid(),
                    'project_id' => $project->id,
                    'trace_id' => $trace['id'],
                    'query_type' => str_starts_with($sql, 'SELECT') ? 'select' : (str_starts_with($sql, 'INSERT') ? 'insert' : 'update'),
                    'sql' => $sql,
                    'bindings' => json_encode([]),
                    'connection_name' => 'mysql',
                    'duration_ms' => $duration,
                    'row_count' => random_int(0, 50),
                    'is_n_plus_one' => $count > 12,
                    'is_slow' => $duration > 15,
                    'occurred_at' => $trace['occurred_at'],
                    'created_at' => $trace['occurred_at'],
                    'updated_at' => $trace['occurred_at'],
                ];

                if (count($rows) >= 500) {
                    TraceQuery::query()->insert($rows);
                    $rows = [];
                }
            }
        }

        if ($rows !== []) {
            TraceQuery::query()->insert($rows);
        }
    }

    private function seedJobs(Project $project, CarbonImmutable $start): void
    {
        $jobClasses = [
            'App\\Jobs\\SendInvoiceEmail',
            'App\\Jobs\\ProcessPayment',
            'App\\Jobs\\GenerateReport',
            'App\\Jobs\\SyncCustomer',
            'App\\Jobs\\PruneAuditLog',
        ];
        $statuses = ['completed', 'completed', 'completed', 'completed', 'failed', 'released'];

        $rows = [];
        for ($i = 0; $i < 320; $i++) {
            $dispatched = $start->addSeconds(random_int(0, 86_400));
            $startedAt = $dispatched->addSeconds(random_int(0, 5));
            $duration = random_int(40, 4_200);
            $status = $statuses[array_rand($statuses)];
            $completedAt = $status === 'completed' ? $startedAt->addMilliseconds($duration) : null;
            $failedAt = $status === 'failed' ? $startedAt->addMilliseconds($duration) : null;

            $rows[] = [
                'id' => (string) Str::uuid(),
                'project_id' => $project->id,
                'trace_id' => null,
                'job_class' => $jobClasses[array_rand($jobClasses)],
                'queue' => 'default',
                'connection' => 'redis',
                'dispatched_at' => $dispatched,
                'started_at' => $startedAt,
                'completed_at' => $completedAt,
                'failed_at' => $failedAt,
                'duration_ms' => $duration,
                'attempts' => $status === 'failed' ? random_int(2, 3) : 1,
                'status' => $status,
                'payload' => json_encode([]),
                'exception' => $status === 'failed' ? json_encode(['class' => 'RuntimeException', 'message' => 'demo failure']) : null,
                'environment' => 'production',
                'created_at' => $dispatched,
                'updated_at' => $completedAt ?? $failedAt ?? $dispatched,
            ];
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            QueueJobRun::query()->insert($chunk);
        }
    }
}
