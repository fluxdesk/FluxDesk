<?php

namespace App\Notifications\Tickets;

use App\Channels\TicketEmailChannel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notification sent when a ticket is assigned to a user.
 */
class TicketAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Ticket $ticket,
        public ?User $assignedBy = null,
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
            'type' => 'assignment',
            'ticket_id' => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'ticket_subject' => $this->ticket->subject,
            'assigned_by_id' => $this->assignedBy?->id,
            'assigned_by_name' => $this->assignedBy?->name ?? 'Systeem',
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

        return [
            'view' => 'emails.tickets.assigned',
            'subject' => "Ticket #{$this->ticket->ticket_number} aan jou toegewezen",
            'data' => [
                'user' => $notifiable,
                'assignedBy' => $this->assignedBy,
                'actionUrl' => route('inbox.show', $this->ticket),
            ],
        ];
    }
}
