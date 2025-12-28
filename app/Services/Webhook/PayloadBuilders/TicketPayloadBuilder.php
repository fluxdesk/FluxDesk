<?php

namespace App\Services\Webhook\PayloadBuilders;

use App\Models\Priority;
use App\Models\Sla;
use App\Models\Status;
use App\Models\Ticket;
use App\Models\User;

class TicketPayloadBuilder
{
    /**
     * Build payload for ticket created event.
     *
     * @return array<string, mixed>
     */
    public function forCreated(Ticket $ticket): array
    {
        return [
            'ticket' => $this->buildTicketData($ticket),
            'contact' => $this->buildContactData($ticket),
        ];
    }

    /**
     * Build payload for status changed event.
     *
     * @return array<string, mixed>
     */
    public function forStatusChanged(Ticket $ticket, ?Status $oldStatus, ?Status $newStatus): array
    {
        return [
            'ticket' => $this->buildTicketData($ticket),
            'changes' => [
                'status' => [
                    'from' => $oldStatus ? ['id' => $oldStatus->id, 'name' => $oldStatus->name] : null,
                    'to' => $newStatus ? ['id' => $newStatus->id, 'name' => $newStatus->name] : null,
                ],
            ],
        ];
    }

    /**
     * Build payload for priority changed event.
     *
     * @return array<string, mixed>
     */
    public function forPriorityChanged(Ticket $ticket, ?Priority $oldPriority, ?Priority $newPriority): array
    {
        return [
            'ticket' => $this->buildTicketData($ticket),
            'changes' => [
                'priority' => [
                    'from' => $oldPriority ? ['id' => $oldPriority->id, 'name' => $oldPriority->name] : null,
                    'to' => $newPriority ? ['id' => $newPriority->id, 'name' => $newPriority->name] : null,
                ],
            ],
        ];
    }

    /**
     * Build payload for ticket assigned event.
     *
     * @return array<string, mixed>
     */
    public function forAssigned(Ticket $ticket, ?User $oldAssignee, ?User $newAssignee): array
    {
        return [
            'ticket' => $this->buildTicketData($ticket),
            'changes' => [
                'assigned_to' => [
                    'from' => $oldAssignee ? ['id' => $oldAssignee->id, 'name' => $oldAssignee->name, 'email' => $oldAssignee->email] : null,
                    'to' => $newAssignee ? ['id' => $newAssignee->id, 'name' => $newAssignee->name, 'email' => $newAssignee->email] : null,
                ],
            ],
        ];
    }

    /**
     * Build payload for SLA changed event.
     *
     * @return array<string, mixed>
     */
    public function forSlaChanged(Ticket $ticket, ?Sla $oldSla, ?Sla $newSla): array
    {
        return [
            'ticket' => $this->buildTicketData($ticket),
            'changes' => [
                'sla' => [
                    'from' => $oldSla ? ['id' => $oldSla->id, 'name' => $oldSla->name] : null,
                    'to' => $newSla ? ['id' => $newSla->id, 'name' => $newSla->name] : null,
                ],
            ],
        ];
    }

    /**
     * Build the core ticket data.
     *
     * @return array<string, mixed>
     */
    private function buildTicketData(Ticket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'subject' => $ticket->subject,
            'url' => url("/inbox/{$ticket->id}"),
            'status' => $ticket->status ? [
                'id' => $ticket->status->id,
                'name' => $ticket->status->name,
            ] : null,
            'priority' => $ticket->priority ? [
                'id' => $ticket->priority->id,
                'name' => $ticket->priority->name,
            ] : null,
            'assigned_to' => $ticket->assignee ? [
                'id' => $ticket->assignee->id,
                'name' => $ticket->assignee->name,
                'email' => $ticket->assignee->email,
            ] : null,
            'sla' => $ticket->sla ? [
                'id' => $ticket->sla->id,
                'name' => $ticket->sla->name,
            ] : null,
            'department' => $ticket->department ? [
                'id' => $ticket->department->id,
                'name' => $ticket->department->name,
            ] : null,
            'created_at' => $ticket->created_at?->toIso8601String(),
            'updated_at' => $ticket->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Build the contact data.
     *
     * @return array<string, mixed>|null
     */
    private function buildContactData(Ticket $ticket): ?array
    {
        $contact = $ticket->contact;

        if (! $contact) {
            return null;
        }

        return [
            'id' => $contact->id,
            'name' => $contact->name,
            'email' => $contact->email,
        ];
    }
}
