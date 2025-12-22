<?php

namespace App\Http\Controllers;

use App\Http\Requests\Invitation\RegisterViaInvitationRequest;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class InvitationAcceptController extends Controller
{
    public function show(string $token): Response|RedirectResponse
    {
        $invitation = $this->findInvitation($token);

        if (! $invitation) {
            return Inertia::render('invitations/expired');
        }

        // Already accepted?
        if ($invitation->isAccepted()) {
            return redirect()->route('dashboard')
                ->with('info', 'Deze uitnodiging is al geaccepteerd.');
        }

        // Expired?
        if ($invitation->isExpired()) {
            return Inertia::render('invitations/expired');
        }

        $currentUser = Auth::user();
        $existingUser = User::where('email', $invitation->email)->first();

        // If logged in as different user - show error
        if ($currentUser && strtolower($currentUser->email) !== strtolower($invitation->email)) {
            return Inertia::render('invitations/wrong-account', [
                'invitation' => $this->formatInvitation($invitation),
                'currentUserEmail' => $currentUser->email,
            ]);
        }

        // If logged in as correct user - show accept page
        if ($currentUser) {
            return Inertia::render('invitations/accept', [
                'invitation' => $this->formatInvitation($invitation),
            ]);
        }

        // Not logged in + user exists - prompt login
        if ($existingUser) {
            return Inertia::render('invitations/login-required', [
                'invitation' => $this->formatInvitation($invitation),
            ]);
        }

        // Not logged in + no user - show registration form
        return Inertia::render('invitations/register', [
            'invitation' => $this->formatInvitation($invitation),
        ]);
    }

    public function accept(string $token): RedirectResponse
    {
        $invitation = $this->findValidInvitation($token);

        if (! $invitation) {
            return redirect()->route('login')
                ->with('error', 'Deze uitnodiging is ongeldig of verlopen.');
        }

        $user = Auth::user();

        // Must be logged in as the invited email
        if (! $user || strtolower($user->email) !== strtolower($invitation->email)) {
            abort(403, 'Je bent niet ingelogd met het juiste account.');
        }

        // Already a member?
        if ($invitation->organization->users()->where('user_id', $user->id)->exists()) {
            $invitation->markAsAccepted();

            return redirect()->route('dashboard')
                ->with('info', 'Je bent al lid van deze organisatie.');
        }

        // Add to organization
        $invitation->organization->users()->attach($user->id, [
            'role' => $invitation->role,
            'is_default' => ! $user->organizations()->exists(),
        ]);

        $invitation->markAsAccepted();

        return redirect()->route('dashboard')
            ->with('success', 'Je bent toegevoegd aan '.$invitation->organization->name.'!');
    }

    public function register(RegisterViaInvitationRequest $request, string $token): RedirectResponse
    {
        $invitation = $this->findValidInvitation($token);

        if (! $invitation) {
            return redirect()->route('login')
                ->with('error', 'Deze uitnodiging is ongeldig of verlopen.');
        }

        // Check if user already exists (race condition protection)
        if (User::where('email', $invitation->email)->exists()) {
            return redirect()->route('invitations.show', $token)
                ->with('error', 'Er bestaat al een account met dit e-mailadres. Log in om de uitnodiging te accepteren.');
        }

        // Create user
        $user = User::create([
            'name' => $request->name,
            'email' => strtolower($invitation->email), // Use invitation email
            'password' => Hash::make($request->password),
        ]);

        // Add to organization
        $invitation->organization->users()->attach($user->id, [
            'role' => $invitation->role,
            'is_default' => true,
        ]);

        $invitation->markAsAccepted();

        // Log them in
        Auth::login($user);

        return redirect()->route('dashboard')
            ->with('success', 'Account aangemaakt! Je bent toegevoegd aan '.$invitation->organization->name.'.');
    }

    private function findInvitation(string $token): ?OrganizationInvitation
    {
        return OrganizationInvitation::with(['organization', 'inviter'])
            ->where('token', $token)
            ->first();
    }

    private function findValidInvitation(string $token): ?OrganizationInvitation
    {
        return OrganizationInvitation::with(['organization', 'inviter'])
            ->where('token', $token)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function formatInvitation(OrganizationInvitation $invitation): array
    {
        return [
            'token' => $invitation->token,
            'email' => $invitation->email,
            'role' => $invitation->role,
            'expires_at' => $invitation->expires_at->toIso8601String(),
            'organization' => [
                'name' => $invitation->organization->name,
            ],
            'inviter' => [
                'name' => $invitation->inviter->name,
            ],
        ];
    }
}
