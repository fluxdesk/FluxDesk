<?php

namespace App\Services\Dashboard;

use App\Enums\TicketChannel;
use App\Models\Contact;
use App\Models\CustomWidget;
use App\Models\Status;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class WidgetDataService
{
    private Collection $closedStatusIds;

    public function __construct()
    {
        $this->closedStatusIds = Status::where('is_closed', true)->pluck('id');
    }

    public function getWidgetData(string $widgetKey, string $dateRange): array
    {
        $days = $this->getDaysFromRange($dateRange);
        $startDate = now()->subDays($days);

        return match ($widgetKey) {
            'metrics-open-tickets' => $this->getOpenTicketsMetric(),
            'metrics-unassigned' => $this->getUnassignedMetric(),
            'metrics-sla-breached' => $this->getSlaBreachedMetric(),
            'metrics-resolved-week' => $this->getResolvedThisWeekMetric(),
            'metrics-total-tickets' => $this->getTotalTicketsMetric(),
            'metrics-tickets-today' => $this->getTicketsTodayMetric(),
            'metrics-tickets-week' => $this->getTicketsThisWeekMetric(),
            'metrics-total-contacts' => $this->getTotalContactsMetric(),
            'response-times' => $this->getResponseTimeMetrics($startDate),
            'trends' => $this->getTrends($days),
            'tickets-over-time' => $this->getTicketsOverTime($days),
            'tickets-by-status' => $this->getTicketsByStatus(),
            'agent-performance' => $this->getAgentPerformance($startDate),
            'channel-breakdown' => $this->getChannelBreakdown($startDate),
            'sla-alerts' => $this->getSlaAlerts(),
            'recent-tickets' => $this->getRecentTickets(),
            default => [],
        };
    }

    public function getCustomWidgetData(CustomWidget $widget): array
    {
        $filters = $widget->filters ?? [];
        $dateRange = $filters['date_range'] ?? '7d';
        $days = $this->getDaysFromRange($dateRange);
        $startDate = now()->subDays($days);

        $query = match ($widget->entity) {
            'tickets' => Ticket::query(),
            'contacts' => Contact::query(),
            default => null,
        };

        if (! $query) {
            return [];
        }

        $dateField = $filters['date_field'] ?? 'created_at';
        $query->where($dateField, '>=', $startDate);

        if (! empty($filters['status_ids'])) {
            $query->whereIn('status_id', $filters['status_ids']);
        }

        if (! empty($filters['priority_ids'])) {
            $query->whereIn('priority_id', $filters['priority_ids']);
        }

        if (! empty($filters['department_ids'])) {
            $query->whereIn('department_id', $filters['department_ids']);
        }

        if (! empty($filters['assignee_ids'])) {
            $query->whereIn('assigned_to', $filters['assignee_ids']);
        }

        if (! empty($filters['channel'])) {
            $query->where('channel', $filters['channel']);
        }

        if ($widget->chart_type === 'number') {
            return $this->getAggregatedValue($query, $widget);
        }

        return $this->getGroupedData($query, $widget);
    }

    public function getAllBuiltInWidgetData(string $dateRange): array
    {
        $days = $this->getDaysFromRange($dateRange);
        $startDate = now()->subDays($days);

        return [
            'metrics' => [
                'total_tickets' => Ticket::count(),
                'open_tickets' => Ticket::whereNotIn('status_id', $this->closedStatusIds)->count(),
                'unassigned_tickets' => Ticket::whereNull('assigned_to')
                    ->whereNotIn('status_id', $this->closedStatusIds)
                    ->count(),
                'overdue_tickets' => Ticket::whereNotNull('sla_resolution_due_at')
                    ->where('sla_resolution_due_at', '<', now())
                    ->whereNotIn('status_id', $this->closedStatusIds)
                    ->count(),
                'total_contacts' => Contact::count(),
                'tickets_today' => Ticket::whereDate('created_at', today())->count(),
                'tickets_this_week' => Ticket::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
                'resolved_this_week' => Ticket::whereIn('status_id', $this->closedStatusIds)
                    ->whereBetween('resolved_at', [now()->startOfWeek(), now()->endOfWeek()])
                    ->count(),
            ],
            'ticketsByStatus' => $this->getTicketsByStatus(),
            'ticketsOverTime' => $this->getTicketsOverTime($days),
            'recentTickets' => $this->getRecentTickets(),
            'slaAtRisk' => $this->getSlaAtRisk(),
            'slaBreached' => $this->getSlaBreached(),
            'responseTimeMetrics' => $this->getResponseTimeMetrics($startDate),
            'agentPerformance' => $this->getAgentPerformance($startDate),
            'trends' => $this->getTrends($days),
            'ticketsByChannel' => $this->getChannelBreakdown($startDate),
        ];
    }

    private function getDaysFromRange(string $range): int
    {
        return match ($range) {
            '24h' => 1,
            '7d' => 7,
            '30d' => 30,
            '90d' => 90,
            default => 7,
        };
    }

    private function getOpenTicketsMetric(): array
    {
        return [
            'value' => Ticket::whereNotIn('status_id', $this->closedStatusIds)->count(),
            'label' => 'Open Tickets',
        ];
    }

    private function getUnassignedMetric(): array
    {
        return [
            'value' => Ticket::whereNull('assigned_to')
                ->whereNotIn('status_id', $this->closedStatusIds)
                ->count(),
            'label' => 'Unassigned',
        ];
    }

    private function getSlaBreachedMetric(): array
    {
        return [
            'value' => Ticket::whereNotNull('sla_resolution_due_at')
                ->where('sla_resolution_due_at', '<', now())
                ->whereNotIn('status_id', $this->closedStatusIds)
                ->count(),
            'label' => 'SLA Breached',
        ];
    }

    private function getResolvedThisWeekMetric(): array
    {
        return [
            'value' => Ticket::whereIn('status_id', $this->closedStatusIds)
                ->whereBetween('resolved_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
            'label' => 'Resolved This Week',
        ];
    }

    private function getTotalTicketsMetric(): array
    {
        return [
            'value' => Ticket::count(),
            'label' => 'Total Tickets',
        ];
    }

    private function getTicketsTodayMetric(): array
    {
        return [
            'value' => Ticket::whereDate('created_at', today())->count(),
            'label' => 'Tickets Today',
        ];
    }

    private function getTicketsThisWeekMetric(): array
    {
        return [
            'value' => Ticket::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'label' => 'Tickets This Week',
        ];
    }

    private function getTotalContactsMetric(): array
    {
        return [
            'value' => Contact::count(),
            'label' => 'Total Contacts',
        ];
    }

    private function getResponseTimeMetrics(Carbon $startDate): array
    {
        $avgFirstResponse = Ticket::whereNotNull('first_response_at')
            ->where('created_at', '>=', $startDate)
            ->get()
            ->avg(fn ($ticket) => $ticket->created_at->diffInMinutes($ticket->first_response_at) / 60) ?? 0;

        $avgResolution = Ticket::whereNotNull('resolved_at')
            ->where('resolved_at', '>=', $startDate)
            ->get()
            ->avg(fn ($ticket) => $ticket->created_at->diffInMinutes($ticket->resolved_at) / 60) ?? 0;

        return [
            'avgFirstResponse' => round((float) $avgFirstResponse, 1),
            'avgResolution' => round((float) $avgResolution, 1),
        ];
    }

    private function getTrends(int $days): array
    {
        $currentStart = now()->subDays($days);
        $previousStart = now()->subDays($days * 2);
        $previousEnd = now()->subDays($days);

        $currentCreated = Ticket::where('created_at', '>=', $currentStart)->count();
        $currentResolved = Ticket::where('resolved_at', '>=', $currentStart)
            ->whereIn('status_id', $this->closedStatusIds)
            ->count();

        $previousCreated = Ticket::whereBetween('created_at', [$previousStart, $previousEnd])->count();
        $previousResolved = Ticket::whereBetween('resolved_at', [$previousStart, $previousEnd])
            ->whereIn('status_id', $this->closedStatusIds)
            ->count();

        return [
            'created' => [
                'current' => $currentCreated,
                'previous' => $previousCreated,
                'change' => $previousCreated > 0
                    ? round((($currentCreated - $previousCreated) / $previousCreated) * 100)
                    : ($currentCreated > 0 ? 100 : 0),
            ],
            'resolved' => [
                'current' => $currentResolved,
                'previous' => $previousResolved,
                'change' => $previousResolved > 0
                    ? round((($currentResolved - $previousResolved) / $previousResolved) * 100)
                    : ($currentResolved > 0 ? 100 : 0),
            ],
        ];
    }

    private function getTicketsOverTime(int $days): array
    {
        return collect(range($days - 1, 0))->map(function ($daysAgo) {
            $date = now()->subDays($daysAgo)->startOfDay();

            return [
                'date' => $date->format('M d'),
                'created' => Ticket::whereDate('created_at', $date)->count(),
                'resolved' => Ticket::whereDate('resolved_at', $date)->count(),
            ];
        })->toArray();
    }

    private function getTicketsByStatus(): array
    {
        return Status::withCount('tickets')
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($status) => [
                'name' => $status->name,
                'value' => $status->tickets_count,
                'color' => $status->color,
            ])
            ->toArray();
    }

    private function getAgentPerformance(Carbon $startDate): array
    {
        $organization = auth()->user()?->currentOrganization();
        if (! $organization) {
            return [];
        }

        return $organization->users()
            ->withCount([
                'assignedTickets as total_assigned' => fn ($q) => $q->where('created_at', '>=', $startDate),
                'assignedTickets as resolved_count' => fn ($q) => $q
                    ->where('resolved_at', '>=', $startDate)
                    ->whereIn('status_id', $this->closedStatusIds),
            ])
            ->get()
            ->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'avatar' => $user->avatar_path,
                'total_assigned' => $user->total_assigned,
                'resolved_count' => $user->resolved_count,
                'resolution_rate' => $user->total_assigned > 0
                    ? round(($user->resolved_count / $user->total_assigned) * 100)
                    : 0,
            ])
            ->filter(fn ($agent) => $agent['total_assigned'] > 0)
            ->sortByDesc('total_assigned')
            ->values()
            ->take(5)
            ->toArray();
    }

    private function getChannelBreakdown(Carbon $startDate): array
    {
        $colors = [
            'web' => 'oklch(0.837 0.128 66.29)',
            'email' => 'oklch(0.705 0.213 47.604)',
            'api' => 'oklch(0.646 0.222 41.116)',
        ];

        $icons = [
            'web' => 'globe',
            'email' => 'mail',
            'api' => 'code',
        ];

        return collect(TicketChannel::cases())
            ->map(fn ($channel) => [
                'name' => $channel->label(),
                'value' => Ticket::where('channel', $channel->value)
                    ->where('created_at', '>=', $startDate)
                    ->count(),
                'icon' => $icons[$channel->value] ?? 'globe',
                'color' => $colors[$channel->value] ?? 'oklch(0.837 0.128 66.29)',
            ])
            ->toArray();
    }

    private function getSlaAlerts(): array
    {
        return [
            'atRisk' => $this->getSlaAtRisk(),
            'breached' => $this->getSlaBreached(),
        ];
    }

    private function getSlaAtRisk(): array
    {
        return Ticket::with(['contact', 'status', 'priority'])
            ->whereNotNull('sla_resolution_due_at')
            ->where('sla_resolution_due_at', '>', now())
            ->where('sla_resolution_due_at', '<', now()->addHours(2))
            ->whereNotIn('status_id', $this->closedStatusIds)
            ->orderBy('sla_resolution_due_at')
            ->take(5)
            ->get()
            ->toArray();
    }

    private function getSlaBreached(): array
    {
        return Ticket::with(['contact', 'status', 'priority'])
            ->whereNotNull('sla_resolution_due_at')
            ->where('sla_resolution_due_at', '<', now())
            ->whereNotIn('status_id', $this->closedStatusIds)
            ->orderBy('sla_resolution_due_at')
            ->take(5)
            ->get()
            ->toArray();
    }

    private function getRecentTickets(): array
    {
        return Ticket::with(['contact', 'status', 'priority', 'assignee'])
            ->latest()
            ->take(5)
            ->get()
            ->toArray();
    }

    private function getAggregatedValue($query, CustomWidget $widget): array
    {
        $value = match ($widget->aggregation) {
            'count' => $query->count(),
            'sum' => $widget->aggregation_field ? $query->sum($widget->aggregation_field) : 0,
            'avg' => $widget->aggregation_field ? round($query->avg($widget->aggregation_field), 1) : 0,
            default => $query->count(),
        };

        return [
            'value' => $value,
            'label' => $widget->name,
        ];
    }

    private function getGroupedData($query, CustomWidget $widget): array
    {
        $groupBy = $widget->group_by;

        if (! $groupBy) {
            return [];
        }

        $relationMap = [
            'status' => ['relation' => 'status', 'field' => 'status_id', 'name' => 'name', 'color' => 'color'],
            'priority' => ['relation' => 'priority', 'field' => 'priority_id', 'name' => 'name', 'color' => 'color'],
            'department' => ['relation' => 'department', 'field' => 'department_id', 'name' => 'name', 'color' => null],
            'assignee' => ['relation' => 'assignee', 'field' => 'assigned_to', 'name' => 'name', 'color' => null],
            'channel' => ['relation' => null, 'field' => 'channel', 'name' => null, 'color' => null],
        ];

        $config = $relationMap[$groupBy] ?? null;

        if (! $config) {
            return [];
        }

        if ($config['relation']) {
            return $query->get()
                ->groupBy($config['field'])
                ->map(function ($items, $key) use ($config) {
                    $relation = $items->first()?->{$config['relation']};

                    return [
                        'name' => $relation?->{$config['name']} ?? 'Unknown',
                        'value' => $items->count(),
                        'color' => $config['color'] ? $relation?->{$config['color']} : null,
                    ];
                })
                ->values()
                ->toArray();
        }

        return $query->get()
            ->groupBy($config['field'])
            ->map(fn ($items, $key) => [
                'name' => ucfirst((string) $key),
                'value' => $items->count(),
                'color' => null,
            ])
            ->values()
            ->toArray();
    }
}
