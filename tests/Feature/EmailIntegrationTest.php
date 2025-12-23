<?php

use App\Enums\EmailProvider;
use App\Enums\EmailStatus;
use App\Enums\MessageType;
use App\Enums\TicketChannel;
use App\Enums\UserRole;
use App\Jobs\SendTicketReplyJob;
use App\Jobs\SyncEmailChannelJob;
use App\Models\Contact;
use App\Models\Department;
use App\Models\EmailChannel;
use App\Models\Message;
use App\Models\Organization;
use App\Models\Priority;
use App\Models\Status;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Email\EmailThreadingService;
use App\Services\EmailParser;
use App\Services\OrganizationContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

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

describe('EmailChannel Model', function () {
    it('can create an email channel', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Support',
            'email_address' => 'support@example.com',
            'provider' => EmailProvider::Microsoft365,
        ]);

        expect($channel->name)->toBe('Support');
        expect($channel->email_address)->toBe('support@example.com');
        expect($channel->provider)->toBe(EmailProvider::Microsoft365);
        expect($channel->organization_id)->toBe($this->organization->id);
    });

    it('detects when sync is needed', function () {
        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'sync_interval_minutes' => 5,
            'last_sync_at' => now()->subMinutes(10),
        ]);

        expect($channel->needsSync())->toBeTrue();
    });

    it('detects when sync is not needed', function () {
        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'sync_interval_minutes' => 5,
            'last_sync_at' => now()->subMinutes(2),
        ]);

        expect($channel->needsSync())->toBeFalse();
    });

    it('detects expired OAuth tokens', function () {
        $channel = EmailChannel::factory()->expiredToken()->create([
            'organization_id' => $this->organization->id,
        ]);

        expect($channel->isTokenExpired())->toBeTrue();
    });

    it('detects valid OAuth tokens', function () {
        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
        ]);

        expect($channel->isTokenExpired())->toBeFalse();
    });

    it('extracts domain from email address', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'email_address' => 'support@acme.com',
        ]);

        expect($channel->domain)->toBe('acme.com');
    });

    it('marks channel as synced', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'last_sync_at' => null,
            'last_sync_error' => 'Previous error',
        ]);

        $channel->markSynced();

        expect($channel->fresh()->last_sync_at)->not->toBeNull();
        expect($channel->fresh()->last_sync_error)->toBeNull();
    });

    it('marks channel with sync error', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $channel->markSyncError('Connection failed');

        expect($channel->fresh()->last_sync_error)->toBe('Connection failed');
    });
});

