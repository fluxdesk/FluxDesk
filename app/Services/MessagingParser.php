<?php

namespace App\Services;

use App\Enums\MessageType;
use App\Jobs\SendMessagingAutoReplyJob;
use App\Models\Contact;
use App\Models\Message;
use App\Models\MessagingChannel;
use App\Models\Priority;
use App\Models\Status;
use App\Models\Ticket;
use App\Services\Messaging\AutoReplyVariableService;
use App\Services\Messaging\InstagramService;
use App\Services\Messaging\MessagingProviderFactory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Messaging Parser Service.
 *
 * Handles parsing incoming messages from social platforms and creating/updating tickets:
 * - Creates tickets from new conversations
 * - Threads replies to existing conversations
 * - Creates contacts from platform user data
 * - Triggers auto-replies when enabled
 */
class MessagingParser
{
    public function __construct(
        private OrganizationContext $organizationContext,
        private HtmlSanitizer $htmlSanitizer,
        private AutoReplyVariableService $autoReplyVariableService,
        private MessagingProviderFactory $providerFactory,
    ) {}

    /**
     * Parse an incoming message and create/update ticket.
     *
     * @param  array{
     *     message_id: string,
     *     conversation_id: string,
     *     sender_id: string,
     *     sender_name: ?string,
     *     sender_username: ?string,
     *     text: ?string,
     *     attachments: ?array,
     *     timestamp: int
     * }  $messageData  Parsed message data from provider
     * @param  MessagingChannel  $channel  The messaging channel that received the message
     * @return Ticket The created or updated ticket
     */
    public function parse(array $messageData, MessagingChannel $channel): Ticket
    {
        return DB::transaction(function () use ($messageData, $channel) {
            $organizationId = $channel->organization_id;

            // Check if message already exists (prevent duplicates)
            if ($this->messageExists($messageData['message_id'], $organizationId)) {
                Log::debug('Duplicate message, skipping', [
                    'message_id' => $messageData['message_id'],
                ]);

                return $this->findTicketByMessageId($messageData['message_id'], $organizationId);
            }

            // Find or create the contact
            $contact = $this->findOrCreateContact($messageData, $channel);

            // Try to find existing ticket by conversation ID
            $ticket = $this->findTicketByConversation(
                $messageData['conversation_id'],
                $channel,
                $organizationId
            );

            $isNewTicket = false;

            if ($ticket) {
                // Add reply to existing ticket
                $this->addReplyToTicket($ticket, $messageData, $contact);

                // Re-open ticket if it was closed
                $this->reopenTicketIfClosed($ticket);

                Log::debug('Message added to existing ticket', [
                    'ticket_id' => $ticket->id,
                    'conversation_id' => $messageData['conversation_id'],
                ]);
            } else {
                // Create new ticket
                $ticket = $this->createTicket($messageData, $channel, $contact);
                $isNewTicket = true;

                Log::info('New ticket created from messaging', [
                    'ticket_id' => $ticket->id,
                    'channel' => $channel->provider->value,
                    'conversation_id' => $messageData['conversation_id'],
                ]);
            }

            // Handle auto-reply for new tickets only
            if ($isNewTicket) {
                $this->handleAutoReply($ticket, $channel, $contact);
            }

            return $ticket;
        });
    }

    /**
     * Check if a message with this provider message ID already exists.
     */
    private function messageExists(string $messageId, int $organizationId): bool
    {
        return Message::whereHas('ticket', function ($query) use ($organizationId) {
            $query->where('organization_id', $organizationId);
        })
            ->where('messaging_provider_id', $messageId)
            ->exists();
    }

    /**
     * Find a ticket by messaging provider message ID.
     */
    private function findTicketByMessageId(string $messageId, int $organizationId): ?Ticket
    {
        return Ticket::where('organization_id', $organizationId)
            ->whereHas('messages', function ($query) use ($messageId) {
                $query->where('messaging_provider_id', $messageId);
            })
            ->first();
    }

    /**
     * Find an existing ticket by conversation ID.
     */
    private function findTicketByConversation(
        string $conversationId,
        MessagingChannel $channel,
        int $organizationId
    ): ?Ticket {
        return Ticket::where('organization_id', $organizationId)
            ->where('messaging_channel_id', $channel->id)
            ->where('messaging_conversation_id', $conversationId)
            ->first();
    }

    /**
     * Find or create a contact from message sender data.
     */
    private function findOrCreateContact(array $messageData, MessagingChannel $channel): Contact
    {
        $organizationId = $channel->organization_id;
        $senderId = $messageData['sender_id'];
        $provider = $channel->provider;

        // Determine which field to use for looking up the contact
        $lookupField = match ($provider->value) {
            'instagram' => 'instagram_id',
            'facebook_messenger' => 'facebook_id',
            'whatsapp' => 'whatsapp_phone',
            'wechat' => 'wechat_id',
            default => 'instagram_id', // Fallback
        };

        // Try to find existing contact
        $contact = Contact::where('organization_id', $organizationId)
            ->where($lookupField, $senderId)
            ->first();

        if ($contact) {
            // Update name/username if we have new data
            if ($messageData['sender_name'] && ! $contact->name) {
                $contact->update(['name' => $messageData['sender_name']]);
            }
            if ($messageData['sender_username'] && $provider->value === 'instagram') {
                $contact->update(['instagram_username' => $messageData['sender_username']]);
            }

            return $contact;
        }

        // Fetch additional user info from the platform if available
        $userProfile = $this->fetchUserProfile($channel, $senderId);

        // Create new contact
        return Contact::create([
            'organization_id' => $organizationId,
            'name' => $messageData['sender_name'] ?? $userProfile['name'] ?? null,
            'email' => $this->generatePlaceholderEmail($senderId, $provider->value),
            $lookupField => $senderId,
            'instagram_username' => $messageData['sender_username'] ?? $userProfile['username'] ?? null,
            'avatar_url' => $userProfile['profile_picture_url'] ?? null,
        ]);
    }

