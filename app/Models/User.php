<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Services\OrganizationContext;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'is_super_admin',
        'avatar_path',
        'locale',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_super_admin' => 'boolean',
        ];
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class)
            ->withPivot(['role', 'is_default'])
            ->withTimestamps();
    }

    public function defaultOrganization(): ?Organization
    {
        return $this->organizations()
            ->wherePivot('is_default', true)
            ->first();
    }

    public function currentOrganization(): ?Organization
    {
        return app(OrganizationContext::class)->get() ?? $this->defaultOrganization();
    }

    public function belongsToOrganization(Organization $organization): bool
    {
        return $this->organizations()->where('organizations.id', $organization->id)->exists();
    }

    public function roleInOrganization(Organization $organization): ?UserRole
    {
        $membership = $this->organizations()
            ->where('organizations.id', $organization->id)
            ->first();

        if (! $membership) {
            return null;
        }

        return UserRole::tryFrom($membership->pivot->role);
    }

    public function isAdminOf(Organization $organization): bool
    {
        return $this->roleInOrganization($organization) === UserRole::Admin;
    }

    public function isSuperAdmin(): bool
    {
        return $this->is_super_admin === true;
    }

    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(UserNotificationPreference::class);
    }

    public function notificationPreferencesFor(Organization|int $organization): ?UserNotificationPreference
    {
        $organizationId = $organization instanceof Organization ? $organization->id : $organization;

        return $this->notificationPreferences()
            ->where('organization_id', $organizationId)
            ->first();
    }

    /**
     * Get the messages where this user was mentioned.
     */
    public function mentionedInMessages(): BelongsToMany
    {
        return $this->belongsToMany(Message::class, 'message_mentions')
            ->withTimestamps();
    }

    /**
     * Get the tickets assigned to this user.
     */
    public function assignedTickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'assigned_to');
    }
}