describe('EmailParser Service', function () {
    it('creates a new ticket from email', function () {
        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
        ]);

        $emailParser = app(EmailParser::class);

        $emailData = [
            'id' => 'msg-123',
            'internet_message_id' => '<unique-message-id@example.com>',
            'conversation_id' => 'conv-123',
            'thread_id' => null,
            'from_email' => 'customer@example.com',
            'from_name' => 'John Customer',
            'subject' => 'Help needed with product',
            'body_text' => 'I need help with my order.',
            'body_html' => null,
            'received_at' => now(),
            'in_reply_to' => null,
            'references' => [],
            'importance' => 'normal',
            'headers' => [],
            'attachments' => [],
        ];

        $ticket = $emailParser->parse($emailData, $channel);

        expect($ticket)->toBeInstanceOf(Ticket::class);
        expect($ticket->subject)->toBe('Help needed with product');
        expect($ticket->channel)->toBe(TicketChannel::Email);
        expect($ticket->email_channel_id)->toBe($channel->id);
        expect($ticket->contact->email)->toBe('customer@example.com');
        expect($ticket->messages)->toHaveCount(1);
    });

    it('adds reply to existing ticket', function () {
        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
        ]);

        $contact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'customer@example.com',
        ]);

        // Get the default status from beforeEach
        $defaultStatus = Status::where('organization_id', $this->organization->id)
            ->where('is_default', true)
            ->first();

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'email_channel_id' => $channel->id,
            'status_id' => $defaultStatus->id,
        ]);

        // Create message without triggering observer (use withoutEvents)
        $originalMessage = Message::withoutEvents(function () use ($ticket, $contact) {
            return Message::create([
                'ticket_id' => $ticket->id,
                'contact_id' => $contact->id,
                'type' => MessageType::Reply,
                'body' => 'Original message',
                'is_from_contact' => true,
                'email_message_id' => 'original-msg@example.com', // Without angle brackets - threading service will clean
            ]);
        });

        $emailParser = app(EmailParser::class);

        $emailData = [
            'id' => 'msg-456',
            'internet_message_id' => '<reply-msg@example.com>',
            'conversation_id' => 'conv-123',
            'thread_id' => null,
            'from_email' => 'customer@example.com',
            'from_name' => 'John Customer',
            'subject' => 'Re: Help needed with product',
            'body_text' => 'Thanks for the quick response!',
            'body_html' => null,
            'received_at' => now(),
            'in_reply_to' => 'original-msg@example.com',
            'references' => ['original-msg@example.com'],
            'importance' => 'normal',
            'headers' => [],
            'attachments' => [],
        ];

        $resultTicket = $emailParser->parse($emailData, $channel);

        expect($resultTicket->id)->toBe($ticket->id);
        expect($resultTicket->fresh()->messages)->toHaveCount(2);
    });

    it('detects urgent emails and sets priority', function () {
        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
        ]);

        // First delete any existing urgent priority (or just use firstOrCreate)
        Priority::where('organization_id', $this->organization->id)
            ->where('slug', 'urgent')
            ->delete();

        // Create urgent priority
        $urgentPriority = Priority::create([
            'organization_id' => $this->organization->id,
            'name' => 'Urgent',
            'slug' => 'urgent',
            'color' => '#ff0000',
            'is_default' => false,
            'sort_order' => 0,
        ]);

        $emailParser = app(EmailParser::class);

        $emailData = [
            'id' => 'msg-urgent',
            'internet_message_id' => '<urgent-msg@example.com>',
            'conversation_id' => null,
            'thread_id' => null,
            'from_email' => 'customer@example.com',
            'from_name' => 'John Customer',
            'subject' => 'URGENT: System is down!',
            'body_text' => 'Our system is not working.',
            'body_html' => null,
            'received_at' => now(),
            'in_reply_to' => null,
            'references' => [],
            'importance' => 'high',
            'headers' => [],
            'attachments' => [],
        ];

        $ticket = $emailParser->parse($emailData, $channel);

        expect($ticket->priority_id)->toBe($urgentPriority->id);
    });

    it('prevents duplicate messages', function () {
        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
        ]);

        $emailParser = app(EmailParser::class);

        $emailData = [
            'id' => 'msg-123',
            'internet_message_id' => '<duplicate-msg@example.com>',
            'conversation_id' => null,
            'thread_id' => null,
            'from_email' => 'customer@example.com',
            'from_name' => 'John Customer',
            'subject' => 'Test email',
            'body_text' => 'Test body.',
            'body_html' => null,
            'received_at' => now(),
            'in_reply_to' => null,
            'references' => [],
            'importance' => 'normal',
            'headers' => [],
            'attachments' => [],
        ];

        $ticket1 = $emailParser->parse($emailData, $channel);
        $ticket2 = $emailParser->parse($emailData, $channel);

        expect($ticket1->id)->toBe($ticket2->id);
        expect($ticket1->messages)->toHaveCount(1);
    });

    it('creates ticket with attachments', function () {
        Storage::fake('local');

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
        ]);

        $emailParser = app(EmailParser::class);

        $emailData = [
            'id' => 'msg-with-attachment',
            'internet_message_id' => '<attachment-msg@example.com>',
            'conversation_id' => null,
            'thread_id' => null,
            'from_email' => 'customer@example.com',
            'from_name' => 'John Customer',
            'subject' => 'Email with attachment',
            'body_text' => 'Please see attached file.',
            'body_html' => '<p>Please see attached file.</p>',
            'received_at' => now(),
            'in_reply_to' => null,
            'references' => [],
            'importance' => 'normal',
            'headers' => [],
            'attachments' => [
                [
                    'name' => 'document.pdf',
                    'content_type' => 'application/pdf',
                    'size' => 1024,
                    'content' => base64_encode('fake pdf content'),
                    'content_id' => null,
                    'is_inline' => false,
                ],
                [
                    'name' => 'inline-image.png',
                    'content_type' => 'image/png',
                    'size' => 2048,
                    'content' => base64_encode('fake png content'),
                    'content_id' => 'image001',
                    'is_inline' => true,
                ],
            ],
        ];

        $ticket = $emailParser->parse($emailData, $channel);

        expect($ticket)->toBeInstanceOf(Ticket::class);
        expect($ticket->messages)->toHaveCount(1);

        $message = $ticket->messages->first();
        expect($message->attachments)->toHaveCount(2);

        $regularAttachment = $message->attachments->where('is_inline', false)->first();
        expect($regularAttachment->original_filename)->toBe('document.pdf');
        expect($regularAttachment->mime_type)->toBe('application/pdf');
        expect($regularAttachment->message_id)->toBe($message->id);

        $inlineAttachment = $message->attachments->where('is_inline', true)->first();
        expect($inlineAttachment->original_filename)->toBe('inline-image.png');
        expect($inlineAttachment->content_id)->toBe('image001');
        expect($inlineAttachment->message_id)->toBe($message->id);
    });
});

