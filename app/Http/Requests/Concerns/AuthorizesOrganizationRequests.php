<?php

namespace App\Http\Requests\Concerns;

use App\Services\OrganizationContext;

trait AuthorizesOrganizationRequests
{
    /**
     * Check if the authenticated user is an admin of the current organization.
     */
    protected function isOrganizationAdmin(): bool
    {
        $user = $this->user();
        $org = app(OrganizationContext::class)->organization();

        if (! $user || ! $org) {
            return false;
        }

        return $user->isAdminOf($org) || $user->isSuperAdmin();
    }

    /**
     * Check if the authenticated user is a member of the current organization.
     */
    protected function isOrganizationMember(): bool
    {
        $user = $this->user();
        $org = app(OrganizationContext::class)->organization();

        if (! $user || ! $org) {
            return false;
        }

        return $user->belongsToOrganization($org);
    }
}
