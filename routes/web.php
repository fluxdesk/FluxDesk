<?php

use App\Http\Controllers\ContactController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\InvitationAcceptController;
use App\Http\Controllers\MagicLinkController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\Organization\DepartmentController;
use App\Http\Controllers\Organization\EmailChannelController;
use App\Http\Controllers\Organization\EmailChannelOAuthController;
use App\Http\Controllers\Organization\InvitationController;
use App\Http\Controllers\Organization\MemberController;
use App\Http\Controllers\Organization\PriorityController;
use App\Http\Controllers\Organization\SettingsController;
use App\Http\Controllers\Organization\SlaController;
use App\Http\Controllers\Organization\StatusController;
use App\Http\Controllers\Organization\TagController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\PersonalTagController;
use App\Http\Controllers\Tickets\MessageController;
use App\Http\Controllers\Tickets\TicketController;
use App\Http\Controllers\UpgradeController;
use Illuminate\Support\Facades\Route;

// Home route - redirects to login (used after logout)
Route::redirect('/', '/login')->name('home');

// Onboarding routes (for users without organizations)
Route::middleware(['auth', 'verified'])->prefix('onboarding')->name('onboarding.')->group(function () {
    Route::get('organization', [OnboardingController::class, 'showOrganization'])->name('organization');
    Route::post('organization', [OnboardingController::class, 'storeOrganization'])->name('organization.store');
});

