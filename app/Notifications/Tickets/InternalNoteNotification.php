<?php

namespace App\Notifications\Tickets;

use App\Models\Message;
use App\Models\Ticket;
use App\Models\User;

/**
 * Notification sent to organization members when an internal note is added.
 *
 * This alerts team members about internal notes/communication
 * on tickets for internal collaboration.
 */
class InternalNoteNotification extends BaseTicketNotification
{
    public function __construct(
        Ticket $ticket,
        public Message $message,
    ) {
        parent::__construct($ticket);
    }

    /**
     * Get the ticket email representation for the organization member.
     */
    public function toTicketEmail(object $notifiable): ?array
    {
        if (! $notifiable instanceof User) {
            return null;
        }

        // Don't notify the user who created the note
        if ($notifiable->id === $this->message->user_id) {
            return null;
        }

        return [
            'view' => 'emails.tickets.internal-note',
            'subject' => "Interne notitie: {$this->ticket->subject} [#{$this->ticket->ticket_number}]",
            'data' => [
                'user' => $notifiable,
                'message' => $this->message,
                'actionUrl' => route('inbox.show', $this->ticket),
            ],
        ];
    }
}
