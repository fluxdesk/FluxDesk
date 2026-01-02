<?php

namespace App\Jobs;

use App\Models\Message;
use App\Models\MessagingChannelLog;
use App\Models\Ticket;
use App\Services\Messaging\MessagingProviderFactory;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Send a ticket reply via messaging channel.
 *
 * Sends agent replies to customers via the ticket's messaging channel
 * (Instagram, WhatsApp, etc.).
 */
class SendMessagingReplyJob implements ShouldQueue
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
    public function handle(MessagingProviderFactory $providerFactory): void
    {
        $message = $this->message;
        $ticket = $this->ticket;

        // Get messaging channel from ticket
        $channel = $ticket->messagingChannel;

        if (! $channel) {
            Log::warning('Cannot send messaging reply - no messaging channel on ticket', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
            ]);
            $message->markMessagingFailed('No messaging channel configured');

            return;
        }

        if (! $channel->is_active) {
            Log::warning('Cannot send messaging reply - channel is inactive', [
                'channel_id' => $channel->id,
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
            ]);
            $message->markMessagingFailed('Messaging channel is inactive');

            return;
        }

        // Verify we have a recipient
        if (! $ticket->messaging_participant_id) {
            Log::warning('Cannot send messaging reply - no participant ID', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
            ]);
            $message->markMessagingFailed('No recipient ID found');

            return;
        }

        Log::info('Sending messaging reply', [
            'ticket_id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'message_id' => $message->id,
            'channel' => $channel->provider->value,
            'recipient_id' => $ticket->messaging_participant_id,
        ]);

        try {
            $provider = $providerFactory->make($channel);

            // Send the message
            $sentMessageId = $provider->sendMessage($channel, $message, $ticket);

            // Mark message as sent
            $message->markMessagingSent($sentMessageId);

            // Log the successful send
            MessagingChannelLog::logSend(
                messagingChannelId: $channel->id,
                status: 'success',
                ticketId: $ticket->id,
                messageId: $message->id,
                metadata: [
                    'provider_message_id' => $sentMessageId,
                    'recipient_id' => $ticket->messaging_participant_id,
                ]
            );

            Log::info('Messaging reply sent successfully', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
                'provider_message_id' => $sentMessageId,
            ]);
        } catch (Throwable $e) {
            Log::error('Failed to send messaging reply', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
                'error' => $e->getMessage(),
            ]);

            // Log the failed send
            MessagingChannelLog::logSend(
                messagingChannelId: $channel->id,
                status: 'failed',
                ticketId: $ticket->id,
                messageId: $message->id,
                error: $e->getMessage()
            );

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(?Throwable $exception): void
    {
        Log::error('SendMessagingReplyJob failed permanently', [
            'ticket_id' => $this->ticket->id,
            'message_id' => $this->message->id,
            'error' => $exception?->getMessage(),
        ]);

        $this->message->markMessagingFailed(
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
            'messaging-send',
            'ticket:'.$this->ticket->id,
            'message:'.$this->message->id,
            'organization:'.$this->ticket->organization_id,
        ];
    }
}
