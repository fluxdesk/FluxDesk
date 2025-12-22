<?php

use App\Enums\TicketChannel;
use App\Models\Contact;
use App\Models\Organization;
use App\Models\Priority;
use App\Models\Sla;
use App\Models\SlaAverageReplyTime;
use App\Models\SlaReminderSent;
use App\Models\Status;
use App\Models\Ticket;
use App\Models\User;
use App\Models\UserNotificationPreference;
use App\Notifications\Tickets\SlaBreachWarningNotification;
use App\Services\NotificationService;
use App\Services\OrganizationContext;
use App\Services\SlaAverageReplyTimeService;
use App\Services\SlaBreachReminderService;
use Illuminate\Support\Facades\Notification;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

describe('Contact SLA Assignment', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        app(OrganizationContext::class)->set($this->organization);
    });

    it('can assign SLA to a contact', function () {
        $sla = Sla::factory()->create(['organization_id' => $this->organization->id]);
        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'sla_id' => $sla->id,
        ]);

        expect($contact->sla_id)->toBe($sla->id);
        expect($contact->sla->id)->toBe($sla->id);
    });

    it('returns contact SLA from getEffectiveSla when set', function () {
        $defaultSla = Sla::where('is_default', true)->first();
        $customSla = Sla::factory()->create([
            'organization_id' => $this->organization->id,
            'is_default' => false,
            'first_response_hours' => 4,
        ]);

        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'sla_id' => $customSla->id,
        ]);

        $effectiveSla = $contact->getEffectiveSla();

        expect($effectiveSla->id)->toBe($customSla->id);
        expect($effectiveSla->first_response_hours)->toBe(4);
    });

    it('returns organization default SLA when contact has no SLA set', function () {
        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'sla_id' => null,
        ]);

        $effectiveSla = $contact->getEffectiveSla();

        expect($effectiveSla->is_default)->toBeTrue();
    });

    it('ticket inherits SLA from contact', function () {
        $customSla = Sla::factory()->create([
            'organization_id' => $this->organization->id,
            'is_default' => false,
            'first_response_hours' => 2,
        ]);

        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'sla_id' => $customSla->id,
        ]);

        $ticket = Ticket::create([
            'organization_id' => $this->organization->id,
            'subject' => 'Test Ticket',
            'contact_id' => $contact->id,
            'channel' => TicketChannel::Web,
        ]);

        expect($ticket->sla_id)->toBe($customSla->id);
        expect($ticket->sla->first_response_hours)->toBe(2);
    });

    it('ticket uses organization default when contact has no SLA', function () {
        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'sla_id' => null,
        ]);

        $ticket = Ticket::create([
            'organization_id' => $this->organization->id,
            'subject' => 'Test Ticket',
            'contact_id' => $contact->id,
            'channel' => TicketChannel::Web,
        ]);

        expect($ticket->sla->is_default)->toBeTrue();
    });
});

describe('SLA Settings', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        $this->user = User::factory()->create();
        $this->organization->users()->attach($this->user, ['role' => 'admin', 'is_default' => true]);
        app(OrganizationContext::class)->set($this->organization);
        $this->actingAs($this->user);
    });

    it('can update SLA sharing settings', function () {
        $response = $this->patch('/organization/sla-settings', [
            'share_sla_times_with_contacts' => true,
            'share_average_reply_time' => true,
            'sla_reminder_intervals' => [120, 60, 30],
        ]);

        $response->assertRedirect();

        $this->organization->refresh();
        $settings = $this->organization->settings;

        expect($settings->share_sla_times_with_contacts)->toBeTrue();
        expect($settings->share_average_reply_time)->toBeTrue();
        expect($settings->sla_reminder_intervals)->toBe([120, 60, 30]);
    });

    it('validates sla reminder intervals are positive integers', function () {
        $response = $this->patch('/organization/sla-settings', [
            'share_sla_times_with_contacts' => true,
            'share_average_reply_time' => false,
            'sla_reminder_intervals' => [-10, 0, 'invalid'],
        ]);

        $response->assertSessionHasErrors('sla_reminder_intervals.0');
        $response->assertSessionHasErrors('sla_reminder_intervals.1');
    });

    it('returns sorted reminder intervals descending', function () {
        $this->organization->settings->update([
            'sla_reminder_intervals' => [30, 120, 60],
        ]);

        $sorted = $this->organization->settings->getSortedSlaReminderIntervals();

        expect($sorted)->toBe([120, 60, 30]);
    });
});

