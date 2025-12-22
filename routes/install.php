<?php

use App\Http\Controllers\InstallController;
use App\Http\Middleware\EnsureNotInstalled;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Installation Routes
|--------------------------------------------------------------------------
|
| These routes handle the visual installation wizard. They are protected
| by the EnsureNotInstalled middleware which blocks access once the
| application has been installed (APP_INSTALLED=true in .env).
|
*/

Route::middleware([EnsureNotInstalled::class])
    ->prefix('install')
    ->name('install.')
    ->group(function () {
        // Step 1: Welcome & Requirements
        Route::get('/', [InstallController::class, 'welcome'])->name('welcome');

        // Step 2: Database
        Route::get('/database', [InstallController::class, 'database'])->name('database');
        Route::post('/database', [InstallController::class, 'storeDatabase'])->name('database.store');
        Route::post('/database/test', [InstallController::class, 'testConnection'])->name('database.test');
        Route::get('/database/run', [InstallController::class, 'runDatabase'])->name('database.run');
        Route::get('/database/stream', [InstallController::class, 'streamDatabaseSetup'])->name('database.stream');

        // Step 3: Admin & Organization
        Route::get('/admin', [InstallController::class, 'admin'])->name('admin');
        Route::post('/admin', [InstallController::class, 'storeAdmin'])->name('admin.store');

        // Step 4: Complete
        Route::get('/complete', [InstallController::class, 'complete'])->name('complete');
    });
