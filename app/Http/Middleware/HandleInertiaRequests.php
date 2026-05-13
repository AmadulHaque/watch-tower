<?php

namespace App\Http\Middleware;

use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $currentProject = $request->route('project');
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'avatar_url' => $user->avatar_path
                        ? asset('storage/'.$user->avatar_path)
                        : null,
                    'is_super_admin' => $user->isSuperAdmin(),
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'currentProject' => $currentProject instanceof Project ? [
                'id' => $currentProject->id,
                'slug' => $currentProject->slug,
                'name' => $currentProject->name,
                'environment' => $currentProject->organization?->plan ?? 'production',
                'open_issues_count' => $currentProject->errorGroups()->where('status', 'unresolved')->count(),
            ] : null,
            'projects' => function () use ($user) {
                if (! $user) {
                    return [];
                }

                $query = $user->isSuperAdmin()
                    ? Project::query()
                    : $user->projects()->getQuery();

                return $query
                    ->orderBy('name')
                    ->get(['projects.id', 'projects.slug', 'projects.name'])
                    ->map(fn (Project $project) => [
                        'id' => $project->id,
                        'slug' => $project->slug,
                        'name' => $project->name,
                    ])
                    ->all();
            },
        ];
    }
}
