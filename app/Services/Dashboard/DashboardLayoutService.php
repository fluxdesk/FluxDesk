<?php

namespace App\Services\Dashboard;

use App\Models\DashboardLayout;
use App\Models\DashboardTemplate;
use App\Models\Organization;
use App\Models\User;

class DashboardLayoutService
{
    public function getOrCreateLayout(User $user, Organization $organization): DashboardLayout
    {
        return DashboardLayout::firstOrCreate(
            [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
            ],
            [
                'widgets' => $this->getDefaultWidgets(),
                'date_range' => '7d',
            ]
        );
    }

    public function updateLayout(DashboardLayout $layout, array $widgets): DashboardLayout
    {
        $layout->update(['widgets' => $widgets]);

        return $layout;
    }

    public function updateDateRange(DashboardLayout $layout, string $dateRange): DashboardLayout
    {
        $layout->update(['date_range' => $dateRange]);

        return $layout;
    }

    public function resetLayout(DashboardLayout $layout): DashboardLayout
    {
        $layout->update([
            'widgets' => $this->getDefaultWidgets(),
        ]);

        return $layout;
    }

    public function applyTemplate(DashboardLayout $layout, DashboardTemplate $template): DashboardLayout
    {
        $layout->update([
            'widgets' => $template->widgets,
        ]);

        return $layout;
    }

    public function getDefaultWidgets(): array
    {
        return [
            [
                'id' => 'widget-1',
                'type' => 'built-in',
                'widget_key' => 'metrics-open-tickets',
                'size' => 'sm',
                'position' => 0,
            ],
            [
                'id' => 'widget-2',
                'type' => 'built-in',
                'widget_key' => 'metrics-unassigned',
                'size' => 'sm',
                'position' => 1,
            ],
            [
                'id' => 'widget-3',
                'type' => 'built-in',
                'widget_key' => 'metrics-sla-breached',
                'size' => 'sm',
                'position' => 2,
            ],
            [
                'id' => 'widget-4',
                'type' => 'built-in',
                'widget_key' => 'metrics-resolved-week',
                'size' => 'sm',
                'position' => 3,
            ],
            [
                'id' => 'widget-5',
                'type' => 'built-in',
                'widget_key' => 'response-times',
                'size' => 'md',
                'position' => 4,
            ],
            [
                'id' => 'widget-6',
                'type' => 'built-in',
                'widget_key' => 'trends',
                'size' => 'md',
                'position' => 5,
            ],
            [
                'id' => 'widget-7',
                'type' => 'built-in',
                'widget_key' => 'tickets-over-time',
                'size' => 'md',
                'position' => 6,
            ],
            [
                'id' => 'widget-8',
                'type' => 'built-in',
                'widget_key' => 'tickets-by-status',
                'size' => 'md',
                'position' => 7,
            ],
            [
                'id' => 'widget-9',
                'type' => 'built-in',
                'widget_key' => 'agent-performance',
                'size' => 'md',
                'position' => 8,
            ],
            [
                'id' => 'widget-10',
                'type' => 'built-in',
                'widget_key' => 'channel-breakdown',
                'size' => 'md',
                'position' => 9,
            ],
            [
                'id' => 'widget-11',
                'type' => 'built-in',
                'widget_key' => 'sla-alerts',
                'size' => 'md',
                'position' => 10,
            ],
            [
                'id' => 'widget-12',
                'type' => 'built-in',
                'widget_key' => 'recent-tickets',
                'size' => 'md',
                'position' => 11,
            ],
        ];
    }