    /**
     * Fetch user profile from the messaging platform.
     *
     * @return array{id: string, name: ?string, username: ?string, profile_picture_url: ?string}|null
     */
    private function fetchUserProfile(MessagingChannel $channel, string $userId): ?array
    {
        try {
            $provider = $this->providerFactory->make($channel);

            if ($provider instanceof InstagramService) {
                return $provider->getUserProfile($channel, $userId);
            }
        } catch (\Exception $e) {
            Log::debug('Failed to fetch user profile', [
                'channel_id' => $channel->id,
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Generate a placeholder email for contacts without real email.
     */
    private function generatePlaceholderEmail(string $senderId, string $provider): string
    {
        return "{$senderId}@{$provider}.messaging.local";
    }

    /**
     * Create a new ticket from a messaging conversation.
     */
    private function createTicket(array $messageData, MessagingChannel $channel, Contact $contact): Ticket
    {
        $organizationId = $channel->organization_id;

        // Get default status
        $defaultStatus = Status::where('organization_id', $organizationId)
            ->where('is_default', true)
            ->first();

        // Get default priority
        $defaultPriority = Priority::where('organization_id', $organizationId)
            ->where('is_default', true)
            ->first();

        // Create ticket
        $ticket = Ticket::create([
            'organization_id' => $organizationId,
            'subject' => $this->generateSubject($messageData, $channel, $contact),
            'contact_id' => $contact->id,
            'status_id' => $defaultStatus?->id,
            'priority_id' => $defaultPriority?->id,
            'department_id' => $channel->department_id,
            'channel' => $channel->provider->toTicketChannel(),
            'messaging_channel_id' => $channel->id,
            'messaging_conversation_id' => $messageData['conversation_id'],
            'messaging_participant_id' => $messageData['sender_id'],
        ]);

        // Create the initial message
        $this->createMessage($ticket, $messageData, $contact);

        return $ticket;
    }

    /**
     * Generate a subject line for a messaging ticket.
     */
    private function generateSubject(array $messageData, MessagingChannel $channel, Contact $contact): string
    {
        $provider = $channel->provider->label();
        $name = $contact->name ?? $contact->display_name;

        if ($messageData['text']) {
            // Use first 50 chars of message as subject
            $preview = mb_strlen($messageData['text']) > 50
                ? mb_substr($messageData['text'], 0, 47).'...'
                : $messageData['text'];

            return "{$provider}: {$preview}";
        }

        return "{$provider} message from {$name}";
    }

    /**
     * Add a reply message to an existing ticket.
     */
    private function addReplyToTicket(Ticket $ticket, array $messageData, Contact $contact): Message
    {
        return $this->createMessage($ticket, $messageData, $contact);
    }

    /**
     * Create a message from messaging data.
     */
    private function createMessage(Ticket $ticket, array $messageData, Contact $contact): Message
    {
        $bodyText = $messageData['text'] ?? '';

        // Handle attachments description if no text
        if (empty($bodyText) && ! empty($messageData['attachments'])) {
            $attachmentCount = count($messageData['attachments']);
            $bodyText = "[{$attachmentCount} attachment(s)]";
        }

        return Message::create([
            'ticket_id' => $ticket->id,
            'contact_id' => $contact->id,
            'type' => MessageType::Reply,
            'body' => $bodyText,
            'body_html' => $this->htmlSanitizer->sanitize(nl2br(e($bodyText))),
            'is_from_contact' => true,
            'messaging_provider_id' => $messageData['message_id'],
        ]);
    }

    /**
     * Re-open a closed ticket when a new message arrives.
     */
    private function reopenTicketIfClosed(Ticket $ticket): void
    {
        if (! $ticket->isClosed()) {
            return;
        }

        // Get default open status
        $openStatus = Status::where('organization_id', $ticket->organization_id)
            ->where('is_default', true)
            ->first();

        if ($openStatus) {
            $ticket->update([
                'status_id' => $openStatus->id,
                'resolved_at' => null,
                'closed_at' => null,
                'folder_id' => null, // Move back to inbox
            ]);

            Log::debug('Ticket reopened due to new message', [
                'ticket_id' => $ticket->id,
            ]);
        }
    }

    /**
     * Handle auto-reply if enabled for the channel.
     */
    private function handleAutoReply(Ticket $ticket, MessagingChannel $channel, Contact $contact): void
    {
        if (! $channel->shouldSendAutoReply()) {
            return;
        }

        // Build context for variable substitution
        $context = $this->autoReplyVariableService->buildContext($ticket, $channel, $contact);

        // Get the message with substituted variables
        $message = $channel->getAutoReplyWithVariables($context);

        if (! $message) {
            return;
        }

        // Dispatch auto-reply job with configured delay
        $delay = $channel->auto_reply_delay_seconds > 0
            ? now()->addSeconds($channel->auto_reply_delay_seconds)
            : now();

        SendMessagingAutoReplyJob::dispatch($ticket, $channel, $message)
            ->delay($delay);

        Log::debug('Auto-reply scheduled', [
            'ticket_id' => $ticket->id,
            'channel_id' => $channel->id,
            'delay_seconds' => $channel->auto_reply_delay_seconds,
        ]);
    }
}