describe('EmailThreadingService', function () {
    it('generates proper message ID', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'email_address' => 'support@acme.com',
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
        ]);

        $threadingService = app(EmailThreadingService::class);
        $messageId = $threadingService->generateMessageId($ticket, $message, $channel);

        expect($messageId)->toBe("ticket-{$ticket->id}-msg-{$message->id}@acme.com");
    });

    it('generates headers with ticket reference', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'email_address' => 'support@acme.com',
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
        ]);

        $threadingService = app(EmailThreadingService::class);
        $headers = $threadingService->generateHeaders($ticket, $message, $channel);

        expect($headers)->toHaveKey('message_id');
        expect($headers)->toHaveKey('ticket_number');
        expect($headers['ticket_number'])->toBe($ticket->ticket_number);
    });

    it('finds ticket by message ID in references', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'email_channel_id' => $channel->id,
        ]);

        // Create message without triggering observer
        Message::withoutEvents(function () use ($ticket) {
            return Message::create([
                'ticket_id' => $ticket->id,
                'type' => MessageType::Reply,
                'body' => 'Test message',
                'is_from_contact' => true,
                'email_message_id' => 'original-msg@acme.com', // Without angle brackets
            ]);
        });

        $threadingService = app(EmailThreadingService::class);
        $foundTicket = $threadingService->findTicketByHeaders([
            'in_reply_to' => null,
            'references' => ['original-msg@acme.com'], // Without angle brackets - service cleans them
            'subject' => 'Re: Test',
        ], $this->organization->id);

        expect($foundTicket)->not->toBeNull();
        expect($foundTicket->id)->toBe($ticket->id);
    });

    it('finds ticket by subject with ticket number', function () {
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'ticket_number' => 'TKT-00123',
        ]);

        $threadingService = app(EmailThreadingService::class);
        $foundTicket = $threadingService->findTicketBySubject(
            'Re: [TKT-00123] Help with order',
            $this->organization->id
        );

        expect($foundTicket)->not->toBeNull();
        expect($foundTicket->id)->toBe($ticket->id);
    });

    it('returns latest message for In-Reply-To header', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'email_address' => 'support@acme.com',
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'email_channel_id' => $channel->id,
        ]);

        // Create first message
        $firstMessage = Message::withoutEvents(function () use ($ticket) {
            return Message::create([
                'ticket_id' => $ticket->id,
                'type' => MessageType::Reply,
                'body' => 'First message',
                'is_from_contact' => true,
                'email_message_id' => 'first-msg@example.com',
                'created_at' => now()->subMinutes(5),
            ]);
        });

        // Create second (latest) message
        $latestMessage = Message::withoutEvents(function () use ($ticket) {
            return Message::create([
                'ticket_id' => $ticket->id,
                'type' => MessageType::Reply,
                'body' => 'Latest message',
                'is_from_contact' => true,
                'email_message_id' => 'latest-msg@example.com',
                'created_at' => now(),
            ]);
        });

        $threadingService = app(EmailThreadingService::class);

        // getLatestEmailMessage should return the LATEST message, not the first
        $foundMessage = $threadingService->getLatestEmailMessage($ticket);

        expect($foundMessage)->not->toBeNull();
        expect($foundMessage->id)->toBe($latestMessage->id);
        expect($foundMessage->email_message_id)->toBe('latest-msg@example.com');
    });

    it('builds reference chain in chronological order', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'email_channel_id' => $channel->id,
        ]);

        // Create messages in order
        Message::withoutEvents(function () use ($ticket) {
            Message::create([
                'ticket_id' => $ticket->id,
                'type' => MessageType::Reply,
                'body' => 'First',
                'is_from_contact' => true,
                'email_message_id' => 'first@example.com',
                'created_at' => now()->subMinutes(10),
            ]);
            Message::create([
                'ticket_id' => $ticket->id,
                'type' => MessageType::Reply,
                'body' => 'Second',
                'is_from_contact' => true,
                'email_message_id' => 'second@example.com',
                'created_at' => now()->subMinutes(5),
            ]);
            Message::create([
                'ticket_id' => $ticket->id,
                'type' => MessageType::Reply,
                'body' => 'Third',
                'is_from_contact' => true,
                'email_message_id' => 'third@example.com',
                'created_at' => now(),
            ]);
        });

        $threadingService = app(EmailThreadingService::class);
        $references = $threadingService->buildReferenceChain($ticket);

        // References should be in chronological order (oldest first)
        expect($references)->toBe('<first@example.com> <second@example.com> <third@example.com>');
    });
});

