<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketActivity extends Model
{
    protected $fillable = [
        'ticket_id',
        'user_id',
        'type',
        'properties',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'properties' => 'array',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getDescriptionAttribute(): string
    {
        $userName = $this->user?->name ?? 'System';

        return match ($this->type) {
            'created' => "{$userName} created this ticket",
            'status_changed' => "{$userName} changed status from {$this->properties['old']} to {$this->properties['new']}",
            'priority_changed' => "{$userName} changed priority from {$this->properties['old']} to {$this->properties['new']}",
            'assigned' => $this->properties['new']
                ? "{$userName} assigned this ticket to {$this->properties['new']}"
                : "{$userName} unassigned this ticket",
            'tag_added' => "{$userName} added tag {$this->properties['tag']}",
            'tag_removed' => "{$userName} removed tag {$this->properties['tag']}",
            'sla_changed' => "{$userName} changed SLA to {$this->properties['new']}",
            'message_added' => "{$userName} added a {$this->properties['type']}",
            default => "{$userName} performed {$this->type}",
        };
    }
}
