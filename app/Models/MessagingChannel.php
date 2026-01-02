<?php

namespace App\Models;

use App\Enums\MessagingProvider;
use App\Models\Concerns\BelongsToOrganization;
use App\Services\Messaging\AutoReplyVariableService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MessagingChannel extends Model
{
    use BelongsToOrganization;
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'department_id',
        'name',
        'provider',
        'external_id',
        'external_name',
        'external_username',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'configuration',
        'auto_reply_enabled',
        'auto_reply_message',
        'auto_reply_business_hours_only',
        'auto_reply_delay_seconds',
        'is_active',
        'is_default',
        'last_sync_at',
        'last_sync_error',
    ];

    protected function casts(): array
    {
        return [
            'provider' => MessagingProvider::class,
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'token_expires_at' => 'datetime',
            'configuration' => 'encrypted:array',
            'auto_reply_enabled' => 'boolean',
            'auto_reply_business_hours_only' => 'boolean',
            'auto_reply_delay_seconds' => 'integer',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'last_sync_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get tickets that originated from this messaging channel.
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    /**
     * Get logs for this messaging channel.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(MessagingChannelLog::class)->orderBy('created_at', 'desc');
    }

    /**
     * Check if OAuth token is expired or about to expire.
     */
    public function isTokenExpired(): bool
    {
        if (! $this->token_expires_at) {
            return true;
        }

        // Consider expired if within 5 minutes
        return $this->token_expires_at->subMinutes(5)->isPast();
    }

    /**
     * Check if this channel uses OAuth authentication.
     */
    public function usesOAuth(): bool
    {
        return $this->provider->requiresOAuth();
    }

    /**
     * Check if this channel is fully configured and ready to use.
     */
    public function isConfigured(): bool
    {
        if ($this->usesOAuth()) {
            return $this->access_token && $this->external_id;
        }

        return (bool) $this->external_id;
    }

    /**
     * Check if this channel needs configuration (post-OAuth setup).
     */
    public function needsConfiguration(): bool
    {
        return $this->access_token && ! $this->external_id;
    }

    /**
     * Get the scope for the default channel.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Get the scope for active channels.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by provider.
     */
    public function scopeForProvider($query, MessagingProvider $provider)
    {
        return $query->where('provider', $provider->value);
    }

    /**
     * Mark the channel as synced.
     */
    public function markSynced(): void
    {
        $this->update([
            'last_sync_at' => now(),
            'last_sync_error' => null,
        ]);
    }

    /**
     * Mark the channel as having a sync error.
     */
    public function markSyncError(string $error): void
    {
        $this->update([
            'last_sync_at' => now(),
            'last_sync_error' => $error,
        ]);
    }

    /**
     * Get the display name for this channel.
     */
    public function getDisplayNameAttribute(): string
    {
        if ($this->external_username) {
            return "@{$this->external_username}";
        }

        return $this->external_name ?? $this->name;
    }

    /**
     * Get the auto-reply message with variables substituted.
     *
     * @param  array<string, mixed>  $context
     */
    public function getAutoReplyWithVariables(array $context = []): ?string
    {
        if (! $this->auto_reply_enabled || ! $this->auto_reply_message) {
            return null;
        }

        return app(AutoReplyVariableService::class)->substitute(
            $this->auto_reply_message,
            $context
        );
    }

    /**
     * Check if auto-reply should be sent based on business hours.
     */
    public function shouldSendAutoReply(): bool
    {
        if (! $this->auto_reply_enabled || ! $this->auto_reply_message) {
            return false;
        }

        if (! $this->auto_reply_business_hours_only) {
            return true;
        }

        // Check business hours from organization settings
        $settings = $this->organization->settings;
        if (! $settings?->business_hours) {
            return true; // No business hours configured, always send
        }

        return $settings->isWithinBusinessHours();
    }

    /**
     * Get configuration value.
     */
    public function getConfig(string $key, mixed $default = null): mixed
    {
        return $this->configuration[$key] ?? $default;
    }

    /**
     * Set configuration value.
     */
    public function setConfig(string $key, mixed $value): void
    {
        $configuration = $this->configuration ?? [];
        $configuration[$key] = $value;
        $this->configuration = $configuration;
    }
}
