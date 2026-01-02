<?php

namespace App\Notifications\Tickets;

use App\Models\Contact;
use App\Models\Message;
use App\Models\Ticket;
use App\Services\MagicLinkService;

/**
 * Notification sent to contacts (owner and CC) when an agent replies.
 *
 * This notifies the ticket contact and any CC recipients when a support
 * agent has replied to the ticket.
 */
class NewAgentReplyNotification extends BaseTicketNotification
{
    private ?string $magicLink = null;

    public function __construct(
        Ticket $ticket,
        public Message $message,
        private MagicLinkService $magicLinkService,
    ) {
        parent::__construct($ticket);
    }

    /**
     * Get the ticket email representation for the contact.
     */
    public function toTicketEmail(object $notifiable): ?array
    {
        if (! $notifiable instanceof Contact) {
            return null;
        }

        // Ensure file attachments are loaded
        $this->message->loadMissing('fileAttachments');

        // Generate magic link for the contact
        $magicLink = $this->getMagicLink($notifiable);

        // Get CC contacts for this ticket
        $ccContacts = $this->ticket->ccContacts()
            ->get()
            ->map(fn ($cc) => ['email' => $cc->email, 'name' => $cc->name])
            ->toArray();

        return [
            'view' => 'emails.tickets.agent-reply',
            'subject' => "Re: {$this->ticket->subject}",
            'should_thread' => true, // Thread under customer's original email
            'attachments' => $this->message->fileAttachments ?? collect(),
            'cc' => $ccContacts,
            'data' => [
                'contact' => $notifiable,
                'message' => $this->message,
                'actionUrl' => $magicLink,
            ],
        ];
    }

    /**
     * Get or generate the magic link for the contact.
     */
    private function getMagicLink(Contact $contact): string
    {
        if (! $this->magicLink) {
            $this->magicLink = $this->magicLinkService->getUrlForTicket($contact, $this->ticket);
        }

        return $this->magicLink;
    }
}
