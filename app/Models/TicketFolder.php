<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class TicketFolder extends Model
{
    /** @use HasFactory<\Database\Factories\TicketFolderFactory> */
    use BelongsToOrganization, HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'slug',
        'color',
        'icon',
        'is_system',
        'system_type',
        'auto_status_id',
        'sort_order',
    ];

    protected static function booted(): void
    {
        static::creating(function (TicketFolder $folder) {
            if (empty($folder->slug)) {
                $folder->slug = Str::slug($folder->name);
            }
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function autoStatus(): BelongsTo
    {
        return $this->belongsTo(Status::class, 'auto_status_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'folder_id');
    }

    public function scopeSystem($query)
    {
        return $query->where('is_system', true);
    }

    public function scopeCustom($query)
    {
        return $query->where('is_system', false);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('system_type', $type);
    }

    /**
     * Check if this folder is editable by the user
     */
    public function isEditableBy(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        // System folders can be edited (name/color) but not deleted
        // Custom folders can be edited by org admins
        return $this->is_system || $user->isAdminOf($this->organization);
    }

    /**
     * Check if this folder can be deleted
     */
    public function canBeDeleted(): bool
    {
        return ! $this->is_system;
    }

    /**
     * Get the ticket count for this folder
     */
    public function getTicketCountAttribute(): int
    {
        if ($this->relationLoaded('tickets')) {
            return $this->tickets->count();
        }

        return $this->tickets()->count();
    }
}
