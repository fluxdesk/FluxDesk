<?php

namespace App\Services\Webhook;

use App\Enums\WebhookEvent;
use App\Jobs\DispatchWebhookJob;
use App\Models\Message;
use App\Models\Priority;
use App\Models\Sla;
use App\Models\Status;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Webhook;
use App\Services\Webhook\PayloadBuilders\MessagePayloadBuilder;
use App\Services\Webhook\PayloadBuilders\TicketPayloadBuilder;

class WebhookDispatcher
{
    public function __construct(
        private TicketPayloadBuilder $ticketPayloadBuilder,
        private MessagePayloadBuilder $messagePayloadBuilder,
    ) {}

    /**
     * Dispatch webhook for ticket created event.
     */
    public function ticketCreated(Ticket $ticket): void
    {
        $this->dispatch(
            $ticket->organization_id,
            WebhookEvent::TicketCreated,
            $this->ticketPayloadBuilder->forCreated($ticket)
        );
    }

    /**
     * Dispatch webhook for ticket status changed event.
     */
    public function ticketStatusChanged(Ticket $ticket, ?Status $oldStatus, ?Status $newStatus): void
    {
        $this->dispatch(
            $ticket->organization_id,
            WebhookEvent::TicketStatusChanged,
            $this->ticketPayloadBuilder->forStatusChanged($ticket, $oldStatus, $newStatus)
        );
    }

    /**
     * Dispatch webhook for ticket priority changed event.
     */
    public function ticketPriorityChanged(Ticket $ticket, ?Priority $oldPriority, ?Priority $newPriority): void
    {
        $this->dispatch(
            $ticket->organization_id,
            WebhookEvent::TicketPriorityChanged,
            $this->ticketPayloadBuilder->forPriorityChanged($ticket, $oldPriority, $newPriority)
        );
    }

    /**
     * Dispatch webhook for ticket assigned event.
     */
    public function ticketAssigned(Ticket $ticket, ?User $oldAssignee, ?User $newAssignee): void
    {
        $this->dispatch(
            $ticket->organization_id,
            WebhookEvent::TicketAssigned,
            $this->ticketPayloadBuilder->forAssigned($ticket, $oldAssignee, $newAssignee)
        );
    }

    /**
     * Dispatch webhook for ticket SLA changed event.
     */
    public function ticketSlaChanged(Ticket $ticket, ?Sla $oldSla, ?Sla $newSla): void
    {
        $this->dispatch(
            $ticket->organization_id,
            WebhookEvent::TicketSlaChanged,
            $this->ticketPayloadBuilder->forSlaChanged($ticket, $oldSla, $newSla)
        );
    }

    /**
     * Dispatch webhook for message created event.
     */
    public function messageCreated(Message $message): void
    {
        $this->dispatch(
            $message->ticket->organization_id,
            WebhookEvent::MessageCreated,
            $this->messagePayloadBuilder->forCreated($message)
        );
    }

    /**
     * Dispatch webhook for customer reply received event.
     */
    public function replyReceived(Message $message): void
    {
        $this->dispatch(
            $message->ticket->organization_id,
            WebhookEvent::ReplyReceived,
            $this->messagePayloadBuilder->forReplyReceived($message)
        );
    }

    /**
     * Dispatch webhooks to all active subscribers for the event.
     *
     * @param  array<string, mixed>  $payload
     */
    private function dispatch(int $organizationId, WebhookEvent $event, array $payload): void
    {
        $webhooks = Webhook::withoutGlobalScopes()
            ->where('organization_id', $organizationId)
            ->where('is_active', true)
            ->get()
            ->filter(fn (Webhook $webhook) => $webhook->subscribesToEvent($event));

        foreach ($webhooks as $webhook) {
            DispatchWebhookJob::dispatch($webhook, $event, $payload);
        }
    }
}
