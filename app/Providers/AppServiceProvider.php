<?php

namespace App\Providers;

use App\Models\Project;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureDefaults();
        $this->registerGates();
        $this->registerRouteBindings();
    }

    protected function registerRouteBindings(): void
    {
        Route::model('admin', User::class);
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    protected function registerGates(): void
    {
        Gate::before(fn (User $user) => $user->isSuperAdmin() ? true : null);

        Gate::define('manage-admins', fn (User $user) => $user->isSuperAdmin());

        Gate::define('manage-projects', fn (User $user) => $user->isSuperAdmin());

        Gate::define('view-project', fn (User $user, Project $project) => $user->isSuperAdmin()
            || $project->admins()->whereKey($user->getKey())->exists());
    }
}
