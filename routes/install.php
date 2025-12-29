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
        Route::post('/database/use-existing', [InstallController::class, 'useExistingDatabase'])->name('database.use-existing');
        Route::get('/database/run', [InstallController::class, 'runDatabase'])->name('database.run');
        Route::get('/database/stream', [InstallController::class, 'streamDatabaseSetup'])->name('database.stream');

        // Step 3: Mail Configuration
        Route::get('/mail', [InstallController::class, 'mail'])->name('mail');
        Route::post('/mail', [InstallController::class, 'storeMail'])->name('mail.store');
        Route::post('/mail/test', [InstallController::class, 'testMail'])->name('mail.test');

        // Step 4: Cache & Services Configuration
        Route::get('/cache', [InstallController::class, 'cache'])->name('cache');
        Route::post('/cache', [InstallController::class, 'storeCache'])->name('cache.store');
        Route::post('/cache/test-redis', [InstallController::class, 'testRedis'])->name('cache.test-redis');

        // Step 5: Admin & Organization
        Route::get('/admin', [InstallController::class, 'admin'])->name('admin');
        Route::post('/admin', [InstallController::class, 'storeAdmin'])->name('admin.store');

        // Step 6: Complete
        Route::get('/complete', [InstallController::class, 'complete'])->name('complete');
    });