describe('SLA Breach Reminders', function () {
    beforeEach(function () {
        Notification::fake();
        $this->organization = Organization::factory()->create();
        $this->organization->settings->update([
            'sla_reminder_intervals' => [60, 30, 15],
        ]);
        app(OrganizationContext::class)->set($this->organization);
    });

    it('sends reminder when ticket approaches first response deadline', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $assignee = User::factory()->create();
        $this->organization->users()->attach($assignee, ['role' => 'agent', 'is_default' => true]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'assigned_to' => $assignee->id,
            'sla_first_response_due_at' => now()->addMinutes(50),
            'first_response_at' => null,
        ]);

        // Use NotificationService directly to test the notification logic
        $service = app(NotificationService::class);
        $service->notifySlaBreachWarning($ticket, 'first_response', 50);

        Notification::assertSentTo($assignee, SlaBreachWarningNotification::class);
    });

    it('does not send duplicate reminders', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $assignee = User::factory()->create();
        $this->organization->users()->attach($assignee, ['role' => 'agent', 'is_default' => true]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'assigned_to' => $assignee->id,
            'sla_first_response_due_at' => now()->addMinutes(50),
            'first_response_at' => null,
        ]);

        // Mark as already sent
        SlaReminderSent::create([
            'ticket_id' => $ticket->id,
            'type' => 'first_response',
            'minutes_before' => 60,
            'sent_at' => now(),
        ]);

        $service = app(SlaBreachReminderService::class);
        $service->checkAndSendReminders();

        Notification::assertNotSentTo($assignee, SlaBreachWarningNotification::class);
    });

    it('skips tickets that already have first response', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $assignee = User::factory()->create();
        $this->organization->users()->attach($assignee, ['role' => 'agent', 'is_default' => true]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'assigned_to' => $assignee->id,
            'sla_first_response_due_at' => now()->addMinutes(50),
            'first_response_at' => now()->subHour(), // Already responded
        ]);

        $service = app(SlaBreachReminderService::class);
        $service->checkAndSendReminders();

        Notification::assertNotSentTo($assignee, SlaBreachWarningNotification::class);
    });

    it('respects user notification preferences', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $assignee = User::factory()->create();
        $this->organization->users()->attach($assignee, ['role' => 'agent', 'is_default' => true]);

        // Disable SLA notifications for this user
        UserNotificationPreference::create([
            'user_id' => $assignee->id,
            'organization_id' => $this->organization->id,
            'notify_sla_breach_warning' => false,
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'assigned_to' => $assignee->id,
            'sla_first_response_due_at' => now()->addMinutes(50),
            'first_response_at' => null,
        ]);

        $service = app(NotificationService::class);
        $service->notifySlaBreachWarning($ticket, 'first_response', 50);

        Notification::assertNotSentTo($assignee, SlaBreachWarningNotification::class);
    });

    it('notifies all org members when ticket is unassigned', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $member1 = User::factory()->create();
        $member2 = User::factory()->create();
        $this->organization->users()->attach($member1, ['role' => 'agent', 'is_default' => true]);
        $this->organization->users()->attach($member2, ['role' => 'agent', 'is_default' => false]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'assigned_to' => null, // Unassigned
            'sla_first_response_due_at' => now()->addMinutes(50),
            'first_response_at' => null,
        ]);

        $service = app(NotificationService::class);
        $service->notifySlaBreachWarning($ticket, 'first_response', 50);

        Notification::assertSentTo($member1, SlaBreachWarningNotification::class);
        Notification::assertSentTo($member2, SlaBreachWarningNotification::class);
    });
});

