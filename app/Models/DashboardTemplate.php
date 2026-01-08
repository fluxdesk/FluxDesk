<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DashboardTemplate extends Model
{
    protected $fillable = [
        'organization_id',
        'created_by',
        'name',
        'description',
        'role_hint',
        'is_preset',
        'widgets',
    ];

    protected function casts(): array
    {
        return [
            'widgets' => 'array',
            'is_preset' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
