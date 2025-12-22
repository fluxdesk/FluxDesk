<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotificationPreference extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'notify_new_ticket',
        'notify_contact_reply',
        'notify_internal_note',
        'notify_ticket_assigned',
        'notify_sla_breach_warning',
        'notify_when_mentioned',
    ];

    protected function casts(): array
    {
        return [
            'notify_new_ticket' => 'boolean',
            'notify_contact_reply' => 'boolean',
            'notify_internal_note' => 'boolean',
            'notify_ticket_assigned' => 'boolean',
            'notify_sla_breach_warning' => 'boolean',
            'notify_when_mentioned' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
