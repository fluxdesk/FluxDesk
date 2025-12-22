<?php

namespace App\Notifications\Tickets;

use App\Channels\TicketEmailChannel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notification sent when a ticket's SLA deadline is approaching.
 */
class SlaBreachWarningNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Ticket $ticket,
        public string $type, // 'first_response' or 'resolution'
        public int $minutesRemaining,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', TicketEmailChannel::class];
    }

    /**
     * Get the database representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'sla_breach_warning',
            'ticket_id' => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'ticket_subject' => $this->ticket->subject,
            'sla_type' => $this->type,
            'minutes_remaining' => $this->minutesRemaining,
            'deadline' => $this->getDeadline()?->toIso8601String(),
        ];
    }

    /**
     * Get the ticket email representation.
     */
    public function toTicketEmail(object $notifiable): ?array
    {
        if (! $notifiable instanceof User) {
            return null;
        }

        $deadline = $this->getDeadline();
        $typeLabel = $this->type === 'first_response' ? 'eerste reactie' : 'oplossing';

        return [
            'view' => 'emails.tickets.sla-breach-warning',
            'subject' => "SLA-waarschuwing: {$typeLabel} voor ticket #{$this->ticket->ticket_number}",
            'data' => [
                'user' => $notifiable,
                'type' => $this->type,
                'typeLabel' => $typeLabel,
                'deadline' => $deadline,
                'minutesRemaining' => $this->minutesRemaining,
                'timeRemaining' => $this->formatTimeRemaining(),
                'actionUrl' => route('inbox.show', $this->ticket),
            ],
        ];
    }

    /**
     * Get the deadline based on the type.
     */
    private function getDeadline(): ?\Carbon\Carbon
    {
        return $this->type === 'first_response'
            ? $this->ticket->sla_first_response_due_at
            : $this->ticket->sla_resolution_due_at;
    }

    /**
     * Format the remaining time in a human-readable format.
     */
    private function formatTimeRemaining(): string
    {
        $minutes = $this->minutesRemaining;

        if ($minutes < 60) {
            return $minutes === 1 ? '1 minuut' : "{$minutes} minuten";
        }

        $hours = floor($minutes / 60);
        $remainingMinutes = $minutes % 60;

        if ($remainingMinutes === 0) {
            return $hours === 1 ? '1 uur' : "{$hours} uur";
        }

        return $hours === 1
            ? "1 uur en {$remainingMinutes} minuten"
            : "{$hours} uur en {$remainingMinutes} minuten";
    }
}
