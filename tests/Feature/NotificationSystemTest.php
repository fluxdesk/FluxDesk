<?php

use App\Jobs\SendMessageNotificationJob;
use App\Jobs\SendTicketNotificationJob;
use App\Models\Contact;
use App\Models\ContactAccessToken;
use App\Models\Message;
use App\Models\Organization;
use App\Models\Ticket;
use App\Models\User;
use App\Models\UserNotificationPreference;
use App\Services\MagicLinkService;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    Queue::fake();
});

describe('Magic Link System', function () {
    it('generates a magic link for a contact', function () {
        $organization = Organization::factory()->create();
        $contact = Contact::factory()->create(['organization_id' => $organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $organization->id,
            'contact_id' => $contact->id,
        ]);

        $service = app(MagicLinkService::class);
        $url = $service->getUrlForTicket($contact, $ticket);

        expect($url)->toBeString();
        expect($url)->toContain('/ticket/');

        // Verify token was created in database
        $token = ContactAccessToken::where('contact_id', $contact->id)
            ->where('ticket_id', $ticket->id)
            ->first();

        expect($token)->not->toBeNull();
        expect($token->expires_at)->toBeGreaterThan(now());
    });

    it('validates a valid token', function () {
        $organization = Organization::factory()->create();
        $contact = Contact::factory()->create(['organization_id' => $organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $organization->id,
            'contact_id' => $contact->id,
        ]);

        $service = app(MagicLinkService::class);
        $token = $service->generateForTicket($contact, $ticket);

        $result = $service->validateToken($token);

        expect($result)->not->toBeNull();
        expect($result['contact']->id)->toBe($contact->id);
        expect($result['ticket']->id)->toBe($ticket->id);
    });

    it('rejects an expired token', function () {
        $organization = Organization::factory()->create();
        $contact = Contact::factory()->create(['organization_id' => $organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $organization->id,
            'contact_id' => $contact->id,
        ]);

        // Create an expired token
        $token = ContactAccessToken::create([
            'contact_id' => $contact->id,
            'ticket_id' => $ticket->id,
            'token' => hash('sha256', 'test-token'),
            'expires_at' => now()->subDays(1),
        ]);

        $service = app(MagicLinkService::class);
        $result = $service->validateToken($token->token);

        expect($result)->toBeNull();
    });

    it('revokes old tokens when generating new one', function () {
        $organization = Organization::factory()->create();
        $contact = Contact::factory()->create(['organization_id' => $organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $organization->id,
            'contact_id' => $contact->id,
        ]);

        $service = app(MagicLinkService::class);

        // Generate first token
        $firstToken = $service->generateForTicket($contact, $ticket);

        // Generate second token
        $secondToken = $service->generateForTicket($contact, $ticket);

        // First token should be invalid now
        $result = $service->validateToken($firstToken);
        expect($result)->toBeNull();

        // Second token should be valid
        $result = $service->validateToken($secondToken);
        expect($result)->not->toBeNull();
    });
});

describe('Notification Preferences', function () {
    it('creates notification preferences for a user', function () {
        $organization = Organization::factory()->create();
        $user = User::factory()->create();

        UserNotificationPreference::create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'notify_new_ticket' => true,
            'notify_contact_reply' => false,
            'notify_internal_note' => true,
            'notify_ticket_assigned' => false,
        ]);

        $preferences = $user->notificationPreferencesFor($organization->id);

        expect($preferences)->not->toBeNull();
        expect($preferences->notify_new_ticket)->toBeTrue();
        expect($preferences->notify_contact_reply)->toBeFalse();
        expect($preferences->notify_internal_note)->toBeTrue();
        expect($preferences->notify_ticket_assigned)->toBeFalse();
    });

    it('returns null when no preferences exist', function () {
        $organization = Organization::factory()->create();
        $user = User::factory()->create();

        $preferences = $user->notificationPreferencesFor($organization->id);

        expect($preferences)->toBeNull();
    });
});

describe('Notification Jobs', function () {
    it('dispatches ticket notification job when ticket is created', function () {
        $organization = Organization::factory()->create();
        $contact = Contact::factory()->create(['organization_id' => $organization->id]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $organization->id,
            'contact_id' => $contact->id,
        ]);

        Queue::assertPushed(SendTicketNotificationJob::class, function ($job) use ($ticket) {
            return $job->ticket->id === $ticket->id;
        });
    });

    it('dispatches message notification job when message is created', function () {
        $organization = Organization::factory()->create();
        $contact = Contact::factory()->create(['organization_id' => $organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $organization->id,
            'contact_id' => $contact->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
        ]);

        Queue::assertPushed(SendMessageNotificationJob::class, function ($job) use ($message) {
            return $job->message->id === $message->id;
        });
    });
});
