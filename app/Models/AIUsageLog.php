<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIUsageLog extends Model
{
    use BelongsToOrganization;

    protected $table = 'ai_usage_logs';

    protected $fillable = [
        'organization_id',
        'user_id',
        'ticket_id',
        'provider',
        'model',
        'action',
        'input_tokens',
        'output_tokens',
        'cost',
        'data_included',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'input_tokens' => 'integer',
            'output_tokens' => 'integer',
            'cost' => 'decimal:6',
            'data_included' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get total tokens used.
     */
    public function totalTokens(): int
    {
        return $this->input_tokens + $this->output_tokens;
    }

    /**
     * Scope to filter by action type.
     *
     * @param  \Illuminate\Database\Eloquent\Builder<AIUsageLog>  $query
     * @return \Illuminate\Database\Eloquent\Builder<AIUsageLog>
     */
    public function scopeForAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope to filter by provider.
     *
     * @param  \Illuminate\Database\Eloquent\Builder<AIUsageLog>  $query
     * @return \Illuminate\Database\Eloquent\Builder<AIUsageLog>
     */
    public function scopeForProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }
}
