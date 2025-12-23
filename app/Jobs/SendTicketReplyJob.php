<?php

namespace App\Jobs;

use App\Models\EmailChannelLog;
use App\Models\Message;
use App\Models\Ticket;
use App\Services\Email\EmailProviderFactory;
use App\Services\Email\EmailThreadingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Send a ticket reply via email.
 *
 * Sends agent replies to customers via the ticket's email channel,
 * maintaining proper email threading headers for conversation continuity.
 */
class SendTicketReplyJob implements ShouldQueue
{
    use Queueable;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var array<int>
     */
    public array $backoff = [30, 60, 120];

    /**
     * Delete the job if its models no longer exist.
     */
    public bool $deleteWhenMissingModels = true;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Message $message,
        public Ticket $ticket,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(
        EmailProviderFactory $providerFactory,
        EmailThreadingService $threadingService,
    ): void {
        $message = $this->message;
        $ticket = $this->ticket;

        // Validate ticket has an email channel
        if (! $ticket->emailChannel) {
            Log::warning('Cannot send email reply - ticket has no email channel', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
            ]);

            return;
        }

        $channel = $ticket->emailChannel;

        // Skip if channel is not active
        if (! $channel->is_active) {
            Log::warning('Cannot send email reply - channel is inactive', [
                'channel_id' => $channel->id,
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
            ]);
            $message->markEmailFailed('Email channel is inactive');

            return;
        }

        // Skip if no OAuth token
        if (! $channel->oauth_token) {
            Log::warning('Cannot send email reply - channel has no OAuth token', [
                'channel_id' => $channel->id,
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
            ]);
            $message->markEmailFailed('Email channel not authenticated');

            return;
        }

        // Get contact to send to
        $contact = $ticket->contact;
        if (! $contact?->email) {
            Log::warning('Cannot send email reply - contact has no email', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
            ]);
            $message->markEmailFailed('Contact has no email address');

            return;
        }

        Log::info('Sending email reply', [
            'ticket_id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'message_id' => $message->id,
            'contact_id' => $contact->id,
        ]);

        try {
            $provider = $providerFactory->make($channel);

            // Generate threading headers
            $threadHeaders = $threadingService->generateHeaders($ticket, $message, $channel);

            // Build complete headers for sending
            $headers = [
                'message_id' => $threadHeaders['message_id'],
                'in_reply_to' => $threadHeaders['in_reply_to'],
                'references' => $threadHeaders['references'],
                'ticket_number' => $threadHeaders['ticket_number'],
                'subject' => $threadHeaders['subject'],
                'to_email' => $contact->email,
                'to_name' => $contact->name,
            ];

            // Send the email
            $sentMessageId = $provider->sendMessage($channel, $message, $ticket, $headers);

            // Mark message as sent
            $message->markEmailSent($sentMessageId);

            // Log the successful send
            EmailChannelLog::logSend(
                emailChannelId: $channel->id,
                status: 'success',
                subject: $headers['subject'],
                recipient: $contact->email,
                ticketId: $ticket->id,
                messageId: $message->id,
            );

            Log::info('Email reply sent successfully', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
                'email_message_id' => $sentMessageId,
            ]);
        } catch (Throwable $e) {
            Log::error('Failed to send email reply', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
                'error' => $e->getMessage(),
            ]);

            // Log the failed send
            EmailChannelLog::logSend(
                emailChannelId: $channel->id,
                status: 'failed',
                subject: $headers['subject'] ?? $ticket->subject,
                recipient: $contact->email,
                ticketId: $ticket->id,
                messageId: $message->id,
                error: $e->getMessage(),
            );

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(?Throwable $exception): void
    {
        Log::error('SendTicketReplyJob failed permanently', [
            'ticket_id' => $this->ticket->id,
            'message_id' => $this->message->id,
            'error' => $exception?->getMessage(),
        ]);

        $this->message->markEmailFailed(
            $exception?->getMessage() ?? 'Unknown error'
        );
    }

    /**
     * Get the tags that should be assigned to the job.
     *
     * @return array<string>
     */
    public function tags(): array
    {
        return [
            'email-send',
            'ticket:'.$this->ticket->id,
            'message:'.$this->message->id,
            'organization:'.$this->ticket->organization_id,
        ];
    }
}
