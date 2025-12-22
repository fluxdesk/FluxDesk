<?php

namespace App\Http\Controllers;

use App\Enums\MessageType;
use App\Models\Message;
use App\Services\ContactAuthService;
use App\Services\MagicLinkService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MagicLinkController extends Controller
{
    public function __construct(
        private MagicLinkService $magicLinkService,
        private ContactAuthService $contactAuthService,
    ) {}

    public function show(string $token): Response|RedirectResponse
    {
        $result = $this->magicLinkService->validateToken($token);

        if (! $result) {
            return Inertia::render('tickets/link-expired');
        }

        $ticket = $result['ticket']->load('organization');
        $contact = $result['contact'];
        $organization = $ticket->organization;

        // Log the contact in to the portal
        $this->contactAuthService->loginContact($contact);

        // Redirect to the portal ticket view
        return redirect()->route('portal.tickets.show', [
            'organization' => $organization->slug,
            'ticket' => $ticket->id,
        ]);
    }

    public function reply(Request $request, string $token)
    {
        $result = $this->magicLinkService->validateToken($token);

        if (! $result) {
            return response()->json(['error' => 'Invalid or expired link'], 403);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'min:1'],
        ]);

        $ticket = $result['ticket'];
        $contact = $result['contact'];

        Message::create([
            'ticket_id' => $ticket->id,
            'contact_id' => $contact->id,
            'type' => MessageType::Reply,
            'body' => $validated['body'],
            'is_from_contact' => true,
        ]);

        return back()->with('success', 'Bericht verzonden.');
    }
}
