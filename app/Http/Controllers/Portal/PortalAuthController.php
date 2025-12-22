<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\PortalLoginRequest;
use App\Models\Organization;
use App\Services\ContactAuthService;
use App\Services\PortalOrganizationContext;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PortalAuthController extends Controller
{
    public function __construct(
        private ContactAuthService $authService,
        private PortalOrganizationContext $portalContext
    ) {}

    /**
     * Show the login form.
     */
    public function showLogin(Organization $organization): Response
    {
        return Inertia::render('portal/login', [
            'status' => session('status'),
            'error' => session('error'),
        ]);
    }

    /**
     * Send the magic login link.
     */
    public function sendMagicLink(PortalLoginRequest $request, Organization $organization): RedirectResponse
    {
        // Use the organization from the URL - scopes the contact lookup
        $this->authService->sendLoginLink($request->email, $organization);

        return back()->with('status', 'magic-link-sent');
    }

    /**
     * Authenticate via magic link token.
     */
    public function authenticate(Organization $organization, string $token): RedirectResponse
    {
        $authToken = $this->authService->validateToken($token);

        if (! $authToken || ! $authToken->isValid()) {
            return redirect()->route('portal.login', ['organization' => $organization->slug])
                ->with('error', 'Deze link is ongeldig of verlopen.');
        }

        // Verify the token is for this organization
        if ($authToken->organization_id !== $organization->id) {
            return redirect()->route('portal.login', ['organization' => $organization->slug])
                ->with('error', 'Deze link is ongeldig.');
        }

        // Mark token as used
        $authToken->markAsUsed();

        // Log the contact in
        $this->authService->loginContact($authToken->contact);

        return redirect()->route('portal.dashboard', ['organization' => $organization->slug]);
    }

    /**
     * Log the contact out.
     */
    public function logout(Organization $organization): RedirectResponse
    {
        $this->authService->logout();

        return redirect()->route('portal.login', ['organization' => $organization->slug])
            ->with('status', 'logged-out');
    }
}
