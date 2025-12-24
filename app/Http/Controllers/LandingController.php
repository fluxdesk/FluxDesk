<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\TenantResolver;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    public function __construct(
        protected TenantResolver $resolver
    ) {}

    /**
     * Show the organization landing page.
     *
     * Handles both:
     * - Root URL (/) - resolves to default tenant
     * - Tenant URL (/{slug}) - resolves to specific tenant
     */
    public function show(Request $request, ?Organization $organization = null): Response
    {
        // If no org provided (root URL), resolve from request
        if (! $organization) {
            $organization = $this->resolver->resolve($request);
        }

        if (! $organization) {
            abort(404, 'Geen standaard organisatie geconfigureerd.');
        }

        $organization->load('settings');

        return Inertia::render('landing', [
            'organization' => $organization,
            'portalEnabled' => $organization->settings?->isPortalEnabled() ?? true,
        ]);
    }
}
