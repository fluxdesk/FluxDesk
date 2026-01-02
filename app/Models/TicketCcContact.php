<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketCcContact extends Model
{
    protected $fillable = [
        'ticket_id',
        'email',
        'name',
        'contact_id',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Get the display name (name if available, otherwise email).
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->name ?: $this->email;
    }
}
