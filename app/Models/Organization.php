<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Organization extends Model
{
    /** @use HasFactory<\Database\Factories\OrganizationFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'slug',
        'is_active',
        'is_system_default',
    ];

    /**
     * Temporary property to pass the initial locale to the OrganizationObserver.
     * This is not persisted to the database.
     */
    public ?string $initialLocale = null;

    protected static function booted(): void
    {
        static::creating(function (Organization $organization) {
            if (empty($organization->uuid)) {
                $organization->uuid = (string) Str::uuid();
            }

            if (empty($organization->slug)) {
                $organization->slug = Str::slug($organization->name);
            }
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_system_default' => 'boolean',
        ];
    }

    /**
     * Get the system default organization.
     */
    public static function systemDefault(): ?Organization
    {
        return static::where('is_system_default', true)->first();
    }

    /**
     * Mark this organization as the system default.
     * Removes the default flag from any other organization.
     */
    public function markAsSystemDefault(): void
    {
        // Remove default from all others
        static::where('is_system_default', true)
            ->where('id', '!=', $this->id)
            ->update(['is_system_default' => false]);

        $this->update(['is_system_default' => true]);
    }

    /**
     * Remove the system default flag from this organization.
     */
    public function unmarkAsSystemDefault(): void
    {
        $this->update(['is_system_default' => false]);
    }

    public function settings(): HasOne
    {
        return $this->hasOne(OrganizationSettings::class);
    }

    public function aiSettings(): HasOne
    {
        return $this->hasOne(OrganizationAISettings::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['role', 'is_default'])
            ->withTimestamps();
    }

    public function admins(): BelongsToMany
    {
        return $this->users()->wherePivot('role', UserRole::Admin->value);
    }

    public function agents(): BelongsToMany
    {
        return $this->users()->wherePivot('role', UserRole::Agent->value);
    }

    public function emailChannels(): HasMany
    {
        return $this->hasMany(EmailChannel::class);
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(OrganizationInvitation::class);
    }

    public function pendingInvitations(): HasMany
    {
        return $this->invitations()->pending();
    }

    public function integrations(): HasMany
    {
        return $this->hasMany(OrganizationIntegration::class);
    }

    /**
     * Get a specific integration configuration by identifier.
     */
    public function integration(string $identifier): ?OrganizationIntegration
    {
        return $this->integrations()->where('integration', $identifier)->first();
    }

    /**
     * Check if the organization has an active and verified integration.
     */
    public function hasActiveIntegration(string $identifier): bool
    {
        return $this->integrations()
            ->where('integration', $identifier)
            ->where('is_active', true)
            ->where('is_verified', true)
            ->exists();
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
