<?php

use App\Enums\MessageType;
use App\Enums\MessagingProvider;
use App\Enums\MessagingStatus;
use App\Enums\TicketChannel;
use App\Enums\UserRole;
use App\Jobs\ProcessMessagingWebhookJob;
use App\Jobs\SendMessagingAutoReplyJob;
use App\Jobs\SendMessagingReplyJob;
use App\Models\Contact;
use App\Models\Department;
use App\Models\Message;
use App\Models\MessagingChannel;
use App\Models\MessagingChannelLog;
use App\Models\Organization;
use App\Models\Priority;
use App\Models\Status;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Messaging\AutoReplyVariableService;
use App\Services\MessagingParser;
use App\Services\OrganizationContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->adminUser = User::factory()->create();
    $this->organization->users()->attach($this->adminUser->id, [
        'role' => UserRole::Admin->value,
        'is_default' => true,
    ]);

    // Create default status and priority
    Status::factory()->default()->create(['organization_id' => $this->organization->id]);
    Priority::factory()->default()->create(['organization_id' => $this->organization->id]);

    // Set organization context
    app(OrganizationContext::class)->set($this->organization);
});

describe('MessagingChannel Model', function () {
    it('can create a messaging channel', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Instagram Support',
            'provider' => MessagingProvider::Instagram,
        ]);

        expect($channel->name)->toBe('Instagram Support');
        expect($channel->provider)->toBe(MessagingProvider::Instagram);
        expect($channel->organization_id)->toBe($this->organization->id);
    });

    it('detects expired OAuth tokens', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'token_expires_at' => now()->subHour(),
        ]);

        expect($channel->isTokenExpired())->toBeTrue();
    });

    it('detects valid OAuth tokens', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'access_token' => 'valid-token',
            'token_expires_at' => now()->addDay(),
        ]);

        expect($channel->isTokenExpired())->toBeFalse();
    });

    it('marks channel as synced', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'last_sync_at' => null,
            'last_sync_error' => 'Previous error',
        ]);

        $channel->markSynced();

        expect($channel->fresh()->last_sync_at)->not->toBeNull();
        expect($channel->fresh()->last_sync_error)->toBeNull();
    });

    it('determines auto-reply eligibility', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'auto_reply_enabled' => true,
            'auto_reply_message' => 'Thank you for contacting us!',
        ]);

        expect($channel->shouldSendAutoReply())->toBeTrue();
    });

    it('returns false for auto-reply when disabled', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'auto_reply_enabled' => false,
            'auto_reply_message' => 'Thank you for contacting us!',
        ]);

        expect($channel->shouldSendAutoReply())->toBeFalse();
    });
});

describe('MessagingProvider Enum', function () {
    it('returns correct labels', function () {
        expect(MessagingProvider::Instagram->label())->toBe('Instagram DM');
        expect(MessagingProvider::FacebookMessenger->label())->toBe('Facebook Messenger');
        expect(MessagingProvider::WhatsApp->label())->toBe('WhatsApp');
    });

    it('returns correct integration identifier', function () {
        expect(MessagingProvider::Instagram->integrationIdentifier())->toBe('meta');
        expect(MessagingProvider::FacebookMessenger->integrationIdentifier())->toBe('meta');
        expect(MessagingProvider::WhatsApp->integrationIdentifier())->toBe('whatsapp');
    });

    it('identifies OAuth providers', function () {
        expect(MessagingProvider::Instagram->requiresOAuth())->toBeTrue();
        expect(MessagingProvider::Livechat->requiresOAuth())->toBeFalse();
    });

    it('converts to ticket channel', function () {
        expect(MessagingProvider::Instagram->toTicketChannel())->toBe(TicketChannel::Instagram);
        expect(MessagingProvider::FacebookMessenger->toTicketChannel())->toBe(TicketChannel::FacebookMessenger);
    });
});

describe('TicketChannel Enum', function () {
    it('identifies messaging channels', function () {
        expect(TicketChannel::Instagram->isMessagingChannel())->toBeTrue();
        expect(TicketChannel::FacebookMessenger->isMessagingChannel())->toBeTrue();
        expect(TicketChannel::Email->isMessagingChannel())->toBeFalse();
    });

    it('converts to messaging provider', function () {
        expect(TicketChannel::Instagram->toMessagingProvider())->toBe(MessagingProvider::Instagram);
        expect(TicketChannel::Email->toMessagingProvider())->toBeNull();
    });
});

