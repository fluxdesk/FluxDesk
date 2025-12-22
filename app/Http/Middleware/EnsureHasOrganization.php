<?php

namespace App\Http\Middleware;

use App\Services\OrganizationContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHasOrganization
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

        // Check if user has any organizations
        if ($user->organizations()->count() === 0) {
            return redirect()->route('onboarding.organization');
        }

        // Check if organization context is set
        if (! $this->context->has()) {
            // Try to set from user's default
            $organization = $user->defaultOrganization() ?? $user->organizations()->first();

            if ($organization) {
                $this->context->set($organization);
                $request->session()->put('current_organization_id', $organization->id);
            } else {
                return redirect()->route('onboarding.organization');
            }
        }

        return $next($request);
    }
}
