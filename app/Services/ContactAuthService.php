<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\ContactAuthToken;
use App\Models\Organization;
use App\Notifications\Portal\PortalLoginNotification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ContactAuthService
{
    /**
     * Send a magic login link to the contact's email.
     * Returns true always to prevent email enumeration.
     */
    public function sendLoginLink(string $email, Organization $organization): bool
    {
        $contact = Contact::where('email', strtolower($email))
            ->where('organization_id', $organization->id)
            ->first();

        if (! $contact) {
            // Don't reveal if contact exists - always return true
            return true;
        }

        $token = $this->createAuthToken($contact, $organization);
        $contact->notify(new PortalLoginNotification($token, $organization));

        return true;
    }

    /**
     * Create a new authentication token for the contact.
     */
    public function createAuthToken(Contact $contact, Organization $organization): string
    {
        // Invalidate any existing unused tokens for this contact
        ContactAuthToken::where('contact_id', $contact->id)
            ->where('organization_id', $organization->id)
            ->whereNull('used_at')
            ->delete();

        $token = hash('sha256', Str::random(40));

        ContactAuthToken::create([
            'contact_id' => $contact->id,
            'organization_id' => $organization->id,
            'token' => $token,
            'expires_at' => now()->addHour(), // 1 hour expiry for security
        ]);

        return $token;
    }

    /**
     * Validate a token and return the auth token model if valid.
     */
    public function validateToken(string $token): ?ContactAuthToken
    {
        $authToken = ContactAuthToken::with(['contact', 'organization'])
            ->where('token', $token)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        return $authToken;
    }

    /**
     * Log in the contact using the session guard.
     */
    public function loginContact(Contact $contact, bool $remember = true): void
    {
        Auth::guard('contact')->login($contact, $remember);
    }

    /**
     * Log out the current contact.
     */
    public function logout(): void
    {
        Auth::guard('contact')->logout();

        request()->session()->invalidate();
        request()->session()->regenerateToken();
    }

    /**
     * Get the currently authenticated contact.
     */
    public function contact(): ?Contact
    {
        return Auth::guard('contact')->user();
    }

    /**
     * Check if a contact is authenticated.
     */
    public function check(): bool
    {
        return Auth::guard('contact')->check();
    }
}