describe('MessagingChannelLog Model', function () {
    it('logs webhook events', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $log = MessagingChannelLog::logWebhook(
            messagingChannelId: $channel->id,
            status: 'success',
            messagesReceived: 5,
        );

        expect($log->type)->toBe('webhook');
        expect($log->status)->toBe('success');
        expect($log->messages_received)->toBe(5);
    });

    it('logs send events', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
        ]);

        $log = MessagingChannelLog::logSend(
            messagingChannelId: $channel->id,
            status: 'success',
            ticketId: $ticket->id,
            messageId: $message->id,
        );

        expect($log->type)->toBe('send');
        expect($log->status)->toBe('success');
    });

    it('logs auto-reply events', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $log = MessagingChannelLog::logAutoReply(
            messagingChannelId: $channel->id,
            status: 'success',
            ticketId: $ticket->id,
        );

        expect($log->type)->toBe('auto_reply');
        expect($log->status)->toBe('success');
    });
});

describe('AutoReplyVariableService', function () {
    it('substitutes contact_name variable', function () {
        $service = app(AutoReplyVariableService::class);

        $result = $service->substitute(
            'Hello {{contact_name}}, thank you!',
            ['contact_name' => 'John']
        );

        expect($result)->toBe('Hello John, thank you!');
    });

    it('substitutes multiple variables', function () {
        $service = app(AutoReplyVariableService::class);

        $result = $service->substitute(
            'Hi {{contact_name}}! Your ticket #{{ticket_number}} has been received.',
            ['contact_name' => 'Jane', 'ticket_number' => 'TKT-001']
        );

        expect($result)->toBe('Hi Jane! Your ticket #TKT-001 has been received.');
    });

    it('removes unused variables', function () {
        $service = app(AutoReplyVariableService::class);

        $result = $service->substitute(
            'Hello {{contact_name}}!',
            []
        );

        expect($result)->toBe('Hello !');
    });

    it('returns available variables', function () {
        $service = app(AutoReplyVariableService::class);
        $variables = $service->getAvailableVariables();

        expect($variables)->toBeArray();
        expect($variables)->not->toBeEmpty();

        // Check that each variable has the required structure
        $firstVariable = $variables[0];
        expect($firstVariable)->toHaveKeys(['key', 'label', 'example']);
    });
});

