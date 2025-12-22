<?php

use App\Http\Controllers\LandingController;
use App\Http\Controllers\Portal\PortalAuthController;
use App\Http\Controllers\Portal\PortalDashboardController;
use App\Http\Controllers\Portal\PortalProfileController;
use App\Http\Controllers\Portal\PortalTicketController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Portal Routes
|--------------------------------------------------------------------------
|
| These routes are for the customer-facing portal where contacts can
| login, view their tickets, create new tickets, and manage their profile.
| All routes are prefixed with the organization slug for multi-tenancy.
|
*/

// Landing page (public, org-branded)
Route::get('{organization}', [LandingController::class, 'show'])->name('landing');

// Public portal routes (no auth required)
Route::prefix('{organization}/portal')->name('portal.')->group(function () {
    Route::get('login', [PortalAuthController::class, 'showLogin'])->name('login');
    Route::post('login', [PortalAuthController::class, 'sendMagicLink'])
        ->middleware('throttle:portal-magic-link')
        ->name('login.send');
    Route::get('auth/{token}', [PortalAuthController::class, 'authenticate'])->name('auth');
});

// Protected portal routes (contact auth required)
Route::prefix('{organization}/portal')->name('portal.')->middleware('contact.auth')->group(function () {
    Route::post('logout', [PortalAuthController::class, 'logout'])->name('logout');

    // Dashboard
    Route::get('/', [PortalDashboardController::class, 'index'])->name('dashboard');

    // Tickets
    Route::get('tickets/create', [PortalTicketController::class, 'create'])->name('tickets.create');
    Route::post('tickets', [PortalTicketController::class, 'store'])
        ->middleware('throttle:portal-tickets')
        ->name('tickets.store');
    Route::get('tickets/{ticket}', [PortalTicketController::class, 'show'])->name('tickets.show');
    Route::post('tickets/{ticket}/reply', [PortalTicketController::class, 'reply'])
        ->middleware('throttle:portal-tickets')
        ->name('tickets.reply');

    // Profile
    Route::get('profile', [PortalProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('profile', [PortalProfileController::class, 'update'])->name('profile.update');
});
