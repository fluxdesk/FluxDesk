<?php

namespace App\Services\AI;

use App\Models\AIUsageLog;
use App\Models\Organization;
use App\Models\Ticket;
use App\Models\User;
use App\Services\AI\Contracts\AIProviderInterface;

/**
 * Tracks AI usage for billing and analytics.
 */
class UsageTracker
{
    /**
     * Log AI usage from a response.
     *
     * @param  array<string>  $dataIncluded  List of data fields that were included in the prompt
     */
    public function log(
        Organization $organization,
        AIProviderInterface $provider,
        AIResponse $response,
        string $action,
        ?User $user = null,
        ?Ticket $ticket = null,
        array $dataIncluded = [],
    ): AIUsageLog {
        $cost = $provider->estimateCost(
            $response->inputTokens,
            $response->outputTokens,
            $response->model
        );

        return AIUsageLog::create([
            'organization_id' => $organization->id,
            'user_id' => $user?->id,
            'ticket_id' => $ticket?->id,
            'provider' => $provider->identifier(),
            'model' => $response->model,
            'action' => $action,
            'input_tokens' => $response->inputTokens,
            'output_tokens' => $response->outputTokens,
            'cost' => $cost,
            'data_included' => ! empty($dataIncluded) ? array_unique($dataIncluded) : null,
        ]);
    }

    /**
     * Get usage summary for an organization.
     *
     * @return array{total_requests: int, total_tokens: int, total_cost: float}
     */
    public function getSummary(Organization $organization, ?string $period = null): array
    {
        $query = AIUsageLog::where('organization_id', $organization->id);

        if ($period === 'today') {
            $query->whereDate('created_at', today());
        } elseif ($period === 'week') {
            $query->where('created_at', '>=', now()->subWeek());
        } elseif ($period === 'month') {
            $query->where('created_at', '>=', now()->subMonth());
        }

        $stats = $query->selectRaw('
            COUNT(*) as total_requests,
            COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
            COALESCE(SUM(cost), 0) as total_cost
        ')->first();

        return [
            'total_requests' => (int) $stats->total_requests,
            'total_tokens' => (int) $stats->total_tokens,
            'total_cost' => (float) $stats->total_cost,
        ];
    }

    /**
     * Get usage breakdown by action type.
     *
     * @return array<string, array{count: int, tokens: int, cost: float}>
     */
    public function getByAction(Organization $organization, ?string $period = null): array
    {
        $query = AIUsageLog::where('organization_id', $organization->id);

        if ($period === 'month') {
            $query->where('created_at', '>=', now()->subMonth());
        }

        return $query->selectRaw('
            action,
            COUNT(*) as count,
            COALESCE(SUM(input_tokens + output_tokens), 0) as tokens,
            COALESCE(SUM(cost), 0) as cost
        ')
            ->groupBy('action')
            ->get()
            ->keyBy('action')
            ->map(fn ($row) => [
                'count' => (int) $row->count,
                'tokens' => (int) $row->tokens,
                'cost' => (float) $row->cost,
            ])
            ->all();
    }
}