Route::middleware(['auth', 'verified', 'org.required'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Organization switching and creation
    Route::post('organizations', [OrganizationController::class, 'store'])->name('organizations.store');
    Route::post('organizations/{organization}/switch', [OrganizationController::class, 'switch'])->name('organizations.switch');

    // Inbox routes
    Route::middleware(['org.member'])->group(function () {
        Route::get('inbox', [TicketController::class, 'index'])->name('inbox.index');
        Route::get('inbox/{ticket}', [TicketController::class, 'show'])->name('inbox.show');
        Route::post('inbox', [TicketController::class, 'store'])->name('inbox.store');
        Route::patch('inbox/{ticket}', [TicketController::class, 'update'])->name('inbox.update');
        Route::delete('inbox/{ticket}', [TicketController::class, 'destroy'])->name('inbox.destroy');
        Route::post('inbox/{ticket}/mark-unread', [TicketController::class, 'markAsUnread'])->name('inbox.mark-unread');
        Route::post('inbox/{ticket}/move', [TicketController::class, 'moveToFolder'])->name('inbox.move');
        Route::post('inbox/{ticket}/tags', [TicketController::class, 'updateTags'])->name('inbox.tags');
        Route::post('inbox/{ticket}/merge', [TicketController::class, 'merge'])->name('inbox.merge');
        Route::post('inbox/{ticket}/messages', [MessageController::class, 'store'])->name('inbox.messages.store');

        // Folders routes
        Route::post('folders', [FolderController::class, 'store'])->name('folders.store');
        Route::patch('folders/{folder}', [FolderController::class, 'update'])->name('folders.update');
        Route::delete('folders/{folder}', [FolderController::class, 'destroy'])->name('folders.destroy');
        Route::post('folders/reorder', [FolderController::class, 'reorder'])->name('folders.reorder');

        // Personal tags routes
        Route::post('personal-tags', [PersonalTagController::class, 'store'])->name('personal-tags.store');
        Route::delete('personal-tags/{tag}', [PersonalTagController::class, 'destroy'])->name('personal-tags.destroy');

        // Notifications routes
        Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
        Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');

        // Contacts routes
        Route::get('contacts', [ContactController::class, 'index'])->name('contacts.index');
        Route::post('contacts', [ContactController::class, 'store'])->name('contacts.store');
        Route::patch('contacts/{contact}', [ContactController::class, 'update'])->name('contacts.update');
        Route::delete('contacts/{contact}', [ContactController::class, 'destroy'])->name('contacts.destroy');
    });

    // Organization settings routes (admin only)
    Route::middleware(['org.admin'])->prefix('organization')->name('organization.')->group(function () {
        // General settings
        Route::get('settings', [SettingsController::class, 'index'])->name('settings.index');
        Route::patch('settings', [SettingsController::class, 'update'])->name('settings.update');
        Route::post('settings/logo', [SettingsController::class, 'uploadLogo'])->name('settings.logo.upload');
        Route::delete('settings/logo', [SettingsController::class, 'deleteLogo'])->name('settings.logo.delete');
        Route::post('settings/email-logo', [SettingsController::class, 'uploadEmailLogo'])->name('settings.email-logo.upload');
        Route::delete('settings/email-logo', [SettingsController::class, 'deleteEmailLogo'])->name('settings.email-logo.delete');

        // Statuses
        Route::get('statuses', [StatusController::class, 'index'])->name('statuses.index');
        Route::post('statuses', [StatusController::class, 'store'])->name('statuses.store');
        Route::patch('statuses/{status}', [StatusController::class, 'update'])->name('statuses.update');
        Route::delete('statuses/{status}', [StatusController::class, 'destroy'])->name('statuses.destroy');
        Route::post('statuses/reorder', [StatusController::class, 'reorder'])->name('statuses.reorder');

        // Priorities
        Route::get('priorities', [PriorityController::class, 'index'])->name('priorities.index');
        Route::post('priorities', [PriorityController::class, 'store'])->name('priorities.store');
        Route::patch('priorities/{priority}', [PriorityController::class, 'update'])->name('priorities.update');
        Route::delete('priorities/{priority}', [PriorityController::class, 'destroy'])->name('priorities.destroy');
        Route::post('priorities/reorder', [PriorityController::class, 'reorder'])->name('priorities.reorder');

        // Tags
        Route::get('tags', [TagController::class, 'index'])->name('tags.index');
        Route::post('tags', [TagController::class, 'store'])->name('tags.store');
        Route::patch('tags/{tag}', [TagController::class, 'update'])->name('tags.update');
        Route::delete('tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');

        // SLAs
        Route::get('slas', [SlaController::class, 'index'])->name('slas.index');
        Route::post('slas', [SlaController::class, 'store'])->name('slas.store');
        Route::patch('slas/{sla}', [SlaController::class, 'update'])->name('slas.update');
        Route::delete('slas/{sla}', [SlaController::class, 'destroy'])->name('slas.destroy');
        Route::patch('sla-settings', [SlaController::class, 'updateSettings'])->name('sla-settings.update');

        // Departments
        Route::get('departments', [DepartmentController::class, 'index'])->name('departments.index');
        Route::post('departments', [DepartmentController::class, 'store'])->name('departments.store');
        Route::patch('departments/{department}', [DepartmentController::class, 'update'])->name('departments.update');
        Route::delete('departments/{department}', [DepartmentController::class, 'destroy'])->name('departments.destroy');
        Route::post('departments/reorder', [DepartmentController::class, 'reorder'])->name('departments.reorder');

        // Members
        Route::get('members', [MemberController::class, 'index'])->name('members.index');
        Route::post('members', [MemberController::class, 'store'])->name('members.store');
        Route::patch('members/{member}', [MemberController::class, 'update'])->name('members.update');
        Route::delete('members/{member}', [MemberController::class, 'destroy'])->name('members.destroy');

        // Invitations (admin)
        Route::post('invitations', [InvitationController::class, 'store'])->name('invitations.store');
        Route::delete('invitations/{invitation}', [InvitationController::class, 'destroy'])->name('invitations.destroy');
        Route::post('invitations/{invitation}/resend', [InvitationController::class, 'resend'])->name('invitations.resend');

        // Email Channels
        Route::get('email-channels', [EmailChannelController::class, 'index'])->name('email-channels.index');
        Route::post('email-channels', [EmailChannelController::class, 'store'])->name('email-channels.store');
        Route::patch('email-channels/system-email', [EmailChannelController::class, 'updateSystemEmail'])->name('email-channels.system-email');
        Route::patch('email-channels/system-emails-enabled', [EmailChannelController::class, 'updateSystemEmailsEnabled'])->name('email-channels.system-emails-enabled');
        Route::patch('email-channels/{emailChannel}', [EmailChannelController::class, 'update'])->name('email-channels.update');
        Route::delete('email-channels/{emailChannel}', [EmailChannelController::class, 'destroy'])->name('email-channels.destroy');
        Route::post('email-channels/{emailChannel}/test', [EmailChannelController::class, 'testConnection'])->name('email-channels.test');
        Route::post('email-channels/{emailChannel}/sync', [EmailChannelController::class, 'syncNow'])->name('email-channels.sync');
        Route::get('email-channels/{emailChannel}/configure', [EmailChannelController::class, 'configure'])->name('email-channels.configure');
        Route::patch('email-channels/{emailChannel}/configure', [EmailChannelController::class, 'updateConfiguration'])->name('email-channels.configure.update');
        Route::get('email-channels/{emailChannel}/folders', [EmailChannelController::class, 'getFolders'])->name('email-channels.folders');
        Route::get('email-channels/{emailChannel}/logs', [EmailChannelController::class, 'logs'])->name('email-channels.logs');

        // Email Channel OAuth
        Route::get('email-channels/{emailChannel}/oauth/redirect', [EmailChannelOAuthController::class, 'redirect'])->name('email-channels.oauth.redirect');
        Route::get('email-channels/oauth/callback/{provider}', [EmailChannelOAuthController::class, 'callback'])->name('email-channels.oauth.callback');
    });
});

// Upgrade routes (super admin only)
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('upgrade', [UpgradeController::class, 'index'])
        ->name('upgrade')
        ->can('viewUpgrades', App\Models\User::class);
    Route::post('upgrade/check', [UpgradeController::class, 'check'])
        ->name('upgrade.check')
        ->can('viewUpgrades', App\Models\User::class);
});

// Public invitation routes
Route::prefix('invitations')->name('invitations.')->group(function () {
    Route::get('{token}', [InvitationAcceptController::class, 'show'])->name('show');
    Route::post('{token}/accept', [InvitationAcceptController::class, 'accept'])->middleware('auth')->name('accept');
    Route::post('{token}/register', [InvitationAcceptController::class, 'register'])->name('register');
});

// Magic link routes for contact access (no auth required)
Route::get('ticket/{token}', [MagicLinkController::class, 'show'])->name('tickets.magic-link');
Route::post('ticket/{token}/reply', [MagicLinkController::class, 'reply'])->name('tickets.magic-link.reply');

require __DIR__.'/settings.php';
