<?php

namespace App\Models;

use App\Enums\RecipientType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageRecipient extends Model
{
    protected $fillable = [
        'message_id',
        'type',
        'email',
        'name',
        'contact_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => RecipientType::class,
        ];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Get the display name (name or email).
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->name ?: $this->email;
    }
}
