<?php

namespace App\Models;

use App\Enums\EmailProvider;
use App\Enums\PostImportAction;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailChannel extends Model
{
    use BelongsToOrganization;
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'department_id',
        'name',
        'email_address',
        'provider',
        'oauth_token',
        'oauth_refresh_token',
        'oauth_token_expires_at',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'smtp_encryption',
        'imap_host',
        'imap_port',
        'imap_username',
        'imap_password',
        'imap_encryption',
        'is_active',
        'is_default',
        'sync_interval_minutes',
        'import_emails_since',
        'fetch_folder',
        'auto_reply_enabled',
        'last_sync_at',
        'last_sync_error',
        'post_import_action',
        'post_import_folder',
    ];

    protected function casts(): array
    {
        return [
            'provider' => EmailProvider::class,
            'oauth_token' => 'encrypted',
            'oauth_refresh_token' => 'encrypted',
            'oauth_token_expires_at' => 'datetime',
            'smtp_password' => 'encrypted',
            'imap_password' => 'encrypted',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'sync_interval_minutes' => 'integer',
            'import_emails_since' => 'datetime',
            'auto_reply_enabled' => 'boolean',
            'last_sync_at' => 'datetime',
            'post_import_action' => PostImportAction::class,
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
     * Get tickets that originated from this email channel.
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    /**
     * Get logs for this email channel.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(EmailChannelLog::class)->orderBy('created_at', 'desc');
    }

    /**
     * Check if OAuth token is expired or about to expire.
     */
    public function isTokenExpired(): bool
    {
        if (! $this->oauth_token_expires_at) {
            return true;
        }

        // Consider expired if within 5 minutes
        return $this->oauth_token_expires_at->subMinutes(5)->isPast();
    }

    /**
     * Check if this channel uses OAuth authentication.
     */
    public function usesOAuth(): bool
    {
        return in_array($this->provider, [EmailProvider::Microsoft365, EmailProvider::Google]);
    }

    /**
     * Check if this channel needs configuration (post-OAuth setup).
     */
    public function needsConfiguration(): bool
    {
        return $this->oauth_token && ! $this->fetch_folder;
    }

    /**
     * Check if the post-import action requires a folder.
     */
    public function requiresPostImportFolder(): bool
    {
        return $this->post_import_action === PostImportAction::MoveToFolder;
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
     * Scope to get channels that need syncing.
     */
    public function scopeNeedsSync($query)
    {
        return $query->active()
            ->where(function ($q) {
                $q->whereNull('last_sync_at')
                    ->orWhereRaw('last_sync_at <= datetime("now", "-" || sync_interval_minutes || " minutes")');
            });
    }

    /**
     * Check if this channel needs to be synced based on its interval.
     */
    public function needsSync(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if (! $this->last_sync_at) {
            return true;
        }

        return $this->last_sync_at->addMinutes($this->sync_interval_minutes)->isPast();
    }

    /**
     * Get the domain from the email address.
     */
    public function getDomainAttribute(): string
    {
        return explode('@', $this->email_address)[1] ?? '';
    }

    /**
     * Update the last sync timestamp.
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
}
