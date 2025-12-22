<?php

namespace App\Http\Controllers\Tickets;

use App\Enums\MessageType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tickets\StoreMessageRequest;
use App\Models\Message;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;

class MessageController extends Controller
{
    public function store(StoreMessageRequest $request, Ticket $ticket): RedirectResponse
    {
        $type = $request->input('type', MessageType::Reply->value);

        Message::create([
            'ticket_id' => $ticket->id,
            'user_id' => auth()->id(),
            'type' => $type,
            'body' => $request->body,
            'is_from_contact' => false,
        ]);

        // Auto-assign ticket to the first person who replies (if not already assigned)
        if ($type === MessageType::Reply->value && $ticket->assigned_to_id === null) {
            $ticket->update([
                'assigned_to_id' => auth()->id(),
            ]);
        }

        return back()->with('success', 'Message sent successfully.');
    }
}
