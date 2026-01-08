import type { WidgetCategory, WidgetSize } from '@/types/dashboard';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Bell,
    Calendar,
    CalendarDays,
    CheckCircle2,
    Clock,
    FileText,
    Inbox,
    Layers,
    List,
    PieChart,
    TrendingUp,
    UserX,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface WidgetRegistryEntry {
    key: string;
    name: string;
    description: string;
    icon: LucideIcon;
    category: WidgetCategory;
    defaultSize: WidgetSize;
    supportedSizes: WidgetSize[];
}

export const WIDGET_REGISTRY: Record<string, WidgetRegistryEntry> = {
    'metrics-open-tickets': {
        key: 'metrics-open-tickets',
        name: 'Open Tickets',
        description: 'Current open ticket count',
        icon: Inbox,
        category: 'metrics',
        defaultSize: 'sm',
        supportedSizes: ['sm'],
    },
    'metrics-unassigned': {
        key: 'metrics-unassigned',
        name: 'Unassigned Tickets',
        description: 'Tickets without an assignee',
        icon: UserX,
        category: 'metrics',
        defaultSize: 'sm',
        supportedSizes: ['sm'],
    },
    'metrics-sla-breached': {
        key: 'metrics-sla-breached',
        name: 'SLA Breached',
        description: 'Tickets past their SLA deadline',
        icon: AlertTriangle,
        category: 'metrics',
        defaultSize: 'sm',
        supportedSizes: ['sm'],
    },
    'metrics-resolved-week': {
        key: 'metrics-resolved-week',
        name: 'Resolved This Week',
        description: 'Tickets resolved this week',
        icon: CheckCircle2,
        category: 'metrics',
        defaultSize: 'sm',
        supportedSizes: ['sm'],
    },
    'metrics-total-tickets': {
        key: 'metrics-total-tickets',
        name: 'Total Tickets',
        description: 'Total ticket count',
        icon: FileText,
        category: 'metrics',
        defaultSize: 'sm',
        supportedSizes: ['sm'],
    },
    'metrics-tickets-today': {
        key: 'metrics-tickets-today',
        name: 'Tickets Today',
        description: 'Tickets created today',
        icon: Calendar,
        category: 'metrics',
        defaultSize: 'sm',
        supportedSizes: ['sm'],
    },
    'metrics-tickets-week': {
        key: 'metrics-tickets-week',
        name: 'Tickets This Week',
        description: 'Tickets created this week',
        icon: CalendarDays,
        category: 'metrics',
        defaultSize: 'sm',
        supportedSizes: ['sm'],
    },
    'metrics-total-contacts': {
        key: 'metrics-total-contacts',
        name: 'Total Contacts',
        description: 'Total contact count',
        icon: Users,
        category: 'metrics',
        defaultSize: 'sm',
        supportedSizes: ['sm'],
    },
    'response-times': {
        key: 'response-times',
        name: 'Response Times',
        description: 'Average first response and resolution times',
        icon: Clock,
        category: 'charts',
        defaultSize: 'md',
        supportedSizes: ['sm', 'md'],
    },
    'trends': {
        key: 'trends',
        name: 'Trends',
        description: 'Ticket volume trends vs previous period',
        icon: TrendingUp,
        category: 'charts',
        defaultSize: 'md',
        supportedSizes: ['sm', 'md'],
    },
    'tickets-over-time': {
        key: 'tickets-over-time',
        name: 'Ticket Activity',
        description: 'Created and resolved tickets over time',
        icon: Activity,
        category: 'charts',
        defaultSize: 'md',
        supportedSizes: ['md', 'lg'],
    },
    'tickets-by-status': {
        key: 'tickets-by-status',
        name: 'Tickets by Status',
        description: 'Distribution of tickets by status',
        icon: PieChart,
        category: 'charts',
        defaultSize: 'md',
        supportedSizes: ['sm', 'md'],
    },
    'agent-performance': {
        key: 'agent-performance',
        name: 'Agent Performance',
        description: 'Ticket assignments and resolution by agent',
        icon: BarChart3,
        category: 'charts',
        defaultSize: 'md',
        supportedSizes: ['md', 'lg'],
    },
    'channel-breakdown': {
        key: 'channel-breakdown',
        name: 'Channel Breakdown',
        description: 'Tickets by channel (web, email, API)',
        icon: Layers,
        category: 'charts',
        defaultSize: 'md',
        supportedSizes: ['sm', 'md'],
    },
    'sla-alerts': {
        key: 'sla-alerts',
        name: 'SLA Alerts',
        description: 'At-risk and breached SLA tickets',
        icon: Bell,
        category: 'lists',
        defaultSize: 'md',
        supportedSizes: ['md', 'lg'],
    },
    'recent-tickets': {
        key: 'recent-tickets',
        name: 'Recent Tickets',
        description: 'Latest created tickets',
        icon: List,
        category: 'lists',
        defaultSize: 'md',
        supportedSizes: ['md', 'lg'],
    },
};

export function getWidgetSizeClass(size: WidgetSize): string {
    return {
        sm: 'col-span-12 sm:col-span-6 lg:col-span-3',
        md: 'col-span-12 lg:col-span-6',
        lg: 'col-span-12',
    }[size];
}

export function getWidgetsByCategory(category: WidgetCategory): WidgetRegistryEntry[] {
    return Object.values(WIDGET_REGISTRY).filter((w) => w.category === category);
}

export function getAllWidgets(): WidgetRegistryEntry[] {
    return Object.values(WIDGET_REGISTRY);
}
