<?php

namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;
use App\Models\ErrorGroup;
use App\Models\ErrorOccurrence;
use App\Models\IssueComment;
use App\Models\Project;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class IssuesController extends Controller
{
    private const SORTABLE = [
        'id' => 'display_number',
        'count' => 'total_count',
        'users' => 'users_count',
        'first_seen' => 'first_occurrence_at',
        'last_seen' => 'last_occurrence_at',
    ];

    public function index(Project $project, Request $request): Response
    {
        $status = $request->string('status', 'open')->toString();
        $search = trim($request->string('search')->toString());
        $sort = $request->string('sort', 'last_seen')->toString();
        $direction = strtolower($request->string('direction', 'desc')->toString()) === 'asc' ? 'asc' : 'desc';

        if (! array_key_exists($sort, self::SORTABLE)) {
            $sort = 'last_seen';
        }

        $userId = $request->user()?->id;

        $query = $project->errorGroups()
            ->with('assignedTo:id,name,email')
            ->withCount(['occurrences as users_count' => function ($q) {
                $q->select(DB::raw('count(distinct user_identifier)'));
            }]);

        $this->applyStatusFilter($query, $status, $userId);

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function (Builder $q) use ($like) {
                $q->where('exception_class', 'like', $like)
                    ->orWhere('first_message', 'like', $like);
            });
        }

        $column = self::SORTABLE[$sort];
        $query->orderBy($column, $direction);
        if ($sort !== 'last_seen') {
            $query->orderByDesc('last_occurrence_at');
        }

        $groups = $query->paginate(25)->withQueryString();

        $sparklines = $this->sparklines($project, $groups->pluck('id')->all());

        $groups->through(fn (ErrorGroup $group) => [
            'id' => $group->id,
            'display_number' => $group->display_number,
            'exception_class' => $group->exception_class,
            'short_class' => $this->shortClass($group->exception_class),
            'first_message' => $group->first_message,
            'first_file' => $group->first_file,
            'first_line' => $group->first_line,
            'total_count' => $group->total_count,
            'users_count' => (int) ($group->users_count ?? 0),
            'first_occurrence_at' => $group->first_occurrence_at?->toIso8601String(),
            'last_occurrence_at' => $group->last_occurrence_at?->toIso8601String(),
            'status' => $group->status,
            'priority' => $group->priority,
            'is_handled' => (bool) $group->is_handled,
            'assigned_to' => $group->assignedTo ? [
                'id' => $group->assignedTo->id,
                'name' => $group->assignedTo->name,
                'email' => $group->assignedTo->email,
            ] : null,
            'sparkline' => $sparklines[$group->id] ?? [],
        ]);

        $counts = $this->statusCounts($project, $userId);

        return Inertia::render('projects/issues/index', [
            'groups' => $groups,
            'filters' => [
                'status' => $status,
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
            'counts' => $counts,
        ]);
    }

    public function show(Project $project, int $issue): Response
    {
        /** @var ErrorGroup $group */
        $group = $project->errorGroups()
            ->where('display_number', $issue)
            ->with(['assignedTo:id,name,email', 'resolvedBy:id,name,email'])
            ->firstOrFail();

        /** @var ErrorOccurrence|null $latest */
        $latest = $group->occurrences()
            ->with('trace:id,method,uri')
            ->latest('occurred_at')
            ->first();

        $usersCount = (int) $group->occurrences()
            ->whereNotNull('user_identifier')
            ->distinct('user_identifier')
            ->count('user_identifier');

        $environmentCounts = $group->occurrences()
            ->select('environment', DB::raw('count(*) as total'))
            ->groupBy('environment')
            ->get()
            ->map(fn ($row) => [
                'environment' => $row->environment ?? 'unknown',
                'count' => (int) $row->total,
            ])
            ->all();

        $sparkline = $this->sparklines($project, [$group->id])[$group->id] ?? [];

        $assignableUsers = $project->organization?->users()
            ->orderBy('name')
            ->get(['users.id', 'users.name', 'users.email'])
            ->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ])
            ->all() ?? [];

        $occurrenceList = $group->occurrences()
            ->with('trace:id,method,uri')
            ->latest('occurred_at')
            ->limit(50)
            ->get()
            ->map(fn (ErrorOccurrence $occurrence) => [
                'id' => $occurrence->id,
                'occurred_at' => $occurrence->occurred_at?->toIso8601String(),
                'message' => $occurrence->message,
                'user_identifier' => $occurrence->user_identifier,
                'user_email' => $occurrence->user_email,
                'user_name' => $occurrence->user_name,
                'source_type' => $occurrence->trace?->method ?: 'COMMAND',
                'source_label' => $this->sourceLabel($occurrence),
            ])
            ->all();

        $comments = $group->comments()
            ->with('user:id,name,email')
            ->orderBy('created_at')
            ->get()
            ->map(fn (IssueComment $comment) => [
                'id' => $comment->id,
                'body' => $comment->body,
                'type' => $comment->type,
                'created_at' => $comment->created_at?->toIso8601String(),
                'user' => $comment->user ? [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                    'email' => $comment->user->email,
                ] : null,
            ])
            ->all();

        return Inertia::render('projects/issues/show', [
            'issue' => [
                'id' => $group->id,
                'display_number' => $group->display_number,
                'exception_class' => $group->exception_class,
                'short_class' => $this->shortClass($group->exception_class),
                'first_message' => $group->first_message,
                'first_file' => $group->first_file,
                'first_line' => $group->first_line,
                'total_count' => $group->total_count,
                'users_count' => $usersCount,
                'first_occurrence_at' => $group->first_occurrence_at?->toIso8601String(),
                'last_occurrence_at' => $group->last_occurrence_at?->toIso8601String(),
                'status' => $group->status,
                'priority' => $group->priority,
                'description' => $group->description,
                'is_handled' => (bool) $group->is_handled,
                'framework_version' => $group->framework_version,
                'language_version' => $group->language_version,
                'linear_issue_url' => $group->linear_issue_url,
                'subscriber_ids' => $group->subscriber_ids ?? [],
                'assigned_to' => $group->assignedTo ? [
                    'id' => $group->assignedTo->id,
                    'name' => $group->assignedTo->name,
                    'email' => $group->assignedTo->email,
                ] : null,
                'environments' => $environmentCounts,
                'sparkline' => $sparkline,
                'latest_occurrence' => $latest ? [
                    'id' => $latest->id,
                    'message' => $latest->message,
                    'file' => $latest->file,
                    'line' => $latest->line,
                    'stacktrace' => $latest->stacktrace ?? [],
                    'context' => $latest->context ?? [],
                    'occurred_at' => $latest->occurred_at?->toIso8601String(),
                ] : null,
                'occurrence_list' => $occurrenceList,
                'comments' => $comments,
            ],
            'assignableUsers' => $assignableUsers,
        ]);
    }

    public function update(Project $project, int $issue, Request $request): RedirectResponse
    {
        /** @var ErrorGroup $group */
        $group = $project->errorGroups()
            ->where('display_number', $issue)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => ['sometimes', 'in:unresolved,resolved,ignored'],
            'priority' => ['sometimes', 'in:none,low,medium,high'],
            'description' => ['sometimes', 'nullable', 'string', 'max:65535'],
            'assigned_to_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'linear_issue_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'subscribe' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('subscribe', $validated) && $request->user()) {
            $current = $group->subscriber_ids ?? [];
            $userId = $request->user()->id;
            if ($validated['subscribe']) {
                $current = array_values(array_unique([...$current, $userId]));
            } else {
                $current = array_values(array_filter($current, fn ($id) => $id !== $userId));
            }
            $group->subscriber_ids = $current;
            unset($validated['subscribe']);
        }

        if (array_key_exists('status', $validated)) {
            $group->status = $validated['status'];
            if ($validated['status'] === 'resolved') {
                $group->resolved_at = now();
                $group->resolved_by_user_id = $request->user()?->id;
            } else {
                $group->resolved_at = null;
                $group->resolved_by_user_id = null;
            }
        }

        if (array_key_exists('priority', $validated)) {
            $group->priority = $validated['priority'];
        }
        if (array_key_exists('description', $validated)) {
            $group->description = $validated['description'];
        }
        if (array_key_exists('assigned_to_user_id', $validated)) {
            $group->assigned_to_user_id = $validated['assigned_to_user_id'];
        }
        if (array_key_exists('linear_issue_url', $validated)) {
            $group->linear_issue_url = $validated['linear_issue_url'];
        }

        $group->save();

        return back();
    }

    /**
     * @param  Builder<ErrorGroup>|HasMany<ErrorGroup, Project>  $query
     */
    private function applyStatusFilter(Builder|HasMany $query, string $status, ?int $userId): void
    {
        switch ($status) {
            case 'unassigned':
                $query->where('status', 'unresolved')->whereNull('assigned_to_user_id');
                break;
            case 'mine':
                if ($userId) {
                    $query->where('status', 'unresolved')->where('assigned_to_user_id', $userId);
                } else {
                    $query->whereRaw('1 = 0');
                }
                break;
            case 'resolved':
                $query->where('status', 'resolved');
                break;
            case 'ignored':
                $query->where('status', 'ignored');
                break;
            case 'open':
            default:
                $query->where('status', 'unresolved');
                break;
        }
    }

    private function sourceLabel(ErrorOccurrence $occurrence): ?string
    {
        if ($occurrence->trace?->uri) {
            return $occurrence->trace->uri;
        }

        if ($occurrence->file) {
            $parts = explode('/', $occurrence->file);

            return end($parts) ?: $occurrence->file;
        }

        return null;
    }

    /**
     * @param  list<string>  $groupIds
     * @return array<string, list<int>>
     */
    private function sparklines(Project $project, array $groupIds): array
    {
        if ($groupIds === []) {
            return [];
        }

        $start = CarbonImmutable::now()->subDays(14)->startOfDay();
        $end = CarbonImmutable::now()->endOfDay();

        $rows = ErrorOccurrence::query()
            ->where('project_id', $project->id)
            ->whereIn('error_group_id', $groupIds)
            ->whereBetween('occurred_at', [$start, $end])
            ->selectRaw('error_group_id, DATE(occurred_at) as day, count(*) as total')
            ->groupBy('error_group_id', 'day')
            ->get();

        $days = [];
        for ($i = 0; $i < 14; $i++) {
            $days[] = $start->addDays($i)->format('Y-m-d');
        }

        $buckets = [];
        foreach ($groupIds as $id) {
            $buckets[$id] = array_fill(0, 14, 0);
        }

        foreach ($rows as $row) {
            $idx = array_search($row->day, $days, true);
            if ($idx !== false) {
                $buckets[$row->error_group_id][$idx] = (int) $row->total;
            }
        }

        return $buckets;
    }

    /**
     * @return array<string, int>
     */
    private function statusCounts(Project $project, ?int $userId): array
    {
        $base = $project->errorGroups();

        return [
            'open' => (clone $base)->where('status', 'unresolved')->count(),
            'unassigned' => (clone $base)->where('status', 'unresolved')->whereNull('assigned_to_user_id')->count(),
            'mine' => $userId ? (clone $base)->where('status', 'unresolved')->where('assigned_to_user_id', $userId)->count() : 0,
            'resolved' => (clone $base)->where('status', 'resolved')->count(),
            'ignored' => (clone $base)->where('status', 'ignored')->count(),
            'all' => (clone $base)->count(),
        ];
    }

    private function shortClass(string $fqcn): string
    {
        $parts = explode('\\', $fqcn);

        return $parts[count($parts) - 1] ?? $fqcn;
    }
}
