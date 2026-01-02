<?php

namespace App\Jobs;

use App\Models\MessagingChannel;
use App\Models\MessagingChannelLog;
use App\Services\Messaging\MessagingParser;
use App\Services\Messaging\MessagingProviderFactory;
use App\Services\OrganizationContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessMessagingWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @var array<int>
     */
    public array $backoff = [10, 30, 60];

    public bool $deleteWhenMissingModels = true;

    /**
     * @param  string  $provider  The provider type (e.g., 'meta')
     * @param  array<string, mixed>  $payload  The raw webhook payload
     * @param  int  $channelId  The messaging channel ID
     */
    public function __construct(
        public string $provider,
        public array $payload,
        public int $channelId
    ) {}

    public function handle(
        MessagingProviderFactory $providerFactory,
        MessagingParser $parser,
        OrganizationContext $organizationContext
    ): void {
        $channel = MessagingChannel::find($this->channelId);

        if (! $channel || ! $channel->is_active) {
            Log::warning('Messaging webhook for inactive or missing channel', [
                'channel_id' => $this->channelId,
                'provider' => $this->provider,
            ]);

            return;
        }

        // Set organization context for the duration of this job
        $organizationContext->set($channel->organization);

        try {
            $providerService = $providerFactory->make($channel);

            // Parse the webhook payload to extract messages
            $messages = $providerService->processWebhook($this->payload, $channel);

            if (empty($messages)) {
                Log::debug('No messages to process from webhook', [
                    'channel_id' => $channel->id,
                    'provider' => $this->provider,
                ]);

                return;
            }

            $ticketsCreated = 0;
            $messagesProcessed = 0;

            foreach ($messages as $messageData) {
                try {
                    $ticket = $parser->parse($messageData, $channel);
                    $messagesProcessed++;

                    if ($ticket->wasRecentlyCreated) {
                        $ticketsCreated++;
                    }
                } catch (Throwable $e) {
                    Log::error('Failed to process webhook message', [
                        'channel_id' => $channel->id,
                        'message_id' => $messageData['message_id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Log successful webhook processing
            MessagingChannelLog::logWebhook(
                messagingChannelId: $channel->id,
                status: 'success',
                messagesReceived: $messagesProcessed,
                metadata: [
                    'tickets_created' => $ticketsCreated,
                    'provider' => $this->provider,
                ]
            );

            Log::info('Messaging webhook processed successfully', [
                'channel_id' => $channel->id,
                'messages_processed' => $messagesProcessed,
                'tickets_created' => $ticketsCreated,
            ]);
        } catch (Throwable $e) {
            // Log failed webhook processing
            MessagingChannelLog::logWebhook(
                messagingChannelId: $channel->id,
                status: 'failed',
                error: $e->getMessage()
            );

            Log::error('Failed to process messaging webhook', [
                'channel_id' => $channel->id,
                'provider' => $this->provider,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        } finally {
            $organizationContext->clear();
        }
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('ProcessMessagingWebhookJob failed', [
            'channel_id' => $this->channelId,
            'provider' => $this->provider,
            'error' => $exception?->getMessage(),
        ]);

        // Log the failure
        MessagingChannelLog::logError(
            messagingChannelId: $this->channelId,
            error: $exception?->getMessage() ?? 'Unknown error',
            metadata: ['provider' => $this->provider]
        );
    }
}
