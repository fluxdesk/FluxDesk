<?php

namespace App\Http\Middleware;

use App\Services\OrganizationContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationMember
{
    public function __construct(
        protected OrganizationContext $context
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        // Super admins can access any organization
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $organization = $this->context->get();

        if (! $organization) {
            // No organization context set, try to get user's default
            $organization = $user->defaultOrganization();

            if (! $organization) {
                // User has no organization membership
                abort(403, 'You are not a member of any organization.');
            }

            $this->context->set($organization);
        }

        if (! $user->belongsToOrganization($organization)) {
            abort(403, 'You are not a member of this organization.');
        }

        return $next($request);
    }
}
