<?php

namespace App\Notifications\Tickets;

use App\Models\Contact;
use App\Models\Ticket;
use App\Services\MagicLinkService;
use App\Services\SlaAverageReplyTimeService;

/**
 * Notification sent to the contact when their ticket has been received.
 *
 * This confirms to the contact that their support request has been
 * successfully created and provides them with a magic link to view it.
 */
class TicketReceivedNotification extends BaseTicketNotification
{
    private ?string $magicLink = null;

    public function __construct(
        Ticket $ticket,
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

        // Generate magic link for the contact
        $magicLink = $this->getMagicLink($notifiable);

        // Get first message if available
        $firstMessage = $this->ticket->messages()->orderBy('created_at', 'asc')->first();

        // Determine if ticket was created by an agent (has user_id on first message)
        $createdByAgent = $firstMessage && $firstMessage->user_id !== null;

        // Get SLA data if sharing is enabled
        $slaData = $this->getSlaData();
        $averageReplyTime = $this->getAverageReplyTime();

        return [
            'view' => 'emails.tickets.ticket-received',
            'subject' => "Ticket ontvangen: {$this->ticket->subject}",
            'should_thread' => true, // Thread under customer's original email
            'data' => [
                'contact' => $notifiable,
                'message' => $firstMessage,
                'actionUrl' => $magicLink,
                'slaData' => $slaData,
                'averageReplyTime' => $averageReplyTime,
                'createdByAgent' => $createdByAgent,
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

    /**
     * Get SLA data if sharing is enabled in organization settings.
     *
     * @return array{first_response_due: \Carbon\Carbon|null, resolution_due: \Carbon\Carbon|null}|null
     */
    private function getSlaData(): ?array
    {
        $settings = $this->ticket->organization?->settings;

        if (! $settings?->share_sla_times_with_contacts) {
            return null;
        }

        return [
            'first_response_due' => $this->ticket->sla_first_response_due_at,
            'resolution_due' => $this->ticket->sla_resolution_due_at,
        ];
    }

    /**
     * Get the average reply time if sharing is enabled in organization settings.
     */
    private function getAverageReplyTime(): ?string
    {
        $settings = $this->ticket->organization?->settings;

        if (! $settings?->share_average_reply_time) {
            return null;
        }

        $organization = $this->ticket->organization;
        $priority = $this->ticket->priority;

        if (! $organization) {
            return null;
        }

        return app(SlaAverageReplyTimeService::class)
            ->getFormattedAverage($organization, $priority);
    }
}
