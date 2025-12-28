<?php

namespace App\Models;

use App\Enums\WebhookEvent;
use App\Enums\WebhookFormat;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Webhook configuration for an organization.
 *
 * @property int $id
 * @property int $organization_id
 * @property string $name
 * @property string $url
 * @property string $secret
 * @property array<string> $events
 * @property WebhookFormat $format
 * @property bool $is_active
 * @property string|null $description
 * @property \Carbon\Carbon|null $last_triggered_at
 * @property int $failure_count
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * @property-read Organization $organization
 * @property-read \Illuminate\Database\Eloquent\Collection<WebhookDelivery> $deliveries
 */
class Webhook extends Model
{
    use BelongsToOrganization;
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'url',
        'secret',
        'events',
        'format',
        'is_active',
        'description',
        'last_triggered_at',
        'failure_count',
    ];

    protected function casts(): array
    {
        return [
            'secret' => 'encrypted',
            'events' => 'array',
            'format' => WebhookFormat::class,
            'is_active' => 'boolean',
            'last_triggered_at' => 'datetime',
            'failure_count' => 'integer',
        ];
    }

    /**
     * Get all deliveries for this webhook.
     */
    public function deliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class);
    }

    /**
     * Check if this webhook subscribes to a specific event type.
     */
    public function subscribesToEvent(string|WebhookEvent $event): bool
    {
        $eventValue = $event instanceof WebhookEvent ? $event->value : $event;

        return in_array($eventValue, $this->events ?? [], true);
    }

    /**
     * Generate a new cryptographically secure secret.
     */
    public function regenerateSecret(): string
    {
        $secret = bin2hex(random_bytes(32));
        $this->update(['secret' => $secret]);

        return $secret;
    }

    /**
     * Increment the failure count.
     */
    public function incrementFailureCount(): void
    {
        $this->increment('failure_count');

        if ($this->shouldAutoDisable()) {
            $this->update(['is_active' => false]);
        }
    }

    /**
     * Reset the failure count after a successful delivery.
     */
    public function resetFailureCount(): void
    {
        if ($this->failure_count > 0) {
            $this->update(['failure_count' => 0]);
        }
    }

    /**
     * Check if the webhook should be auto-disabled due to failures.
     */
    public function shouldAutoDisable(): bool
    {
        return $this->failure_count >= 10;
    }

    /**
     * Check if the webhook was auto-disabled.
     */
    public function wasAutoDisabled(): bool
    {
        return ! $this->is_active && $this->failure_count >= 10;
    }

    /**
     * Mark as triggered now.
     */
    public function markAsTriggered(): void
    {
        $this->update(['last_triggered_at' => now()]);
    }
}
