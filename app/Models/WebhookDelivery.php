<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Webhook delivery log entry.
 *
 * @property int $id
 * @property int $webhook_id
 * @property string $event_type
 * @property array $payload
 * @property int|null $response_status
 * @property string|null $response_body
 * @property int|null $duration_ms
 * @property int $attempt
 * @property bool $success
 * @property string|null $error
 * @property \Carbon\Carbon $created_at
 * @property-read Webhook $webhook
 */
class WebhookDelivery extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'webhook_id',
        'event_type',
        'payload',
        'response_status',
        'response_body',
        'duration_ms',
        'attempt',
        'success',
        'error',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'success' => 'boolean',
            'response_status' => 'integer',
            'duration_ms' => 'integer',
            'attempt' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the webhook this delivery belongs to.
     */
    public function webhook(): BelongsTo
    {
        return $this->belongsTo(Webhook::class);
    }
}
