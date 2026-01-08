import type { Ticket } from '@/types';
import type { LucideIcon } from 'lucide-react';

export type WidgetSize = 'sm' | 'md' | 'lg';
export type WidgetType = 'built-in' | 'custom';
export type WidgetCategory = 'metrics' | 'charts' | 'lists';

export interface WidgetPlacement {
    id: string;
    type: WidgetType;
    widget_key?: string;
    custom_widget_id?: number;
    size: WidgetSize;
    position: number;
}

export interface DashboardLayout {
    id: number;
    user_id: number;
    organization_id: number;
    widgets: WidgetPlacement[];
    date_range: string;
    created_at: string;
    updated_at: string;
}

export interface WidgetDefinition {
    key: string;
    name: string;
    description: string;
    icon: string;
    category: WidgetCategory;
    defaultSize: WidgetSize;
    supportedSizes: WidgetSize[];
}

export interface CustomWidget {
    id: number;
    user_id: number;
    organization_id: number;
    name: string;
    entity: 'tickets' | 'contacts';
    chart_type: 'bar' | 'pie' | 'line' | 'number';
    group_by: string | null;
    aggregation: 'count' | 'sum' | 'avg';
    aggregation_field: string | null;
    filters: CustomWidgetFilters;
    is_shared: boolean;
}

export interface CustomWidgetFilters {
    date_range?: string;
    date_field?: string;
    status_ids?: number[];
    priority_ids?: number[];
    department_ids?: number[];
    assignee_ids?: number[];
    channel?: string;
    custom_date_start?: string;
    custom_date_end?: string;
}

export interface DashboardTemplate {
    id: number;
    organization_id: number | null;
    created_by: number | null;
    name: string;
    description: string | null;
    role_hint: 'manager' | 'agent' | null;
    is_preset: boolean;
    widgets: WidgetPlacement[];
}

export interface Metrics {
    total_tickets: number;
    open_tickets: number;
    unassigned_tickets: number;
    overdue_tickets: number;
    total_contacts: number;
    tickets_today: number;
    tickets_this_week: number;
    resolved_this_week: number;
}

export interface StatusData {
    name: string;
    value: number;
    color: string;
}

export interface TimeData {
    date: string;
    created: number;
    resolved: number;
}

export interface ResponseTimeMetrics {
    avgFirstResponse: number;
    avgResolution: number;
}

export interface AgentPerformance {
    id: number;
    name: string;
    avatar?: string;
    total_assigned: number;
    resolved_count: number;
    resolution_rate: number;
}

export interface TrendData {
    current: number;
    previous: number;
    change: number;
}

export interface Trends {
    created: TrendData;
    resolved: TrendData;
}

export interface ChannelData {
    name: string;
    value: number;
    icon: string;
    color: string;
}

export interface WidgetData {
    metrics: Metrics;
    ticketsByStatus: StatusData[];
    ticketsOverTime: TimeData[];
    recentTickets: Ticket[];
    slaAtRisk: Ticket[];
    slaBreached: Ticket[];
    responseTimeMetrics: ResponseTimeMetrics;
    agentPerformance: AgentPerformance[];
    trends: Trends;
    ticketsByChannel: ChannelData[];
}

export interface WidgetProps {
    size: WidgetSize;
    isCustomizing?: boolean;
}

export interface MetricWidgetProps extends WidgetProps {
    title: string;
    value: number;
    description: string;
    icon: LucideIcon;
    variant?: 'default' | 'warning' | 'destructive' | 'success';
}
