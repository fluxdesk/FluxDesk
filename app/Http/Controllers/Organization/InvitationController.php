<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StoreInvitationRequest;
use App\Jobs\SendInvitationEmail;
use App\Models\OrganizationInvitation;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;

class InvitationController extends Controller
{
    public function __construct(private OrganizationContext $organizationContext) {}

    public function store(StoreInvitationRequest $request): RedirectResponse
    {
        $organization = $this->organizationContext->organization();

        $invitation = $organization->invitations()->create([
            'invited_by' => auth()->id(),
            'email' => strtolower($request->email),
            'role' => $request->role,
        ]);

        // Dispatch job to send invitation email
        SendInvitationEmail::dispatch($invitation);

        return back()->with('success', 'Uitnodiging verzonden naar '.$invitation->email);
    }

    public function destroy(OrganizationInvitation $invitation): RedirectResponse
    {
        $organization = $this->organizationContext->organization();

        // Ensure invitation belongs to current organization
        if ($invitation->organization_id !== $organization->id) {
            abort(403);
        }

        $invitation->delete();

        return back()->with('success', 'Uitnodiging ingetrokken.');
    }

    public function resend(OrganizationInvitation $invitation): RedirectResponse
    {
        $organization = $this->organizationContext->organization();

        // Ensure invitation belongs to current organization
        if ($invitation->organization_id !== $organization->id) {
            abort(403);
        }

        // Reset expiration
        $invitation->update([
            'expires_at' => now()->addDays(7),
        ]);

        // Dispatch job to resend invitation email
        SendInvitationEmail::dispatch($invitation);

        return back()->with('success', 'Uitnodiging opnieuw verzonden.');
    }
}
