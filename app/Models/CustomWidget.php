<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomWidget extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'name',
        'entity',
        'chart_type',
        'group_by',
        'aggregation',
        'aggregation_field',
        'filters',
        'is_shared',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'is_shared' => 'boolean',
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
