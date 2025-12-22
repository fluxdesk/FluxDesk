<?php

namespace App\Http\Controllers\Portal;

use App\Enums\MessageType;
use App\Enums\TicketChannel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\PortalStoreTicketRequest;
use App\Models\Message;
use App\Models\Organization;
use App\Models\Priority;
use App\Models\Status;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PortalTicketController extends Controller
{
    /**
     * Show ticket detail with messages.
     */
    public function show(Organization $organization, Ticket $ticket): Response
    {
        $contact = Auth::guard('contact')->user();

        // Ensure contact owns this ticket
        if ($ticket->contact_id !== $contact->id) {
            abort(403);
        }

        $ticket->load([
            'status',
            'priority',
            'messages' => fn ($q) => $q->where('type', MessageType::Reply)
                ->with(['user', 'contact', 'fileAttachments'])
                ->orderBy('created_at'),
        ]);

        return Inertia::render('portal/tickets/show', [
            'ticket' => $ticket,
        ]);
    }

    /**
     * Reply to a ticket.
     */
    public function reply(Request $request, Organization $organization, Ticket $ticket): RedirectResponse
    {
        $contact = Auth::guard('contact')->user();

        if ($ticket->contact_id !== $contact->id) {
            abort(403);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'min:1'],
        ]);

        Message::create([
            'ticket_id' => $ticket->id,
            'contact_id' => $contact->id,
            'type' => MessageType::Reply,
            'body' => $validated['body'],
            'is_from_contact' => true,
        ]);

        // Touch the ticket to update timestamps
        $ticket->touch();

        return back()->with('success', 'Bericht verzonden.');
    }

    /**
     * Show create ticket form.
     */
    public function create(Organization $organization): Response
    {
        return Inertia::render('portal/tickets/create');
    }

    /**
     * Store a new ticket.
     */
    public function store(PortalStoreTicketRequest $request, Organization $organization): RedirectResponse
    {
        $contact = Auth::guard('contact')->user();

        // Get default status and priority
        $defaultStatus = Status::where('organization_id', $organization->id)
            ->where('is_default', true)
            ->first();

        $defaultPriority = Priority::where('organization_id', $organization->id)
            ->where('is_default', true)
            ->first();

        $ticket = Ticket::create([
            'organization_id' => $organization->id,
            'subject' => $request->subject,
            'contact_id' => $contact->id,
            'status_id' => $defaultStatus?->id,
            'priority_id' => $defaultPriority?->id,
            'channel' => TicketChannel::Web,
        ]);

        // Create initial message
        Message::create([
            'ticket_id' => $ticket->id,
            'contact_id' => $contact->id,
            'type' => MessageType::Reply,
            'body' => $request->message,
            'is_from_contact' => true,
        ]);

        return redirect()->route('portal.tickets.show', [
            'organization' => $organization->slug,
            'ticket' => $ticket,
        ])->with('success', 'Ticket aangemaakt.');
    }
}
