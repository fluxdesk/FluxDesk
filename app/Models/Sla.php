<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sla extends Model
{
    /** @use HasFactory<\Database\Factories\SlaFactory> */
    use BelongsToOrganization, HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'is_default',
        'is_system',
        'first_response_hours',
        'resolution_hours',
        'business_hours_only',
        'priority_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'is_system' => 'boolean',
            'first_response_hours' => 'integer',
            'resolution_hours' => 'integer',
            'business_hours_only' => 'boolean',
        ];
    }

    public function priority(): BelongsTo
    {
        return $this->belongsTo(Priority::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    public function scopeForPriority($query, Priority $priority)
    {
        return $query->where('priority_id', $priority->id);
    }

    public function isDeletable(): bool
    {
        return ! $this->is_system;
    }
}
