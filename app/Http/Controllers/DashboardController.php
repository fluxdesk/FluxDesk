<?php

namespace App\Http\Controllers;

use App\Enums\TicketChannel;
use App\Models\Contact;
use App\Models\Status;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $closedStatusIds = Status::where('is_closed', true)->pluck('id');

        // Get the date range from request (default to 7 days)
        $range = $request->get('range', '7d');
        $days = match ($range) {
            '24h' => 1,
            '7d' => 7,
            '30d' => 30,
            '90d' => 90,
            default => 7,
        };

        $startDate = now()->subDays($days);

        // Core metrics
        $metrics = [
            'total_tickets' => Ticket::count(),
            'open_tickets' => Ticket::whereNotIn('status_id', $closedStatusIds)->count(),
            'unassigned_tickets' => Ticket::whereNull('assigned_to')->whereNotIn('status_id', $closedStatusIds)->count(),
            'overdue_tickets' => Ticket::whereNotNull('sla_resolution_due_at')
                ->where('sla_resolution_due_at', '<', now())
                ->whereNotIn('status_id', $closedStatusIds)
                ->count(),
            'total_contacts' => Contact::count(),
            'tickets_today' => Ticket::whereDate('created_at', today())->count(),
            'tickets_this_week' => Ticket::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'resolved_this_week' => Ticket::whereIn('status_id', $closedStatusIds)
                ->whereBetween('resolved_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
        ];

        // Tickets by status (for pie chart)
        $ticketsByStatus = Status::withCount('tickets')
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($status) => [
                'name' => $status->name,
                'value' => $status->tickets_count,
                'color' => $status->color,
            ]);

        // Tickets created over time based on selected range
        $ticketsOverTime = collect(range($days - 1, 0))->map(function ($daysAgo) {
            $date = now()->subDays($daysAgo)->startOfDay();

            return [
                'date' => $date->format('M d'),
                'created' => Ticket::whereDate('created_at', $date)->count(),
                'resolved' => Ticket::whereDate('resolved_at', $date)->count(),
            ];
        });

        // Recent tickets
        $recentTickets = Ticket::with(['contact', 'status', 'priority', 'assignee'])
            ->latest()
            ->take(5)
            ->get();

        // SLA at risk (due within 2 hours)
        $slaAtRisk = Ticket::with(['contact', 'status', 'priority'])
            ->whereNotNull('sla_resolution_due_at')
            ->where('sla_resolution_due_at', '>', now())
            ->where('sla_resolution_due_at', '<', now()->addHours(2))
            ->whereNotIn('status_id', $closedStatusIds)
            ->orderBy('sla_resolution_due_at')
            ->take(5)
            ->get();

        // SLA breached
        $slaBreached = Ticket::with(['contact', 'status', 'priority'])
            ->whereNotNull('sla_resolution_due_at')
            ->where('sla_resolution_due_at', '<', now())
            ->whereNotIn('status_id', $closedStatusIds)
            ->orderBy('sla_resolution_due_at')
            ->take(5)
            ->get();

        // Response time metrics (SQLite compatible)
        $responseTimeMetrics = $this->calculateResponseTimeMetrics($startDate);

        // Agent performance
        $agentPerformance = $this->calculateAgentPerformance($startDate, $closedStatusIds);

        // Trend comparisons (current period vs previous period)
        $trends = $this->calculateTrends($days, $closedStatusIds);

        // Channel breakdown
        $ticketsByChannel = $this->calculateChannelBreakdown($startDate);

        return Inertia::render('dashboard', [
            'metrics' => $metrics,
            'ticketsByStatus' => $ticketsByStatus,
            'ticketsOverTime' => $ticketsOverTime,
            'recentTickets' => $recentTickets,
            'slaAtRisk' => $slaAtRisk,
            'slaBreached' => $slaBreached,
            'selectedRange' => $range,
            'responseTimeMetrics' => $responseTimeMetrics,
            'agentPerformance' => $agentPerformance,
            'trends' => $trends,
            'ticketsByChannel' => $ticketsByChannel,
        ]);
    }

    /**
     * Calculate average response times (database agnostic).
     */
    private function calculateResponseTimeMetrics(\Carbon\Carbon $startDate): array
    {
        // Average first response time in hours
        $avgFirstResponse = Ticket::whereNotNull('first_response_at')
            ->where('created_at', '>=', $startDate)
            ->get()
            ->avg(fn ($ticket) => $ticket->created_at->diffInMinutes($ticket->first_response_at) / 60) ?? 0;

        // Average resolution time in hours
        $avgResolution = Ticket::whereNotNull('resolved_at')
            ->where('resolved_at', '>=', $startDate)
            ->get()
            ->avg(fn ($ticket) => $ticket->created_at->diffInMinutes($ticket->resolved_at) / 60) ?? 0;

        return [
            'avgFirstResponse' => round((float) $avgFirstResponse, 1),
            'avgResolution' => round((float) $avgResolution, 1),
        ];
    }

    /**
     * Calculate agent performance metrics.
     *
     * @param  \Illuminate\Support\Collection  $closedStatusIds
     */
    private function calculateAgentPerformance(\Carbon\Carbon $startDate, $closedStatusIds): array
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
                    ->whereIn('status_id', $closedStatusIds),
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

    /**
     * Calculate trend comparisons (current vs previous period).
     *
     * @param  \Illuminate\Support\Collection  $closedStatusIds
     */
    private function calculateTrends(int $days, $closedStatusIds): array
    {
        $currentStart = now()->subDays($days);
        $previousStart = now()->subDays($days * 2);
        $previousEnd = now()->subDays($days);

        // Current period
        $currentCreated = Ticket::where('created_at', '>=', $currentStart)->count();
        $currentResolved = Ticket::where('resolved_at', '>=', $currentStart)
            ->whereIn('status_id', $closedStatusIds)
            ->count();

        // Previous period
        $previousCreated = Ticket::whereBetween('created_at', [$previousStart, $previousEnd])->count();
        $previousResolved = Ticket::whereBetween('resolved_at', [$previousStart, $previousEnd])
            ->whereIn('status_id', $closedStatusIds)
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

    /**
     * Calculate ticket distribution by channel.
     */
    private function calculateChannelBreakdown(\Carbon\Carbon $startDate): array
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
}
