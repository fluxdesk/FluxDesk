<?php

namespace App\Http\Controllers\Tickets;

use App\Http\Controllers\Controller;
use App\Models\MessageDraft;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DraftController extends Controller
{
    /**
     * Get the current user's draft for a ticket.
     */
    public function show(Ticket $ticket): JsonResponse
    {
        $draft = MessageDraft::where('ticket_id', $ticket->id)
            ->where('user_id', auth()->id())
            ->first();

        if (! $draft) {
            return response()->json(['draft' => null]);
        }

        return response()->json([
            'draft' => [
                'body' => $draft->body,
                'type' => $draft->type->value,
                'updated_at' => $draft->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Save or update the current user's draft for a ticket.
     */
    public function store(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'min:1'],
            'type' => ['sometimes', 'string', 'in:reply,note'],
        ]);

        $draft = MessageDraft::updateOrCreate(
            [
                'ticket_id' => $ticket->id,
                'user_id' => auth()->id(),
            ],
            [
                'body' => $validated['body'],
                'type' => $validated['type'] ?? 'reply',
            ]
        );

        return response()->json([
            'draft' => [
                'body' => $draft->body,
                'type' => $draft->type->value,
                'updated_at' => $draft->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Delete the current user's draft for a ticket.
     */
    public function destroy(Ticket $ticket): JsonResponse
    {
        MessageDraft::where('ticket_id', $ticket->id)
            ->where('user_id', auth()->id())
            ->delete();

        return response()->json(['success' => true]);
    }
}
