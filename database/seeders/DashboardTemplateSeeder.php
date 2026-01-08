<?php

namespace Database\Seeders;

use App\Models\DashboardTemplate;
use Illuminate\Database\Seeder;

class DashboardTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Manager Overview',
                'description' => 'Complete overview with metrics, team performance, and SLA monitoring. Ideal for managers tracking team operations.',
                'role_hint' => 'manager',
                'is_preset' => true,
                'widgets' => [
                    ['id' => 'preset-1', 'type' => 'built-in', 'widget_key' => 'metrics-open-tickets', 'size' => 'sm', 'position' => 0],
                    ['id' => 'preset-2', 'type' => 'built-in', 'widget_key' => 'metrics-unassigned', 'size' => 'sm', 'position' => 1],
                    ['id' => 'preset-3', 'type' => 'built-in', 'widget_key' => 'metrics-sla-breached', 'size' => 'sm', 'position' => 2],
                    ['id' => 'preset-4', 'type' => 'built-in', 'widget_key' => 'metrics-resolved-week', 'size' => 'sm', 'position' => 3],
                    ['id' => 'preset-5', 'type' => 'built-in', 'widget_key' => 'trends', 'size' => 'md', 'position' => 4],
                    ['id' => 'preset-6', 'type' => 'built-in', 'widget_key' => 'agent-performance', 'size' => 'md', 'position' => 5],
                    ['id' => 'preset-7', 'type' => 'built-in', 'widget_key' => 'tickets-over-time', 'size' => 'md', 'position' => 6],
                    ['id' => 'preset-8', 'type' => 'built-in', 'widget_key' => 'sla-alerts', 'size' => 'md', 'position' => 7],
                    ['id' => 'preset-9', 'type' => 'built-in', 'widget_key' => 'channel-breakdown', 'size' => 'md', 'position' => 8],
                    ['id' => 'preset-10', 'type' => 'built-in', 'widget_key' => 'tickets-by-status', 'size' => 'md', 'position' => 9],
                ],
            ],
            [
                'name' => 'Agent Focus',
                'description' => 'Focused view for agents with recent tickets, SLA alerts, and personal performance metrics.',
                'role_hint' => 'agent',
                'is_preset' => true,
                'widgets' => [
                    ['id' => 'preset-11', 'type' => 'built-in', 'widget_key' => 'metrics-open-tickets', 'size' => 'sm', 'position' => 0],
                    ['id' => 'preset-12', 'type' => 'built-in', 'widget_key' => 'metrics-unassigned', 'size' => 'sm', 'position' => 1],
                    ['id' => 'preset-13', 'type' => 'built-in', 'widget_key' => 'metrics-resolved-week', 'size' => 'sm', 'position' => 2],
                    ['id' => 'preset-14', 'type' => 'built-in', 'widget_key' => 'sla-alerts', 'size' => 'lg', 'position' => 3],
                    ['id' => 'preset-15', 'type' => 'built-in', 'widget_key' => 'recent-tickets', 'size' => 'lg', 'position' => 4],
                    ['id' => 'preset-16', 'type' => 'built-in', 'widget_key' => 'response-times', 'size' => 'md', 'position' => 5],
                    ['id' => 'preset-17', 'type' => 'built-in', 'widget_key' => 'tickets-by-status', 'size' => 'md', 'position' => 6],
                ],
            ],
            [
                'name' => 'Quick Glance',
                'description' => 'Minimal dashboard showing only the essential metrics and activity charts.',
                'role_hint' => null,
                'is_preset' => true,
                'widgets' => [
                    ['id' => 'preset-18', 'type' => 'built-in', 'widget_key' => 'metrics-open-tickets', 'size' => 'sm', 'position' => 0],
                    ['id' => 'preset-19', 'type' => 'built-in', 'widget_key' => 'metrics-unassigned', 'size' => 'sm', 'position' => 1],
                    ['id' => 'preset-20', 'type' => 'built-in', 'widget_key' => 'metrics-sla-breached', 'size' => 'sm', 'position' => 2],
                    ['id' => 'preset-21', 'type' => 'built-in', 'widget_key' => 'metrics-resolved-week', 'size' => 'sm', 'position' => 3],
                    ['id' => 'preset-22', 'type' => 'built-in', 'widget_key' => 'tickets-over-time', 'size' => 'lg', 'position' => 4],
                    ['id' => 'preset-23', 'type' => 'built-in', 'widget_key' => 'tickets-by-status', 'size' => 'md', 'position' => 5],
                    ['id' => 'preset-24', 'type' => 'built-in', 'widget_key' => 'channel-breakdown', 'size' => 'md', 'position' => 6],
                ],
            ],
        ];

        foreach ($templates as $template) {
            DashboardTemplate::updateOrCreate(
                [
                    'name' => $template['name'],
                    'is_preset' => true,
                ],
                $template
            );
        }
    }
}
