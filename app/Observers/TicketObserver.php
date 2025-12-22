<?php

namespace App\Observers;

use App\Jobs\SendTicketNotificationJob;
use App\Models\Contact;
use App\Models\Organization;
use App\Models\Priority;
use App\Models\Sla;
use App\Models\Status;
use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Models\TicketFolder;
use App\Services\NotificationService;
use App\Services\OrganizationContext;

class TicketObserver
{
    public function creating(Ticket $ticket): void
    {
        // Generate ticket number if not set
        if (empty($ticket->ticket_number)) {
            // Try to get organization from context first (web requests),
            // then fall back to loading it from the ticket's organization_id (queued jobs)
            $organization = app(OrganizationContext::class)->get();

            if (! $organization && $ticket->organization_id) {
                $organization = Organization::with('settings')->find($ticket->organization_id);
            }

            if ($organization?->settings) {
                $ticket->ticket_number = $organization->settings->generateTicketNumber();
            }
        }

        // Set default status if not set
        if (empty($ticket->status_id)) {
            $defaultStatus = Status::where('is_default', true)->first();
            if ($defaultStatus) {
                $ticket->status_id = $defaultStatus->id;
            }
        }

        // Set default priority if not set
        if (empty($ticket->priority_id)) {
            $defaultPriority = Priority::where('is_default', true)->first();
            if ($defaultPriority) {
                $ticket->priority_id = $defaultPriority->id;
            }
        }

        // Set SLA if not set - check contact's SLA first, then fall back to default
        if (empty($ticket->sla_id)) {
            // First, check if the contact has a custom SLA
            if ($ticket->contact_id) {
                $contact = Contact::withoutGlobalScopes()->find($ticket->contact_id);
                if ($contact?->sla_id) {
                    $ticket->sla_id = $contact->sla_id;
                }
            }

            // If still no SLA, use the organization default
            if (empty($ticket->sla_id)) {
                $defaultSla = Sla::where('is_default', true)->first();
                if ($defaultSla) {
                    $ticket->sla_id = $defaultSla->id;
                }
            }
        }

        // Calculate SLA due dates
        $this->calculateSlaDueDates($ticket);
    }

    public function created(Ticket $ticket): void
    {
        // Log ticket creation activity
        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => auth()->id(),
            'type' => 'created',
            'properties' => null,
        ]);

        // Dispatch notification job (handles email import check internally)
        SendTicketNotificationJob::dispatch($ticket);
    }

    public function updated(Ticket $ticket): void
    {
        // Log status change
        if ($ticket->wasChanged('status_id')) {
            $oldStatus = Status::withoutGlobalScopes()->find($ticket->getOriginal('status_id'));
            $newStatus = $ticket->status;

            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id' => auth()->id(),
                'type' => 'status_changed',
                'properties' => [
                    'old' => $oldStatus?->name,
                    'new' => $newStatus?->name,
                ],
            ]);

            // Track resolved/closed timestamps and auto-move to Solved folder
            if ($newStatus?->is_closed && empty($ticket->resolved_at)) {
                $ticket->resolved_at = now();

                // Auto-move to Solved folder
                $solvedFolder = TicketFolder::withoutGlobalScopes()
                    ->where('organization_id', $ticket->organization_id)
                    ->where('system_type', 'solved')
                    ->first();

                if ($solvedFolder) {
                    $ticket->folder_id = $solvedFolder->id;
                }

                $ticket->saveQuietly();
            }
        }

        // Log priority change
        if ($ticket->wasChanged('priority_id')) {
            $oldPriority = Priority::withoutGlobalScopes()->find($ticket->getOriginal('priority_id'));
            $newPriority = $ticket->priority;

            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id' => auth()->id(),
                'type' => 'priority_changed',
                'properties' => [
                    'old' => $oldPriority?->name,
                    'new' => $newPriority?->name,
                ],
            ]);
        }

        // Log assignment change and notify assignee
        if ($ticket->wasChanged('assigned_to')) {
            $oldAssignee = $ticket->getOriginal('assigned_to')
                ? \App\Models\User::find($ticket->getOriginal('assigned_to'))
                : null;
            $newAssignee = $ticket->assignee;

            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id' => auth()->id(),
                'type' => 'assigned',
                'properties' => [
                    'old' => $oldAssignee?->name,
                    'new' => $newAssignee?->name,
                ],
            ]);

            // Notify the new assignee
            if ($ticket->assigned_to) {
                $assignedBy = auth()->user();
                app(NotificationService::class)->notifyTicketAssigned($ticket, $assignedBy);
            }
        }

        // Log SLA change and recalculate due dates
        if ($ticket->wasChanged('sla_id')) {
            $oldSla = Sla::withoutGlobalScopes()->find($ticket->getOriginal('sla_id'));
            $newSla = $ticket->sla;

            $this->calculateSlaDueDates($ticket);
            $ticket->saveQuietly();

            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'user_id' => auth()->id(),
                'type' => 'sla_changed',
                'properties' => [
                    'old' => $oldSla?->name,
                    'new' => $newSla?->name,
                ],
            ]);
        }
    }

    protected function calculateSlaDueDates(Ticket $ticket): void
    {
        $sla = $ticket->sla_id
            ? Sla::withoutGlobalScopes()->find($ticket->sla_id)
            : null;

        if (! $sla) {
            return;
        }

        $baseTime = $ticket->created_at ?? now();

        if ($sla->first_response_hours && empty($ticket->first_response_at)) {
            $ticket->sla_first_response_due_at = $baseTime->copy()->addHours($sla->first_response_hours);
        }

        if ($sla->resolution_hours) {
            $ticket->sla_resolution_due_at = $baseTime->copy()->addHours($sla->resolution_hours);
        }
    }
}
