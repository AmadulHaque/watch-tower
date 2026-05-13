<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProjectAdminController extends Controller
{
    public function index(): Response
    {
        $projects = Project::query()
            ->orderBy('name')
            ->withCount(['admins', 'errorGroups as open_issues_count' => function ($q) {
                $q->where('status', 'unresolved');
            }])
            ->get(['id', 'name', 'slug', 'description', 'api_key', 'sampling_rate', 'retention_days', 'created_at'])
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'slug' => $project->slug,
                'description' => $project->description,
                'api_key' => $project->api_key,
                'sampling_rate' => $project->sampling_rate,
                'retention_days' => $project->retention_days,
                'admins_count' => $project->admins_count,
                'open_issues_count' => $project->open_issues_count,
                'created_at' => $project->created_at?->toISOString(),
            ]);

        return Inertia::render('settings/projects/index', [
            'projects' => $projects,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('settings/projects/create', [
            'admins' => $this->adminOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:64', 'unique:projects,slug', 'regex:/^[a-z0-9-]+$/'],
            'description' => ['nullable', 'string', 'max:1000'],
            'sampling_rate' => ['required', 'numeric', 'min:0', 'max:1'],
            'retention_days' => ['required', 'integer', 'min:1', 'max:365'],
            'admin_ids' => ['array'],
            'admin_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $project = Project::create([
            'organization_id' => Organization::query()->orderBy('created_at')->value('id'),
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'api_key' => 'pk_'.Str::random(32),
            'api_secret_hash' => hash('sha256', Str::random(48)),
            'sampling_rate' => $validated['sampling_rate'],
            'retention_days' => $validated['retention_days'],
        ]);

        $project->admins()->sync($validated['admin_ids'] ?? []);

        return redirect()->route('settings.projects.index')->with('success', 'Project created.');
    }

    public function edit(Project $project): Response
    {
        return Inertia::render('settings/projects/edit', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'slug' => $project->slug,
                'description' => $project->description,
                'sampling_rate' => $project->sampling_rate,
                'retention_days' => $project->retention_days,
                'admin_ids' => $project->admins()->pluck('users.id')->all(),
            ],
            'admins' => $this->adminOptions(),
        ]);
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:64', 'regex:/^[a-z0-9-]+$/', Rule::unique('projects', 'slug')->ignore($project->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'sampling_rate' => ['required', 'numeric', 'min:0', 'max:1'],
            'retention_days' => ['required', 'integer', 'min:1', 'max:365'],
            'admin_ids' => ['array'],
            'admin_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $project->update([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'sampling_rate' => $validated['sampling_rate'],
            'retention_days' => $validated['retention_days'],
        ]);

        $project->admins()->sync($validated['admin_ids'] ?? []);

        return redirect()->route('settings.projects.index')->with('success', 'Project updated.');
    }

    public function destroy(Request $request, Project $project): RedirectResponse
    {
        $confirmation = $request->input('confirmation');

        if ($confirmation !== $project->slug) {
            throw ValidationException::withMessages([
                'confirmation' => 'Type the project slug exactly to confirm deletion.',
            ]);
        }

        DB::transaction(function () use ($project) {
            $project->admins()->detach();
            $project->delete();
        });

        return redirect()->route('settings.projects.index')->with('success', "Project '{$project->name}' and all its data have been deleted.");
    }

    /**
     * @return array<int, array{id: int, name: string, email: string}>
     */
    private function adminOptions(): array
    {
        return User::query()
            ->where('role', User::ROLE_ADMIN)
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])
            ->all();
    }
}