describe('MessagingParser Service', function () {
    it('creates a new ticket from messaging', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'provider' => MessagingProvider::Instagram,
        ]);

        $messagingParser = app(MessagingParser::class);

        $messageData = [
            'message_id' => 'msg-123',
            'conversation_id' => 'conv-123',
            'sender_id' => 'user-456',
            'sender_name' => 'John Customer',
            'sender_username' => 'johncustomer',
            'text' => 'Hi, I need help with my order.',
            'attachments' => [],
            'timestamp' => now()->timestamp,
        ];

        $ticket = $messagingParser->parse($messageData, $channel);

        expect($ticket)->toBeInstanceOf(Ticket::class);
        expect($ticket->channel)->toBe(TicketChannel::Instagram);
        expect($ticket->messaging_channel_id)->toBe($channel->id);
        expect($ticket->messaging_conversation_id)->toBe('conv-123');
        expect($ticket->messaging_participant_id)->toBe('user-456');
        expect($ticket->contact->instagram_id)->toBe('user-456');
        expect($ticket->messages)->toHaveCount(1);
    });

    it('adds reply to existing ticket', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'provider' => MessagingProvider::Instagram,
        ]);

        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'instagram_id' => 'user-456',
        ]);

        $defaultStatus = Status::where('organization_id', $this->organization->id)
            ->where('is_default', true)
            ->first();

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'messaging_channel_id' => $channel->id,
            'messaging_conversation_id' => 'conv-123',
            'messaging_participant_id' => 'user-456',
            'status_id' => $defaultStatus->id,
        ]);

        Message::withoutEvents(function () use ($ticket, $contact) {
            return Message::create([
                'ticket_id' => $ticket->id,
                'contact_id' => $contact->id,
                'type' => MessageType::Reply,
                'body' => 'Original message',
                'is_from_contact' => true,
                'messaging_provider_id' => 'msg-001',
            ]);
        });

        $messagingParser = app(MessagingParser::class);

        $messageData = [
            'message_id' => 'msg-456',
            'conversation_id' => 'conv-123',
            'sender_id' => 'user-456',
            'sender_name' => 'John Customer',
            'sender_username' => 'johncustomer',
            'text' => 'Thanks for the help!',
            'attachments' => [],
            'timestamp' => now()->timestamp,
        ];

        $resultTicket = $messagingParser->parse($messageData, $channel);

        expect($resultTicket->id)->toBe($ticket->id);
        expect($resultTicket->fresh()->messages)->toHaveCount(2);
    });

    it('prevents duplicate messages', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $messagingParser = app(MessagingParser::class);

        $messageData = [
            'message_id' => 'msg-duplicate',
            'conversation_id' => 'conv-123',
            'sender_id' => 'user-456',
            'sender_name' => 'John',
            'sender_username' => null,
            'text' => 'Test message',
            'attachments' => [],
            'timestamp' => now()->timestamp,
        ];

        $ticket1 = $messagingParser->parse($messageData, $channel);
        $ticket2 = $messagingParser->parse($messageData, $channel);

        expect($ticket1->id)->toBe($ticket2->id);
        expect($ticket1->messages)->toHaveCount(1);
    });

    it('creates contact with Instagram ID', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'provider' => MessagingProvider::Instagram,
        ]);

        $messagingParser = app(MessagingParser::class);

        $messageData = [
            'message_id' => 'msg-new-contact',
            'conversation_id' => 'conv-new',
            'sender_id' => 'new-ig-user',
            'sender_name' => 'New User',
            'sender_username' => 'newuser',
            'text' => 'Hello!',
            'attachments' => [],
            'timestamp' => now()->timestamp,
        ];

        $ticket = $messagingParser->parse($messageData, $channel);

        expect($ticket->contact->instagram_id)->toBe('new-ig-user');
        expect($ticket->contact->instagram_username)->toBe('newuser');
    });
});

describe('Message Messaging Status', function () {
    it('can mark message as messaging pending', function () {
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
        ]);

        $message->update(['messaging_status' => MessagingStatus::Pending]);

        expect($message->fresh()->messaging_status)->toBe(MessagingStatus::Pending);
    });

    it('can mark message as messaging sent', function () {
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
        ]);

        $message->markMessagingSent('provider-msg-id-123');

        expect($message->fresh()->messaging_status)->toBe(MessagingStatus::Sent);
        expect($message->fresh()->messaging_provider_id)->toBe('provider-msg-id-123');
        expect($message->fresh()->messaging_sent_at)->not->toBeNull();
    });

    it('can mark message as messaging failed', function () {
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
        ]);

        $message->markMessagingFailed('Rate limit exceeded');

        expect($message->fresh()->messaging_status)->toBe(MessagingStatus::Failed);
        expect($message->fresh()->messaging_error)->toBe('Rate limit exceeded');
    });
});

describe('SendMessagingReplyJob', function () {
    it('dispatches send reply job', function () {
        Queue::fake();

        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'is_active' => true,
            'access_token' => 'test-token',
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'messaging_channel_id' => $channel->id,
            'messaging_participant_id' => 'user-123',
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
            'type' => MessageType::Reply,
            'is_from_contact' => false,
        ]);

        SendMessagingReplyJob::dispatch($message, $ticket);

        Queue::assertPushed(SendMessagingReplyJob::class, function ($job) use ($message, $ticket) {
            return $job->message->id === $message->id && $job->ticket->id === $ticket->id;
        });
    });
});

describe('SendMessagingAutoReplyJob', function () {
    it('dispatches auto-reply job', function () {
        Queue::fake();

        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'is_active' => true,
            'auto_reply_enabled' => true,
            'auto_reply_message' => 'Thanks for reaching out!',
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'messaging_channel_id' => $channel->id,
            'messaging_participant_id' => 'user-123',
        ]);

        SendMessagingAutoReplyJob::dispatch($ticket, $channel, 'Thanks for reaching out!');

        Queue::assertPushed(SendMessagingAutoReplyJob::class, function ($job) use ($ticket, $channel) {
            return $job->ticket->id === $ticket->id && $job->channel->id === $channel->id;
        });
    });
});