describe('Message Email Status', function () {
    it('can mark message as email pending', function () {
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
        ]);

        $message->markEmailPending();

        expect($message->fresh()->email_status)->toBe(EmailStatus::Pending);
    });

    it('can mark message as email sent', function () {
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
        ]);

        $message->markEmailSent('<sent-msg@example.com>');

        expect($message->fresh()->email_status)->toBe(EmailStatus::Sent);
        expect($message->fresh()->email_message_id)->toBe('<sent-msg@example.com>');
        expect($message->fresh()->email_sent_at)->not->toBeNull();
    });

    it('can mark message as email failed', function () {
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
        ]);

        $message->markEmailFailed('SMTP connection refused');

        expect($message->fresh()->email_status)->toBe(EmailStatus::Failed);
        expect($message->fresh()->email_error)->toBe('SMTP connection refused');
    });
});

describe('SyncEmailChannelJob', function () {
    it('dispatches sync job', function () {
        Queue::fake();

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
        ]);

        SyncEmailChannelJob::dispatch($channel);

        Queue::assertPushed(SyncEmailChannelJob::class, function ($job) use ($channel) {
            return $job->emailChannel->id === $channel->id;
        });
    });
});

describe('SendTicketReplyJob', function () {
    it('dispatches send reply job', function () {
        Queue::fake();

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'email_channel_id' => $channel->id,
        ]);

        $message = Message::factory()->create([
            'ticket_id' => $ticket->id,
            'type' => MessageType::Reply,
        ]);

        SendTicketReplyJob::dispatch($message, $ticket);

        Queue::assertPushed(SendTicketReplyJob::class, function ($job) use ($message, $ticket) {
            return $job->message->id === $message->id && $job->ticket->id === $ticket->id;
        });
    });
});

