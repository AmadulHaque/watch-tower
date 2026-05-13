<?php

namespace App\Http\Middleware;

use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $currentProject = $request->route('project');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'currentProject' => $currentProject instanceof Project ? [
                'id' => $currentProject->id,
                'slug' => $currentProject->slug,
                'name' => $currentProject->name,
                'environment' => $currentProject->organization?->plan ?? 'production',
                'open_issues_count' => $currentProject->errorGroups()->where('status', 'unresolved')->count(),
            ] : null,
            'projects' => fn () => Project::query()
                ->orderBy('name')
                ->get(['id', 'slug', 'name'])
                ->map(fn (Project $project) => [
                    'id' => $project->id,
                    'slug' => $project->slug,
                    'name' => $project->name,
                ])
                ->all(),
        ];
    }
}