    public function getAvailableWidgets(): array
    {
        return [
            [
                'key' => 'metrics-open-tickets',
                'name' => 'Open Tickets',
                'description' => 'Current open ticket count',
                'icon' => 'inbox',
                'category' => 'metrics',
                'defaultSize' => 'sm',
                'supportedSizes' => ['sm'],
            ],
            [
                'key' => 'metrics-unassigned',
                'name' => 'Unassigned Tickets',
                'description' => 'Tickets without an assignee',
                'icon' => 'user-x',
                'category' => 'metrics',
                'defaultSize' => 'sm',
                'supportedSizes' => ['sm'],
            ],
            [
                'key' => 'metrics-sla-breached',
                'name' => 'SLA Breached',
                'description' => 'Tickets past their SLA deadline',
                'icon' => 'alert-triangle',
                'category' => 'metrics',
                'defaultSize' => 'sm',
                'supportedSizes' => ['sm'],
            ],
            [
                'key' => 'metrics-resolved-week',
                'name' => 'Resolved This Week',
                'description' => 'Tickets resolved this week',
                'icon' => 'check-circle',
                'category' => 'metrics',
                'defaultSize' => 'sm',
                'supportedSizes' => ['sm'],
            ],
            [
                'key' => 'metrics-total-tickets',
                'name' => 'Total Tickets',
                'description' => 'Total ticket count',
                'icon' => 'file-text',
                'category' => 'metrics',
                'defaultSize' => 'sm',
                'supportedSizes' => ['sm'],
            ],
            [
                'key' => 'metrics-tickets-today',
                'name' => 'Tickets Today',
                'description' => 'Tickets created today',
                'icon' => 'calendar',
                'category' => 'metrics',
                'defaultSize' => 'sm',
                'supportedSizes' => ['sm'],
            ],
            [
                'key' => 'metrics-tickets-week',
                'name' => 'Tickets This Week',
                'description' => 'Tickets created this week',
                'icon' => 'calendar-days',
                'category' => 'metrics',
                'defaultSize' => 'sm',
                'supportedSizes' => ['sm'],
            ],
            [
                'key' => 'metrics-total-contacts',
                'name' => 'Total Contacts',
                'description' => 'Total contact count',
                'icon' => 'users',
                'category' => 'metrics',
                'defaultSize' => 'sm',
                'supportedSizes' => ['sm'],
            ],
            [
                'key' => 'response-times',
                'name' => 'Response Times',
                'description' => 'Average first response and resolution times',
                'icon' => 'clock',
                'category' => 'charts',
                'defaultSize' => 'md',
                'supportedSizes' => ['sm', 'md'],
            ],
            [
                'key' => 'trends',
                'name' => 'Trends',
                'description' => 'Ticket volume trends vs previous period',
                'icon' => 'trending-up',
                'category' => 'charts',
                'defaultSize' => 'md',
                'supportedSizes' => ['sm', 'md'],
            ],
            [
                'key' => 'tickets-over-time',
                'name' => 'Ticket Activity',
                'description' => 'Created and resolved tickets over time',
                'icon' => 'activity',
                'category' => 'charts',
                'defaultSize' => 'md',
                'supportedSizes' => ['md', 'lg'],
            ],
            [
                'key' => 'tickets-by-status',
                'name' => 'Tickets by Status',
                'description' => 'Distribution of tickets by status',
                'icon' => 'pie-chart',
                'category' => 'charts',
                'defaultSize' => 'md',
                'supportedSizes' => ['sm', 'md'],
            ],
            [
                'key' => 'agent-performance',
                'name' => 'Agent Performance',
                'description' => 'Ticket assignments and resolution by agent',
                'icon' => 'bar-chart',
                'category' => 'charts',
                'defaultSize' => 'md',
                'supportedSizes' => ['md', 'lg'],
            ],
            [
                'key' => 'channel-breakdown',
                'name' => 'Channel Breakdown',
                'description' => 'Tickets by channel (web, email, API)',
                'icon' => 'layers',
                'category' => 'charts',
                'defaultSize' => 'md',
                'supportedSizes' => ['sm', 'md'],
            ],
            [
                'key' => 'sla-alerts',
                'name' => 'SLA Alerts',
                'description' => 'At-risk and breached SLA tickets',
                'icon' => 'bell',
                'category' => 'lists',
                'defaultSize' => 'md',
                'supportedSizes' => ['md', 'lg'],
            ],
            [
                'key' => 'recent-tickets',
                'name' => 'Recent Tickets',
                'description' => 'Latest created tickets',
                'icon' => 'list',
                'category' => 'lists',
                'defaultSize' => 'md',
                'supportedSizes' => ['md', 'lg'],
            ],
        ];
    }

    public function getPresetsForOrganization(Organization $organization): array
    {
        return DashboardTemplate::where(function ($query) use ($organization) {
            $query->where('is_preset', true)
                ->orWhere('organization_id', $organization->id);
        })
            ->orderByDesc('is_preset')
            ->orderBy('name')
            ->get()
            ->toArray();
    }
}
