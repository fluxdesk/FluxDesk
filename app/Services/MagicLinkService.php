<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\ContactAccessToken;
use App\Models\Ticket;
use Illuminate\Support\Str;

class MagicLinkService
{
    public function generateForTicket(Contact $contact, Ticket $ticket): string
    {
        // Revoke any existing tokens for this contact/ticket combo
        ContactAccessToken::where('contact_id', $contact->id)
            ->where('ticket_id', $ticket->id)
            ->delete();

        $token = hash('sha256', Str::random(40));

        ContactAccessToken::create([
            'contact_id' => $contact->id,
            'ticket_id' => $ticket->id,
            'token' => $token,
            'expires_at' => now()->addDays(30),
        ]);

        return $token;
    }

    public function getUrlForTicket(Contact $contact, Ticket $ticket): string
    {
        $token = $this->generateForTicket($contact, $ticket);

        return route('tickets.magic-link', ['token' => $token]);
    }

    public function validateToken(string $token): ?array
    {
        $accessToken = ContactAccessToken::with(['contact', 'ticket'])
            ->where('token', $token)
            ->where('expires_at', '>', now())
            ->whereNull('last_used_at')
            ->first();

        if (! $accessToken || ! $accessToken->isValid()) {
            return null;
        }

        $accessToken->markUsed();

        return [
            'contact' => $accessToken->contact,
            'ticket' => $accessToken->ticket,
            'token' => $accessToken,
        ];
    }

    public function revokeTokensForTicket(Ticket $ticket): void
    {
        ContactAccessToken::where('ticket_id', $ticket->id)->delete();
    }

    public function revokeTokensForContact(Contact $contact): void
    {
        ContactAccessToken::where('contact_id', $contact->id)->delete();
    }
}
