<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AdminsController extends Controller
{
    public function index(): Response
    {
        $admins = User::query()
            ->whereIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_ADMIN])
            ->orderBy('name')
            ->withCount('projects')
            ->get(['id', 'name', 'email', 'role', 'last_login_at', 'created_at'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'projects_count' => $user->projects_count,
                'last_login_at' => $user->last_login_at?->toISOString(),
                'created_at' => $user->created_at?->toISOString(),
            ]);

        return Inertia::render('settings/admins/index', [
            'admins' => $admins,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('settings/admins/create', [
            'projects' => $this->projectOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'project_ids' => ['array'],
            'project_ids.*' => ['uuid', 'exists:projects,id'],
        ]);

        $admin = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => User::ROLE_ADMIN,
            'organization_id' => Organization::query()->orderBy('created_at')->value('id'),
        ]);

        $admin->projects()->sync($validated['project_ids'] ?? []);

        return redirect()->route('settings.admins.index')->with('success', 'Admin created.');
    }

    public function edit(User $admin): Response
    {
        abort_if($admin->isSuperAdmin(), 403, 'Super admin cannot be edited here.');

        return Inertia::render('settings/admins/edit', [
            'admin' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'project_ids' => $admin->projects()->pluck('projects.id')->all(),
            ],
            'projects' => $this->projectOptions(),
        ]);
    }

    public function update(Request $request, User $admin): RedirectResponse
    {
        abort_if($admin->isSuperAdmin(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($admin->id)],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'project_ids' => ['array'],
            'project_ids.*' => ['uuid', 'exists:projects,id'],
        ]);

        $admin->name = $validated['name'];
        $admin->email = $validated['email'];

        if (! empty($validated['password'])) {
            $admin->password = Hash::make($validated['password']);
        }

        $admin->save();

        $admin->projects()->sync($validated['project_ids'] ?? []);

        return redirect()->route('settings.admins.index')->with('success', 'Admin updated.');
    }

    public function destroy(User $admin): RedirectResponse
    {
        abort_if($admin->isSuperAdmin(), 403, 'Super admin cannot be deleted.');

        $admin->projects()->detach();
        $admin->delete();

        return redirect()->route('settings.admins.index')->with('success', 'Admin removed.');
    }

    /**
     * @return array<int, array{id: string, name: string, slug: string}>
     */
    private function projectOptions(): array
    {
        return Project::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug'])
            ->map(fn (Project $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
            ])
            ->all();
    }
}
