<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use App\Services\PortalOrganizationContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetPortalOrganizationContext
{
    public function __construct(
        protected PortalOrganizationContext $context
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $organizationParam = $request->route('organization');

        // Route model binding may have already resolved it
        if ($organizationParam instanceof Organization) {
            $organization = $organizationParam;
        } else {
            // Look up by slug
            $organization = Organization::where('slug', $organizationParam)->first();

            if (! $organization) {
                abort(404, 'Organisatie niet gevonden.');
            }
        }

        // Set in context service
        $this->context->set($organization);

        return $next($request);
    }
}
