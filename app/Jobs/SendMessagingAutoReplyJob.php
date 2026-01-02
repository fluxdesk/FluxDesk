<?php

namespace App\Jobs;

use App\Enums\MessageType;
use App\Enums\MessagingStatus;
use App\Models\Message;
use App\Models\MessagingChannel;
use App\Models\MessagingChannelLog;
use App\Models\Ticket;
use App\Services\Messaging\MessagingProviderFactory;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Send an auto-reply message via messaging channel.
 *
 * Creates and sends an automated response to customers when a new
 * ticket is created from a messaging channel with auto-reply enabled.
 */
class SendMessagingAutoReplyJob implements ShouldQueue
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
     *
     * @param  string  $messageBody  The auto-reply message text (with variables already substituted)
     */
    public function __construct(
        public Ticket $ticket,
        public MessagingChannel $channel,
        public string $messageBody,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(MessagingProviderFactory $providerFactory): void
    {
        $ticket = $this->ticket;
        $channel = $this->channel;

        if (! $channel->is_active) {
            Log::warning('Cannot send auto-reply - channel is inactive', [
                'channel_id' => $channel->id,
                'ticket_id' => $ticket->id,
            ]);

            return;
        }

        // Verify we have a recipient
        if (! $ticket->messaging_participant_id) {
            Log::warning('Cannot send auto-reply - no participant ID', [
                'ticket_id' => $ticket->id,
            ]);

            return;
        }

        Log::info('Sending messaging auto-reply', [
            'ticket_id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'channel' => $channel->provider->value,
        ]);

        try {
            // Create a system message for the auto-reply
            $message = Message::create([
                'ticket_id' => $ticket->id,
                'type' => MessageType::System,
                'body' => $this->messageBody,
                'body_html' => nl2br(e($this->messageBody)),
                'is_from_contact' => false,
                'messaging_status' => MessagingStatus::Pending,
            ]);

            $provider = $providerFactory->make($channel);

            // Send the message
            $sentMessageId = $provider->sendMessage($channel, $message, $ticket);

            // Mark message as sent
            $message->markMessagingSent($sentMessageId);

            // Log the successful send
            MessagingChannelLog::logAutoReply(
                messagingChannelId: $channel->id,
                status: 'success',
                ticketId: $ticket->id,
                messageId: $message->id,
                metadata: [
                    'provider_message_id' => $sentMessageId,
                ]
            );

            Log::info('Messaging auto-reply sent successfully', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
                'provider_message_id' => $sentMessageId,
            ]);
        } catch (Throwable $e) {
            Log::error('Failed to send messaging auto-reply', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);

            // Log the failed send
            MessagingChannelLog::logAutoReply(
                messagingChannelId: $channel->id,
                status: 'failed',
                ticketId: $ticket->id,
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
        Log::error('SendMessagingAutoReplyJob failed permanently', [
            'ticket_id' => $this->ticket->id,
            'channel_id' => $this->channel->id,
            'error' => $exception?->getMessage(),
        ]);

        // Log the failure
        MessagingChannelLog::logAutoReply(
            messagingChannelId: $this->channel->id,
            status: 'failed',
            ticketId: $this->ticket->id,
            error: $exception?->getMessage() ?? 'Unknown error'
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
            'messaging-auto-reply',
            'ticket:'.$this->ticket->id,
            'channel:'.$this->channel->id,
            'organization:'.$this->ticket->organization_id,
        ];
    }
}
