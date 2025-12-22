<?php

namespace App\Services;

use App\Models\Organization;

class OrganizationContext
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

    /**
     * Alias for get() - returns the current organization.
     */
    public function organization(): ?Organization
    {
        return $this->organization;
    }

    public function id(): ?int
    {
        return $this->organization?->id;
    }

    public function has(): bool
    {
        return $this->organization !== null;
    }

    public function clear(): void
    {
        $this->organization = null;
    }

    public function require(): Organization
    {
        if ($this->organization === null) {
            throw new \RuntimeException('No organization context has been set.');
        }

        return $this->organization;
    }
}
