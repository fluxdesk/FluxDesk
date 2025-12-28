<?php

namespace App\Jobs;

use App\Enums\WebhookEvent;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use App\Services\WebhookService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Dispatch a webhook to an external endpoint.
 *
 * Handles the delivery of webhook payloads with retry logic,
 * logging, and automatic disabling of failing webhooks.
 */
class DispatchWebhookJob implements ShouldQueue
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
    public array $backoff = [60, 300, 900];

    /**
     * Delete the job if its models no longer exist.
     */
    public bool $deleteWhenMissingModels = true;

    /**
     * Create a new job instance.
     *
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public Webhook $webhook,
        public WebhookEvent $event,
        public array $payload,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(WebhookService $webhookService): void
    {
        if (! $this->webhook->is_active) {
            Log::info('Skipping webhook - webhook is inactive', [
                'webhook_id' => $this->webhook->id,
                'event' => $this->event->value,
            ]);

            return;
        }

        $result = $webhookService->deliver($this->webhook, $this->event, $this->payload);

        WebhookDelivery::create([
            'webhook_id' => $this->webhook->id,
            'event_type' => $this->event->value,
            'payload' => $this->payload,
            'response_status' => $result->status,
            'response_body' => $result->body,
            'duration_ms' => $result->durationMs,
            'attempt' => $this->attempts(),
            'success' => $result->success,
            'error' => $result->error,
            'created_at' => now(),
        ]);

        if ($result->success) {
            $this->webhook->resetFailureCount();
            $this->webhook->markAsTriggered();

            Log::info('Webhook delivered successfully', [
                'webhook_id' => $this->webhook->id,
                'event' => $this->event->value,
                'status' => $result->status,
                'duration_ms' => $result->durationMs,
            ]);
        } else {
            $this->webhook->incrementFailureCount();

            Log::warning('Webhook delivery failed', [
                'webhook_id' => $this->webhook->id,
                'event' => $this->event->value,
                'attempt' => $this->attempts(),
                'error' => $result->error,
            ]);

            if ($this->attempts() < $this->tries) {
                throw new \Exception("Webhook delivery failed: {$result->error}");
            }
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(?Throwable $exception): void
    {
        Log::error('Webhook delivery failed permanently', [
            'webhook_id' => $this->webhook->id,
            'event' => $this->event->value,
            'url' => $this->webhook->url,
            'error' => $exception?->getMessage(),
        ]);
    }

    /**
     * Get the tags that should be assigned to the job.
     *
     * @return array<string>
     */
    public function tags(): array
    {
        return [
            'webhook',
            'webhook:'.$this->webhook->id,
            'event:'.$this->event->value,
            'organization:'.$this->webhook->organization_id,
        ];
    }
}
