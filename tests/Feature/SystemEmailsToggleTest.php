<?php

use App\Enums\UserRole;
use App\Models\Contact;
use App\Models\Organization;
use App\Models\Priority;
use App\Models\Status;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\Tickets\NewTicketNotification;
use App\Services\NotificationService;
use App\Services\OrganizationContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(function () {
    Notification::fake();
});

describe('System Emails Toggle', function () {
    it('can toggle system emails via API', function () {
        $user = User::factory()->create();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user, ['role' => UserRole::Admin->value, 'is_default' => true]);

        // Set organization context
        app(OrganizationContext::class)->set($organization);

        $this->actingAs($user);

        // Disable system emails
        $response = $this->patch(route('organization.email-channels.system-emails-enabled'), [
            'system_emails_enabled' => false,
        ]);

        $response->assertRedirect();
        expect($organization->fresh()->settings->system_emails_enabled)->toBeFalse();

        // Enable system emails
        $response = $this->patch(route('organization.email-channels.system-emails-enabled'), [
            'system_emails_enabled' => true,
        ]);

        $response->assertRedirect();
        expect($organization->fresh()->settings->system_emails_enabled)->toBeTrue();
    });

    it('blocks notifications when system emails are disabled', function () {
        $organization = Organization::factory()->create();
        $organization->settings->update(['system_emails_enabled' => false]);

        // Set organization context
        app(OrganizationContext::class)->set($organization);

        // Create default status and priority
        Status::factory()->default()->create(['organization_id' => $organization->id]);
        Priority::factory()->default()->create(['organization_id' => $organization->id]);

        $user = User::factory()->create();
        $organization->users()->attach($user, ['role' => UserRole::Agent->value, 'is_default' => true]);

        $contact = Contact::factory()->create(['organization_id' => $organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $organization->id,
            'contact_id' => $contact->id,
        ]);

        $service = app(NotificationService::class);
        $service->notifyTicketCreated($ticket);

        // No notifications should be sent
        Notification::assertNothingSent();
    });

    it('sends notifications when system emails are enabled', function () {
        $organization = Organization::factory()->create();
        $organization->settings->update(['system_emails_enabled' => true]);

        // Set organization context
        app(OrganizationContext::class)->set($organization);

        // Create default status and priority
        Status::factory()->default()->create(['organization_id' => $organization->id]);
        Priority::factory()->default()->create(['organization_id' => $organization->id]);

        $user = User::factory()->create();
        $organization->users()->attach($user, ['role' => UserRole::Agent->value, 'is_default' => true]);

        $contact = Contact::factory()->create(['organization_id' => $organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $organization->id,
            'contact_id' => $contact->id,
        ]);

        $service = app(NotificationService::class);
        $service->notifyTicketCreated($ticket);

        // Notifications should be sent to the user
        Notification::assertSentTo($user, NewTicketNotification::class);
    });

    it('defaults to enabled when not explicitly set', function () {
        $organization = Organization::factory()->create();
        // Don't set system_emails_enabled, it should default to true

        // Set organization context
        app(OrganizationContext::class)->set($organization);

        // Create default status and priority
        Status::factory()->default()->create(['organization_id' => $organization->id]);
        Priority::factory()->default()->create(['organization_id' => $organization->id]);

        $user = User::factory()->create();
        $organization->users()->attach($user, ['role' => UserRole::Agent->value, 'is_default' => true]);

        $contact = Contact::factory()->create(['organization_id' => $organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $organization->id,
            'contact_id' => $contact->id,
        ]);

        $service = app(NotificationService::class);
        $service->notifyTicketCreated($ticket);

        // Notifications should be sent by default
        Notification::assertSentTo($user, NewTicketNotification::class);
    });

    it('exposes system emails enabled status via helper method', function () {
        $organization = Organization::factory()->create();

        // Default should be true
        expect($organization->settings->areSystemEmailsEnabled())->toBeTrue();

        // Explicitly set to false
        $organization->settings->update(['system_emails_enabled' => false]);
        expect($organization->fresh()->settings->areSystemEmailsEnabled())->toBeFalse();

        // Explicitly set to true
        $organization->settings->update(['system_emails_enabled' => true]);
        expect($organization->fresh()->settings->areSystemEmailsEnabled())->toBeTrue();
    });
});

describe('Email Import Date Filter', function () {
    it('can configure import_emails_since during channel setup', function () {
        $user = User::factory()->create();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user, ['role' => UserRole::Admin->value, 'is_default' => true]);

        // Set organization context
        app(OrganizationContext::class)->set($organization);

        $channel = \App\Models\EmailChannel::factory()->create([
            'organization_id' => $organization->id,
            'oauth_token' => 'test-token',
            'fetch_folder' => null,
            'is_active' => false,
        ]);

        $this->actingAs($user);

        // Configure with "only new emails" (no old import)
        $response = $this->patch(route('organization.email-channels.configure.update', $channel), [
            'fetch_folder' => 'INBOX',
            'post_import_action' => 'nothing',
            'sync_interval_minutes' => 5,
            'import_old_emails' => false,
        ]);

        $response->assertRedirect();
        $channel->refresh();

        // Should have set import_emails_since to now (approximately)
        expect($channel->import_emails_since)->not->toBeNull();
        expect($channel->import_emails_since->diffInMinutes(now()))->toBeLessThan(1);
        expect($channel->is_active)->toBeTrue();
    });

    it('can configure import from specific date', function () {
        $user = User::factory()->create();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user, ['role' => UserRole::Admin->value, 'is_default' => true]);

        // Set organization context
        app(OrganizationContext::class)->set($organization);

        $channel = \App\Models\EmailChannel::factory()->create([
            'organization_id' => $organization->id,
            'oauth_token' => 'test-token',
            'fetch_folder' => null,
            'is_active' => false,
        ]);

        $this->actingAs($user);

        $importDate = now()->subDays(7)->toDateString();

        $response = $this->patch(route('organization.email-channels.configure.update', $channel), [
            'fetch_folder' => 'INBOX',
            'post_import_action' => 'nothing',
            'sync_interval_minutes' => 5,
            'import_old_emails' => true,
            'import_emails_since' => $importDate,
        ]);

        $response->assertRedirect();
        $channel->refresh();

        expect($channel->import_emails_since)->not->toBeNull();
        expect($channel->import_emails_since->toDateString())->toBe($importDate);
    });

    it('validates import date is not in future', function () {
        $user = User::factory()->create();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user, ['role' => UserRole::Admin->value, 'is_default' => true]);

        // Set organization context
        app(OrganizationContext::class)->set($organization);

        $channel = \App\Models\EmailChannel::factory()->create([
            'organization_id' => $organization->id,
            'oauth_token' => 'test-token',
            'fetch_folder' => null,
            'is_active' => false,
        ]);

        $this->actingAs($user);

        $futureDate = now()->addDays(7)->toDateString();

        $response = $this->patch(route('organization.email-channels.configure.update', $channel), [
            'fetch_folder' => 'INBOX',
            'post_import_action' => 'nothing',
            'sync_interval_minutes' => 5,
            'import_old_emails' => true,
            'import_emails_since' => $futureDate,
        ]);

        $response->assertSessionHasErrors('import_emails_since');
    });
});
