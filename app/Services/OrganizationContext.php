<?php

namespace App\Services;

use App\Models\Organization;
use Carbon\Carbon;

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

    /**
     * Get the organization's timezone.
     */
    public function timezone(): string
    {
        return $this->organization?->settings?->timezone ?? 'UTC';
    }

    /**
     * Format a Carbon date using the organization's timezone.
     */
    public function formatDate(Carbon $date, string $format = 'd M Y H:i'): string
    {
        return $date->copy()->setTimezone($this->timezone())->format($format);
    }

    /**
     * Convert a Carbon date to the organization's timezone.
     */
    public function toTimezone(Carbon $date): Carbon
    {
        return $date->copy()->setTimezone($this->timezone());
    }
}
