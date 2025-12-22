<?php

namespace App\Jobs;

use App\Models\Message;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queued job for sending message-related notifications.
 *
 * This job handles sending notifications when a message is created,
 * including agent replies, contact replies, and internal notes.
 */
class SendMessageNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 60;

    public function __construct(
        public Message $message,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(NotificationService $notificationService): void
    {
        try {
            $notificationService->notifyNewMessage($this->message);
        } catch (\Exception $e) {
            Log::error('Message notification job failed', [
                'message_id' => $this->message->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(?\Throwable $exception): void
    {
        Log::error('Message notification job failed permanently', [
            'message_id' => $this->message->id,
            'error' => $exception?->getMessage(),
        ]);
    }
}
