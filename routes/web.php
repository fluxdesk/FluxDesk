<?php

use App\Http\Controllers\AIController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CustomWidgetController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DashboardTemplateController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\InvitationAcceptController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\MagicLinkController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\Organization\AISettingsController;
use App\Http\Controllers\Organization\DepartmentController;
use App\Http\Controllers\Organization\EmailChannelController;
use App\Http\Controllers\Organization\EmailChannelOAuthController;
use App\Http\Controllers\Organization\IntegrationController;
use App\Http\Controllers\Organization\InvitationController;
use App\Http\Controllers\Organization\MemberController;
use App\Http\Controllers\Organization\MessagingChannelController;
use App\Http\Controllers\Organization\MessagingChannelOAuthController;
use App\Http\Controllers\Organization\PriorityController;
use App\Http\Controllers\Organization\SettingsController;
use App\Http\Controllers\Organization\SlaController;
use App\Http\Controllers\Organization\StatusController;
use App\Http\Controllers\Organization\TagController;
use App\Http\Controllers\Organization\WebhookController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\PersonalTagController;
use App\Http\Controllers\Tickets\AttachmentController;
use App\Http\Controllers\Tickets\CcContactController;
use App\Http\Controllers\Tickets\DraftController;
use App\Http\Controllers\Tickets\MessageController;
use App\Http\Controllers\Tickets\TicketController;
use Illuminate\Support\Facades\Route;

// Home route - shows tenant landing page (resolves to default tenant)
Route::get('/', [LandingController::class, 'show'])->name('home');

// Onboarding routes (for users without organizations)
Route::middleware(['auth', 'verified'])->prefix('onboarding')->name('onboarding.')->group(function () {
    Route::get('organization', [OnboardingController::class, 'showOrganization'])->name('organization');
    Route::post('organization', [OnboardingController::class, 'storeOrganization'])->name('organization.store');
});

