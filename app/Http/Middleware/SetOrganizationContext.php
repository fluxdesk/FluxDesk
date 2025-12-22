<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use App\Services\OrganizationContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetOrganizationContext
{
    public function __construct(
        protected OrganizationContext $context
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Check if organization is specified in the route
        $organizationSlug = $request->route('organization');

        if ($organizationSlug instanceof Organization) {
            $organization = $organizationSlug;
        } elseif ($organizationSlug) {
            $organization = Organization::where('slug', $organizationSlug)->first();
        } else {
            $organization = null;

            // Check session for current organization
            $organizationId = $request->session()->get('current_organization_id');

            if ($organizationId) {
                $organization = Organization::find($organizationId);
            }

            // Fall back to user's default organization
            if (! $organization) {
                $organization = $user->defaultOrganization();
            }

            // Fall back to system default organization
            if (! $organization) {
                $organization = Organization::systemDefault();
            }
        }

        if ($organization && ($user->isSuperAdmin() || $user->belongsToOrganization($organization))) {
            $this->context->set($organization);
            $request->session()->put('current_organization_id', $organization->id);
        }

        return $next($request);
    }
}