describe('EmailChannel Controller', function () {
    it('lists email channels for admin', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get('/organization/email-channels');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('organization/email-channels')
            ->has('channels', 1)
        );
    });

    it('creates email channel', function () {
        $response = $this->actingAs($this->adminUser)
            ->post('/organization/email-channels', [
                'name' => 'Sales',
                'provider' => EmailProvider::Microsoft365->value,
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('email_channels', [
            'organization_id' => $this->organization->id,
            'name' => 'Sales',
            'provider' => EmailProvider::Microsoft365->value,
            'is_active' => false, // Not active until configured
        ]);
    });

    it('updates email channel', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Support',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->patch("/organization/email-channels/{$channel->id}", [
                'name' => 'Customer Support',
                'sync_interval_minutes' => 15,
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('email_channels', [
            'id' => $channel->id,
            'name' => 'Customer Support',
            'sync_interval_minutes' => 15,
        ]);
    });

    it('deletes email channel without tickets', function () {
        $channel = EmailChannel::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->delete("/organization/email-channels/{$channel->id}");

        $response->assertRedirect();

        $this->assertDatabaseMissing('email_channels', [
            'id' => $channel->id,
        ]);
    });

    it('cannot delete default email channel', function () {
        $channel = EmailChannel::factory()->default()->create([
            'organization_id' => $this->organization->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->delete("/organization/email-channels/{$channel->id}");

        $response->assertRedirect();

        $this->assertDatabaseHas('email_channels', [
            'id' => $channel->id,
        ]);
    });

    it('shows configure page for authenticated channel', function () {
        $channel = EmailChannel::factory()->needsConfiguration()->create([
            'organization_id' => $this->organization->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get("/organization/email-channels/{$channel->id}/configure");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('organization/email-channels/configure')
            ->has('channel')
            ->has('postImportActions')
        );
    });

    it('redirects to index if channel is not authenticated', function () {
        $channel = EmailChannel::factory()->inactive()->create([
            'organization_id' => $this->organization->id,
            'oauth_token' => null,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get("/organization/email-channels/{$channel->id}/configure");

        $response->assertRedirect('/organization/email-channels');
    });

    it('configures and activates email channel', function () {
        $channel = EmailChannel::factory()->needsConfiguration()->create([
            'organization_id' => $this->organization->id,
        ]);
        $department = Department::where('organization_id', $this->organization->id)->where('is_default', true)->first();

        $response = $this->actingAs($this->adminUser)
            ->patch("/organization/email-channels/{$channel->id}/configure", [
                'department_id' => $department->id,
                'fetch_folder' => 'INBOX',
                'post_import_action' => 'archive',
                'sync_interval_minutes' => 10,
            ]);

        $response->assertRedirect('/organization/email-channels');

        $this->assertDatabaseHas('email_channels', [
            'id' => $channel->id,
            'fetch_folder' => 'INBOX',
            'post_import_action' => 'archive',
            'sync_interval_minutes' => 10,
            'is_active' => true,
        ]);
    });

    it('requires post_import_folder when action is move_to_folder', function () {
        $channel = EmailChannel::factory()->needsConfiguration()->create([
            'organization_id' => $this->organization->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->patch("/organization/email-channels/{$channel->id}/configure", [
                'fetch_folder' => 'INBOX',
                'post_import_action' => 'move_to_folder',
                // Missing post_import_folder
            ]);

        $response->assertSessionHasErrors('post_import_folder');
    });
});

describe('SyncEmailsCommand', function () {
    it('runs without errors with no channels', function () {
        $this->artisan('email:sync')
            ->assertSuccessful()
            ->expectsOutput('No active email channels with OAuth tokens found.');
    });

    it('dispatches sync jobs for active channels', function () {
        Queue::fake();

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
            'last_sync_at' => now()->subHour(),
        ]);

        $this->artisan('email:sync --force')
            ->assertSuccessful();

        Queue::assertPushed(SyncEmailChannelJob::class);
    });

    it('can sync specific channel', function () {
        Queue::fake();

        $channel = EmailChannel::factory()->authenticated()->create([
            'organization_id' => $this->organization->id,
        ]);

        $this->artisan("email:sync --channel={$channel->id} --force")
            ->assertSuccessful();

        Queue::assertPushed(SyncEmailChannelJob::class);
    });
});
