<?php

namespace App\Models;

use App\Integrations\Contracts\Integration;
use App\Integrations\IntegrationManager;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Organization-specific integration configuration.
 *
 * Stores encrypted credentials and status for each integration
 * configured by an organization.
 *
 * @property int $id
 * @property int $organization_id
 * @property string $integration
 * @property array<string, mixed>|null $credentials
 * @property bool $is_active
 * @property bool $is_verified
 * @property \Carbon\Carbon|null $verified_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * @property-read Organization $organization
 */
class OrganizationIntegration extends Model
{
    use BelongsToOrganization;
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'organization_id',
        'integration',
        'credentials',
        'is_active',
        'is_verified',
        'verified_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'credentials' => 'encrypted:array',
            'is_active' => 'boolean',
            'is_verified' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    /**
     * Get the organization that owns this integration.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the integration class instance for this configuration.
     */
    public function getIntegrationInstance(): ?Integration
    {
        return app(IntegrationManager::class)->get($this->integration);
    }

    /**
     * Check if all required credentials are configured.
     */
    public function isConfigured(): bool
    {
        $integration = $this->getIntegrationInstance();

        if (! $integration) {
            return false;
        }

        $credentials = $this->credentials ?? [];

        foreach ($integration->credentialFields() as $field) {
            if ($field['required'] && empty($credentials[$field['name']] ?? null)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Mark this integration as verified (connection test passed).
     */
    public function markAsVerified(): void
    {
        $this->update([
            'is_verified' => true,
            'verified_at' => now(),
        ]);
    }

    /**
     * Mark this integration as unverified (credentials changed or test failed).
     */
    public function markAsUnverified(): void
    {
        $this->update([
            'is_verified' => false,
            'verified_at' => null,
        ]);
    }

    /**
     * Check if this integration can be activated.
     */
    public function canBeActivated(): bool
    {
        return $this->isConfigured() && $this->is_verified;
    }
}
