<?php

namespace App\Services;

use App\Models\Organization;

class PortalOrganizationContext
{
    protected ?Organization $organization = null;

    public function set(Organization $organization): void
    {
        $this->organization = $organization;
    }

    public function get(): ?Organization
    {
        return $this->organization;
    }

    public function has(): bool
    {
        return $this->organization !== null;
    }

    public function require(): Organization
    {
        if ($this->organization === null) {
            throw new \RuntimeException('No portal organization context has been set.');
        }

        return $this->organization;
    }
}
