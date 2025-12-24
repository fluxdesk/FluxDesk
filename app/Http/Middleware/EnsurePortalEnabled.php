<?php

namespace App\Http\Middleware;

use App\Services\PortalOrganizationContext;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsurePortalEnabled
{
    public function __construct(
        protected PortalOrganizationContext $context
    ) {}

    /**
     * Handle an incoming request.
     *
     * Check if the customer portal is enabled for this organization.
     * If not, show a friendly disabled message.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $organization = $this->context->get();

        if (! $organization) {
            abort(404, 'Organisatie niet gevonden.');
        }

        $settings = $organization->settings;

        // Check if portal is enabled (defaults to true if not set)
        if ($settings && ! $settings->isPortalEnabled()) {
            return Inertia::render('portal/disabled', [
                'organization' => $organization->only(['id', 'name', 'slug']),
            ])->toResponse($request);
        }

        return $next($request);
    }
}
