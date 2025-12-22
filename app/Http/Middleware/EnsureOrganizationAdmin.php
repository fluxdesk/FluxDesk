<?php

namespace App\Http\Middleware;

use App\Services\OrganizationContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationAdmin
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

        // Super admins can access any organization admin routes
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $organization = $this->context->get();

        if (! $organization) {
            abort(403, 'No organization context available.');
        }

        if (! $user->isAdminOf($organization)) {
            abort(403, 'You must be an administrator of this organization.');
        }

        return $next($request);
    }
}
