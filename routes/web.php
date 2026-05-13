<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Project\ExceptionsController;
use App\Http\Controllers\Project\IssuesController;
use App\Http\Controllers\Project\PlaceholderController;
use App\Http\Controllers\Project\RequestsController;
use Illuminate\Support\Facades\Route;

Route::get('/', [DashboardController::class, 'home'])->name('home');

Route::scopeBindings()
    ->prefix('projects/{project:slug}')
    ->name('projects.')
    ->group(function () {
        Route::redirect('/', '/projects/{project:slug}/dashboard');
        Route::get('/dashboard', [DashboardController::class, 'show'])->name('dashboard');
        Route::get('/requests', [RequestsController::class, 'index'])->name('requests.index');
        Route::get('/exceptions', [ExceptionsController::class, 'index'])->name('exceptions.index');
        Route::get('/issues', [IssuesController::class, 'index'])->name('issues.index');
        Route::get('/issues/{issue}', [IssuesController::class, 'show'])
            ->whereNumber('issue')
            ->name('issues.show');
        Route::patch('/issues/{issue}', [IssuesController::class, 'update'])
            ->whereNumber('issue')
            ->name('issues.update');
        Route::get('/{section}', PlaceholderController::class)
            ->where('section', 'jobs|commands|events|queries|notifications|logs|cache|gates|views|models|emails|mail|http-client|dumps|schedule|redis')
            ->name('placeholder');
    });