describe('SLA Average Reply Time', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        app(OrganizationContext::class)->set($this->organization);
    });

    it('calculates average reply time for tickets', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $priority = Priority::where('is_default', true)->first();
        $closedStatus = Status::where('is_closed', true)->first();

        // Calculate the date range the service expects (last week)
        $lastWeekStart = now()->startOfWeek()->subWeek();
        $lastWeekMid = $lastWeekStart->copy()->addDays(2);

        // Create tickets with known first response times in last week
        // Ticket 1: 30 minutes
        Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'priority_id' => $priority->id,
            'status_id' => $closedStatus->id,
            'created_at' => $lastWeekMid,
            'first_response_at' => $lastWeekMid->copy()->addMinutes(30),
            'resolved_at' => $lastWeekMid->copy()->addHours(1),
        ]);

        // Ticket 2: 60 minutes
        Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'priority_id' => $priority->id,
            'status_id' => $closedStatus->id,
            'created_at' => $lastWeekMid->copy()->addDays(1),
            'first_response_at' => $lastWeekMid->copy()->addDays(1)->addMinutes(60),
            'resolved_at' => $lastWeekMid->copy()->addDays(1)->addHours(2),
        ]);

        $service = app(SlaAverageReplyTimeService::class);
        $service->calculateWeeklyAverages($this->organization);

        $average = SlaAverageReplyTime::where('organization_id', $this->organization->id)
            ->where('priority_id', $priority->id)
            ->first();

        expect($average)->not->toBeNull();
        expect($average->average_minutes)->toBe(45); // (30 + 60) / 2
        expect($average->ticket_count)->toBe(2);
    });

    it('returns formatted average time', function () {
        $priority = Priority::where('is_default', true)->first();

        SlaAverageReplyTime::create([
            'organization_id' => $this->organization->id,
            'priority_id' => $priority->id,
            'average_minutes' => 90,
            'ticket_count' => 10,
            'week_start' => now()->startOfWeek(),
        ]);

        $service = app(SlaAverageReplyTimeService::class);
        $formatted = $service->getFormattedAverage($this->organization, $priority);

        expect($formatted)->toBe('1 uur en 30 minuten');
    });

    it('returns null when no data available', function () {
        $priority = Priority::where('is_default', true)->first();

        $service = app(SlaAverageReplyTimeService::class);
        $formatted = $service->getFormattedAverage($this->organization, $priority);

        expect($formatted)->toBeNull();
    });

    it('falls back to previous week when current week has no data', function () {
        $priority = Priority::where('is_default', true)->first();

        // Create average for last week
        SlaAverageReplyTime::create([
            'organization_id' => $this->organization->id,
            'priority_id' => $priority->id,
            'average_minutes' => 45,
            'ticket_count' => 5,
            'week_start' => now()->subWeek()->startOfWeek(),
        ]);

        $service = app(SlaAverageReplyTimeService::class);
        $average = $service->getAverageForPriority($this->organization, $priority);

        expect($average)->toBe(45);
    });
});

describe('Contact SLA via Controller', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        $this->user = User::factory()->create();
        $this->organization->users()->attach($this->user, ['role' => 'admin', 'is_default' => true]);
        app(OrganizationContext::class)->set($this->organization);
        $this->actingAs($this->user);
    });

    it('can create contact with SLA', function () {
        $sla = Sla::factory()->create(['organization_id' => $this->organization->id]);

        $response = $this->post('/contacts', [
            'name' => 'Test Contact',
            'email' => 'test@example.com',
            'sla_id' => $sla->id,
        ]);

        $response->assertRedirect();

        $contact = Contact::where('email', 'test@example.com')->first();
        expect($contact->sla_id)->toBe($sla->id);
    });

    it('can update contact SLA', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $sla = Sla::factory()->create(['organization_id' => $this->organization->id]);

        $response = $this->patch("/contacts/{$contact->id}", [
            'name' => $contact->name,
            'email' => $contact->email,
            'sla_id' => $sla->id,
        ]);

        $response->assertRedirect();

        $contact->refresh();
        expect($contact->sla_id)->toBe($sla->id);
    });

    it('can clear contact SLA', function () {
        $sla = Sla::factory()->create(['organization_id' => $this->organization->id]);
        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'sla_id' => $sla->id,
        ]);

        $response = $this->patch("/contacts/{$contact->id}", [
            'name' => $contact->name,
            'email' => $contact->email,
            'sla_id' => null,
        ]);

        $response->assertRedirect();

        $contact->refresh();
        expect($contact->sla_id)->toBeNull();
    });
});

describe('Notification Preferences for SLA', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        $this->user = User::factory()->create();
        $this->organization->users()->attach($this->user, ['role' => 'admin', 'is_default' => true]);
        app(OrganizationContext::class)->set($this->organization);
        $this->actingAs($this->user);
    });

    it('can update SLA breach warning preference', function () {
        $response = $this->patch('/settings/notifications', [
            'notify_new_ticket' => true,
            'notify_contact_reply' => true,
            'notify_internal_note' => true,
            'notify_ticket_assigned' => true,
            'notify_when_mentioned' => true,
            'notify_sla_breach_warning' => false,
        ]);

        $response->assertRedirect();

        $preferences = $this->user->notificationPreferencesFor($this->organization->id);
        expect($preferences->notify_sla_breach_warning)->toBeFalse();
    });
});