Route::middleware(['auth', 'verified', 'org.required'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::patch('dashboard/layout', [DashboardController::class, 'updateLayout'])->name('dashboard.layout.update');
    Route::post('dashboard/layout/reset', [DashboardController::class, 'resetLayout'])->name('dashboard.layout.reset');

    // Custom widgets
    Route::post('custom-widgets', [CustomWidgetController::class, 'store'])->name('custom-widgets.store');
    Route::patch('custom-widgets/{customWidget}', [CustomWidgetController::class, 'update'])->name('custom-widgets.update');
    Route::delete('custom-widgets/{customWidget}', [CustomWidgetController::class, 'destroy'])->name('custom-widgets.destroy');
    Route::post('custom-widgets/preview', [CustomWidgetController::class, 'preview'])->name('custom-widgets.preview');

    // Dashboard templates
    Route::get('dashboard/templates', [DashboardTemplateController::class, 'index'])->name('dashboard.templates.index');
    Route::post('dashboard/templates', [DashboardTemplateController::class, 'store'])->name('dashboard.templates.store');
    Route::post('dashboard/templates/{template}/apply', [DashboardTemplateController::class, 'apply'])->name('dashboard.templates.apply');
    Route::delete('dashboard/templates/{template}', [DashboardTemplateController::class, 'destroy'])->name('dashboard.templates.destroy');

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

        // AI routes
        Route::post('ai/suggest/{ticket}', [AIController::class, 'suggest'])->name('ai.suggest');
        Route::post('ai/refactor', [AIController::class, 'refactor'])->name('ai.refactor');
        Route::get('ai/status', [AIController::class, 'status'])->name('ai.status');

        // Attachment routes
        Route::post('inbox/{ticket}/attachments', [AttachmentController::class, 'upload'])->name('inbox.attachments.upload');
        Route::delete('inbox/{ticket}/attachments', [AttachmentController::class, 'deleteTemp'])->name('inbox.attachments.delete-temp');
        Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download'])->name('attachments.download');

        // Draft routes
        Route::get('inbox/{ticket}/draft', [DraftController::class, 'show'])->name('inbox.draft.show');
        Route::post('inbox/{ticket}/draft', [DraftController::class, 'store'])->name('inbox.draft.store');
        Route::delete('inbox/{ticket}/draft', [DraftController::class, 'destroy'])->name('inbox.draft.destroy');

        // CC contacts routes
        Route::post('inbox/{ticket}/cc', [CcContactController::class, 'store'])->name('inbox.cc.store');
        Route::delete('inbox/{ticket}/cc/{ccContact}', [CcContactController::class, 'destroy'])->name('inbox.cc.destroy');

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

        // Companies routes
        Route::get('companies', [CompanyController::class, 'index'])->name('companies.index');
        Route::post('companies', [CompanyController::class, 'store'])->name('companies.store');
        Route::get('companies/{company}', [CompanyController::class, 'show'])->name('companies.show');
        Route::patch('companies/{company}', [CompanyController::class, 'update'])->name('companies.update');
        Route::delete('companies/{company}', [CompanyController::class, 'destroy'])->name('companies.destroy');
        Route::get('companies/{company}/tickets', [CompanyController::class, 'tickets'])->name('companies.tickets');
        Route::post('companies/{company}/contacts/{contact}', [CompanyController::class, 'linkContact'])->name('companies.link-contact');
        Route::delete('companies/{company}/contacts/{contact}', [CompanyController::class, 'unlinkContact'])->name('companies.unlink-contact');
    });

    // Organization settings routes (admin only)
    Route::middleware(['org.admin'])->prefix('organization')->name('organization.')->group(function () {
        // General settings
        Route::get('settings', [SettingsController::class, 'index'])->name('settings.index');
        Route::patch('settings', [SettingsController::class, 'update'])->name('settings.update');

        // Branding
        Route::get('branding', [SettingsController::class, 'branding'])->name('branding.index');
        Route::patch('branding', [SettingsController::class, 'updateBranding'])->name('branding.update');
        Route::post('branding/logo', [SettingsController::class, 'uploadLogo'])->name('branding.logo.upload');
        Route::delete('branding/logo', [SettingsController::class, 'deleteLogo'])->name('branding.logo.delete');
        Route::post('branding/email-logo', [SettingsController::class, 'uploadEmailLogo'])->name('branding.email-logo.upload');
        Route::delete('branding/email-logo', [SettingsController::class, 'deleteEmailLogo'])->name('branding.email-logo.delete');

        // Ticket Numbers
        Route::get('ticket-numbers', [SettingsController::class, 'ticketNumbers'])->name('ticket-numbers.index');
        Route::patch('ticket-numbers', [SettingsController::class, 'updateTicketNumbers'])->name('ticket-numbers.update');

        // Portal
        Route::get('portal', [SettingsController::class, 'portal'])->name('portal.index');
        Route::patch('portal', [SettingsController::class, 'updatePortal'])->name('portal.update');
        Route::post('portal/verify-dns', [SettingsController::class, 'verifyDns'])->name('portal.verify-dns');

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

        // Messaging Channels
        Route::get('messaging-channels', [MessagingChannelController::class, 'index'])->name('messaging-channels.index');
        Route::post('messaging-channels', [MessagingChannelController::class, 'store'])->name('messaging-channels.store');
        Route::patch('messaging-channels/{messagingChannel}', [MessagingChannelController::class, 'update'])->name('messaging-channels.update');
        Route::delete('messaging-channels/{messagingChannel}', [MessagingChannelController::class, 'destroy'])->name('messaging-channels.destroy');
        Route::post('messaging-channels/{messagingChannel}/test', [MessagingChannelController::class, 'testConnection'])->name('messaging-channels.test');
        Route::get('messaging-channels/{messagingChannel}/logs', [MessagingChannelController::class, 'logs'])->name('messaging-channels.logs');
        Route::patch('messaging-channels/{messagingChannel}/auto-reply', [MessagingChannelController::class, 'updateAutoReply'])->name('messaging-channels.auto-reply');
        Route::get('messaging-channels/{messagingChannel}/configure', [MessagingChannelController::class, 'configure'])->name('messaging-channels.configure');
        Route::patch('messaging-channels/{messagingChannel}/configure', [MessagingChannelController::class, 'updateConfiguration'])->name('messaging-channels.configure.update');
        Route::post('messaging-channels/preview-auto-reply', [MessagingChannelController::class, 'previewAutoReply'])->name('messaging-channels.preview-auto-reply');

        // Messaging Channel OAuth
        Route::get('messaging-channels/{messagingChannel}/oauth/redirect', [MessagingChannelOAuthController::class, 'redirect'])->name('messaging-channels.oauth.redirect');
        Route::get('messaging-channels/oauth/callback/{provider}', [MessagingChannelOAuthController::class, 'callback'])->name('messaging-channels.oauth.callback');

        // Integrations
        Route::get('integrations', [IntegrationController::class, 'index'])->name('integrations.index');
        Route::post('integrations', [IntegrationController::class, 'store'])->name('integrations.store');
        Route::post('integrations/{integration}/test', [IntegrationController::class, 'test'])->name('integrations.test');
        Route::post('integrations/{integration}/toggle', [IntegrationController::class, 'toggle'])->name('integrations.toggle');
        Route::delete('integrations/{integration}', [IntegrationController::class, 'destroy'])->name('integrations.destroy');

        // AI Settings
        Route::get('ai-settings', [AISettingsController::class, 'index'])->name('ai-settings.index');
        Route::patch('ai-settings', [AISettingsController::class, 'update'])->name('ai-settings.update');
        Route::get('ai-settings/models/{provider}', [AISettingsController::class, 'models'])->name('ai-settings.models');

        // Webhooks
        Route::get('webhooks', [WebhookController::class, 'index'])->name('webhooks.index');
        Route::post('webhooks', [WebhookController::class, 'store'])->name('webhooks.store');
        Route::patch('webhooks/{webhook}', [WebhookController::class, 'update'])->name('webhooks.update');
        Route::delete('webhooks/{webhook}', [WebhookController::class, 'destroy'])->name('webhooks.destroy');
        Route::post('webhooks/{webhook}/toggle', [WebhookController::class, 'toggle'])->name('webhooks.toggle');
        Route::post('webhooks/{webhook}/regenerate-secret', [WebhookController::class, 'regenerateSecret'])->name('webhooks.regenerate-secret');
        Route::get('webhooks/{webhook}/secret', [WebhookController::class, 'getSecret'])->name('webhooks.secret');
        Route::post('webhooks/{webhook}/test', [WebhookController::class, 'test'])->name('webhooks.test');
        Route::get('webhooks/{webhook}/deliveries', [WebhookController::class, 'deliveries'])->name('webhooks.deliveries');
    });
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

// Signed URL routes for attachment serving (signature validation happens in controller)
Route::get('attachments/{attachment}/serve', [AttachmentController::class, 'serve'])->name('attachments.serve');
Route::get('attachments/temp-preview', [AttachmentController::class, 'tempPreview'])->name('attachments.temp-preview');

require __DIR__.'/settings.php';
