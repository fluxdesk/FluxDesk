<?php

namespace App\Http\Middleware;

use App\Services\PortalOrganizationContext;
use App\Services\TenantResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetPortalOrganizationContext
{
    public function __construct(
        protected PortalOrganizationContext $context,
        protected TenantResolver $resolver
    ) {}

    /**
     * Handle an incoming request.
     *
     * Uses TenantResolver to resolve organization from:
     * 1. URL slug parameter
     * 2. Future: Custom domain
     * 3. System default (fallback)
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $organization = $this->resolver->resolve($request);

        if (! $organization) {
            abort(404, 'Organisatie niet gevonden.');
        }

        // Set in context service
        $this->context->set($organization);

        return $next($request);
    }
}