describe('ProcessMessagingWebhookJob', function () {
    it('dispatches webhook processing job', function () {
        Queue::fake();

        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $payload = [
            'entry' => [
                [
                    'messaging' => [
                        [
                            'sender' => ['id' => 'user-123'],
                            'recipient' => ['id' => $channel->external_id],
                            'message' => ['mid' => 'msg-123', 'text' => 'Hello'],
                        ],
                    ],
                ],
            ],
        ];

        ProcessMessagingWebhookJob::dispatch('meta', $payload, $channel->id);

        Queue::assertPushed(ProcessMessagingWebhookJob::class, function ($job) use ($channel) {
            return $job->channelId === $channel->id && $job->provider === 'meta';
        });
    });
});

describe('MessagingChannel Controller', function () {
    it('lists messaging channels for admin', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get('/organization/messaging-channels');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('organization/messaging-channels')
            ->has('channels', 1)
            ->has('providers')
        );
    });

    it('creates messaging channel', function () {
        $department = Department::where('organization_id', $this->organization->id)
            ->where('is_default', true)
            ->first();

        $response = $this->actingAs($this->adminUser)
            ->post('/organization/messaging-channels', [
                'name' => 'Instagram Support',
                'provider' => MessagingProvider::Instagram->value,
                'department_id' => $department?->id,
            ]);

        // Should redirect to OAuth flow (Inertia location redirect is 409 or redirect)
        expect($response->status())->toBeIn([200, 302, 303, 409]);

        $this->assertDatabaseHas('messaging_channels', [
            'organization_id' => $this->organization->id,
            'name' => 'Instagram Support',
            'provider' => MessagingProvider::Instagram->value,
            'is_active' => false,
        ]);
    });

    it('updates messaging channel', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Support',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->patch("/organization/messaging-channels/{$channel->id}", [
                'name' => 'Instagram Support',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('messaging_channels', [
            'id' => $channel->id,
            'name' => 'Instagram Support',
        ]);
    });

    it('updates auto-reply settings', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->patch("/organization/messaging-channels/{$channel->id}/auto-reply", [
                'auto_reply_enabled' => true,
                'auto_reply_message' => 'Thanks for contacting us!',
                'auto_reply_delay_seconds' => 30,
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('messaging_channels', [
            'id' => $channel->id,
            'auto_reply_enabled' => true,
            'auto_reply_message' => 'Thanks for contacting us!',
            'auto_reply_delay_seconds' => 30,
        ]);
    });

    it('deletes messaging channel without tickets', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->delete("/organization/messaging-channels/{$channel->id}");

        $response->assertRedirect();

        $this->assertDatabaseMissing('messaging_channels', [
            'id' => $channel->id,
        ]);
    });

    it('cannot delete default messaging channel', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'is_default' => true,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->delete("/organization/messaging-channels/{$channel->id}");

        $response->assertRedirect();

        $this->assertDatabaseHas('messaging_channels', [
            'id' => $channel->id,
        ]);
    });

    it('shows configure page for authenticated channel', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'access_token' => 'test-token',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get("/organization/messaging-channels/{$channel->id}/configure");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('organization/messaging-channels/configure')
            ->has('channel')
            ->has('departments')
        );
    });

    it('redirects to index if channel is not authenticated', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'access_token' => null,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get("/organization/messaging-channels/{$channel->id}/configure");

        $response->assertRedirect('/organization/messaging-channels');
    });

    it('shows logs page', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        MessagingChannelLog::logWebhook(
            messagingChannelId: $channel->id,
            status: 'success',
            messagesReceived: 3,
        );

        $response = $this->actingAs($this->adminUser)
            ->get("/organization/messaging-channels/{$channel->id}/logs");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('organization/messaging-channels/logs')
            ->has('channel')
            ->has('logs')
            ->has('stats')
        );
    });
});

describe('Ticket isFromMessaging', function () {
    it('returns true for messaging channel tickets', function () {
        $channel = MessagingChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'channel' => TicketChannel::Instagram,
            'messaging_channel_id' => $channel->id,
        ]);

        expect($ticket->isFromMessaging())->toBeTrue();
    });

    it('returns false for email tickets', function () {
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'channel' => TicketChannel::Email,
        ]);

        expect($ticket->isFromMessaging())->toBeFalse();
    });
});
