<?php

namespace App\Notifications\Tickets;

use App\Models\User;

/**
 * Notification sent to organization members when a new ticket is created.
 *
 * This alerts the support team that a new ticket has been received
 * and needs attention.
 */
class NewTicketNotification extends BaseTicketNotification
{
    /**
     * Get the ticket email representation for the organization member.
     */
    public function toTicketEmail(object $notifiable): ?array
    {
        if (! $notifiable instanceof User) {
            return null;
        }

        // Get the contact name who created the ticket
        $contactName = $this->ticket->contact?->name ?? 'Onbekend';
        $contactEmail = $this->ticket->contact?->email ?? '';

        // Get the first message for preview (if exists)
        $firstMessage = $this->ticket->messages()
            ->orderBy('created_at', 'asc')
            ->first();

        $messagePreview = $firstMessage
            ? $this->getMessagePreview($firstMessage->body)
            : 'Geen bericht beschikbaar';

        return [
            'view' => 'emails.tickets.new-ticket-internal',
            'subject' => "Nieuw ticket: {$this->ticket->subject} [#{$this->ticket->ticket_number}]",
            'data' => [
                'user' => $notifiable,
                'message' => $firstMessage,
                'actionUrl' => route('inbox.show', $this->ticket),
                'slaDeadlines' => $this->getSlaDeadlines(),
            ],
        ];
    }

    /**
     * Get SLA deadlines for the ticket.
     *
     * @return array{first_response_due: \Carbon\Carbon|null, resolution_due: \Carbon\Carbon|null}
     */
    private function getSlaDeadlines(): array
    {
        return [
            'first_response_due' => $this->ticket->sla_first_response_due_at,
            'resolution_due' => $this->ticket->sla_resolution_due_at,
        ];
    }
}
