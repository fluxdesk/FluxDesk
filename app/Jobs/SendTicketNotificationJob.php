<?php

namespace App\Jobs;

use App\Models\Ticket;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queued job for sending ticket-created notifications.
 *
 * This job handles sending notifications when a ticket is created,
 * including confirmation to contacts and alerts to organization members.
 */
class SendTicketNotificationJob implements ShouldQueue
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
        public Ticket $ticket,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(NotificationService $notificationService): void
    {
        try {
            $notificationService->notifyTicketCreated($this->ticket);
        } catch (\Exception $e) {
            Log::error('Ticket notification job failed', [
                'ticket_id' => $this->ticket->id,
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
        Log::error('Ticket notification job failed permanently', [
            'ticket_id' => $this->ticket->id,
            'error' => $exception?->getMessage(),
        ]);
    }
}
