<?php

namespace App\Http\Controllers\Tickets;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketCcContact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CcContactController extends Controller
{
    /**
     * Add a CC contact to a ticket.
     */
    public function store(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $email = strtolower(trim($validated['email']));

        // Check if it's the primary contact
        if ($ticket->contact && strtolower($ticket->contact->email) === $email) {
            return response()->json([
                'message' => 'Het hoofdcontact kan niet als CC worden toegevoegd.',
            ], 422);
        }

        $ccContact = $ticket->addCcContact($validated['email'], $validated['name'] ?? null);

        if (! $ccContact) {
            return response()->json([
                'message' => 'Dit e-mailadres is van een medewerker en kan niet als CC worden toegevoegd.',
            ], 422);
        }

        return response()->json([
            'cc_contact' => [
                'id' => $ccContact->id,
                'email' => $ccContact->email,
                'name' => $ccContact->name,
                'contact_id' => $ccContact->contact_id,
            ],
        ]);
    }

    /**
     * Remove a CC contact from a ticket.
     */
    public function destroy(Ticket $ticket, TicketCcContact $ccContact): JsonResponse
    {
        // Ensure the CC contact belongs to this ticket
        if ($ccContact->ticket_id !== $ticket->id) {
            return response()->json(['message' => 'CC contact not found for this ticket.'], 404);
        }

        $ccContact->delete();

        return response()->json(['success' => true]);
    }
}
