<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use App\Services\PortalOrganizationContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureContactAuthenticated
{
    public function __construct(
        protected PortalOrganizationContext $portalContext
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $contact = Auth::guard('contact')->user();

        // Get organization from context or directly from route
        $organization = $this->portalContext->get();
        if (! $organization) {
            $orgParam = $request->route('organization');
            if ($orgParam instanceof Organization) {
                $organization = $orgParam;
            } elseif (is_string($orgParam)) {
                $organization = Organization::where('slug', $orgParam)->first();
            }
        }

        // No organization found - can't redirect properly
        if (! $organization) {
            abort(404, 'Organisatie niet gevonden.');
        }

        // Not logged in at all
        if (! $contact) {
            return redirect()->route('portal.login', ['organization' => $organization->slug]);
        }

        // Logged in but for a different organization
        if ($contact->organization_id !== $organization->id) {
            // Log them out and redirect to login for this org
            Auth::guard('contact')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('portal.login', ['organization' => $organization->slug])
                ->with('error', 'Je bent ingelogd bij een andere organisatie. Log opnieuw in.');
        }

        return $next($request);
    }
}
