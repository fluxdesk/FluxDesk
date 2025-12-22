<?php

namespace App\Notifications\Tickets;

use App\Models\Message;
use App\Models\Ticket;
use App\Models\User;

/**
 * Notification sent to organization members when a contact or CC replies.
 *
 * This alerts the support team that there is a new customer response
 * on a ticket that may need attention.
 */
class NewContactReplyNotification extends BaseTicketNotification
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

        // Determine who sent the reply (contact or CC recipient)
        $senderName = $this->message->contact?->name ?? 'Klant';
        $senderEmail = $this->message->contact?->email ?? '';

        return [
            'view' => 'emails.tickets.contact-reply-internal',
            'subject' => "Nieuwe reactie op: {$this->ticket->subject} [#{$this->ticket->ticket_number}]",
            'data' => [
                'user' => $notifiable,
                'message' => $this->message,
                'actionUrl' => route('inbox.show', $this->ticket),
            ],
        ];
    }
}
