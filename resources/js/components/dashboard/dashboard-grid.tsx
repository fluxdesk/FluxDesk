import type { Ticket } from '@/types';
import type {
    AgentPerformance,
    ChannelData,
    CustomWidget,
    Metrics,
    ResponseTimeMetrics,
    StatusData,
    TimeData,
    Trends,
    WidgetPlacement,
    WidgetSize,
} from '@/types/dashboard';
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { AlertTriangle, Calendar, CalendarDays, CheckCircle2, FileText, Inbox, Users, UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WidgetContainer } from './widget-container';
import {
    AgentPerformanceWidget,
    ChannelBreakdownWidget,
    CustomQueryWidget,
    MetricCard,
    RecentTicketsWidget,
    ResponseTimesWidget,
    SlaAlertsWidget,
    TicketsByStatusWidget,
    TicketsOverTimeWidget,
    TrendsWidget,
} from './widgets';

interface DashboardGridProps {
    widgets: WidgetPlacement[];
    isCustomizing: boolean;
    onWidgetsChange: (widgets: WidgetPlacement[]) => void;
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
    selectedRange: string;
    customWidgets: CustomWidget[];
    customWidgetData: Record<number, unknown>;
}

export function DashboardGrid({
    widgets,
    isCustomizing,
    onWidgetsChange,
    metrics,
    ticketsByStatus,
    ticketsOverTime,
    recentTickets,
    slaAtRisk,
    slaBreached,
    responseTimeMetrics,
    agentPerformance,
    trends,
    ticketsByChannel,
    selectedRange,
    customWidgets,
    customWidgetData,
}: DashboardGridProps) {
    const { t } = useTranslation('dashboard');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = widgets.findIndex((w) => w.id === active.id);
            const newIndex = widgets.findIndex((w) => w.id === over.id);
            const reordered = arrayMove(widgets, oldIndex, newIndex).map((w, i) => ({
                ...w,
                position: i,
            }));
            onWidgetsChange(reordered);
        }
    }

    function handleResize(widgetId: string, newSize: WidgetSize) {
        const updated = widgets.map((w) => (w.id === widgetId ? { ...w, size: newSize } : w));
        onWidgetsChange(updated);
    }

    function handleRemove(widgetId: string) {
        const updated = widgets.filter((w) => w.id !== widgetId);
        onWidgetsChange(updated);
    }

    function renderWidget(widget: WidgetPlacement) {
        // Handle custom widgets
        if (widget.type === 'custom' && widget.custom_widget_id) {
            const customWidget = customWidgets.find((cw) => cw.id === widget.custom_widget_id);
            if (customWidget) {
                const data = customWidgetData[widget.custom_widget_id];
                return (
                    <CustomQueryWidget
                        widget={customWidget}
                        data={data}
                        size={widget.size}
                    />
                );
            }
            return null;
        }

        const widgetKey = widget.widget_key;

        switch (widgetKey) {
            case 'metrics-open-tickets':
                return (
                    <MetricCard
                        title={t('metrics.open_tickets')}
                        value={metrics.open_tickets}
                        description={t('metrics.total_tickets', { count: metrics.total_tickets })}
                        icon={Inbox}
                        variant="default"
                    />
                );
            case 'metrics-unassigned':
                return (
                    <MetricCard
                        title={t('metrics.unassigned')}
                        value={metrics.unassigned_tickets}
                        description={t('metrics.awaiting_assignment')}
                        icon={UserX}
                        variant={metrics.unassigned_tickets > 0 ? 'warning' : 'default'}
                    />
                );
            case 'metrics-sla-breached':
                return (
                    <MetricCard
                        title={t('metrics.sla_breached')}
                        value={metrics.overdue_tickets}
                        description={t('metrics.deadline_passed')}
                        icon={AlertTriangle}
                        variant={metrics.overdue_tickets > 0 ? 'destructive' : 'default'}
                    />
                );
            case 'metrics-resolved-week':
                return (
                    <MetricCard
                        title={t('metrics.resolved_this_week')}
                        value={metrics.resolved_this_week}
                        description={t('metrics.new_this_week', { count: metrics.tickets_this_week })}
                        icon={CheckCircle2}
                        variant="success"
                    />
                );
            case 'metrics-total-tickets':
                return (
                    <MetricCard
                        title={t('metrics.total_tickets_title')}
                        value={metrics.total_tickets}
                        description={t('metrics.all_time')}
                        icon={FileText}
                        variant="default"
                    />
                );
            case 'metrics-tickets-today':
                return (
                    <MetricCard
                        title={t('metrics.tickets_today')}
                        value={metrics.tickets_today}
                        description={t('metrics.created_today')}
                        icon={Calendar}
                        variant="default"
                    />
                );
            case 'metrics-tickets-week':
                return (
                    <MetricCard
                        title={t('metrics.tickets_this_week')}
                        value={metrics.tickets_this_week}
                        description={t('metrics.created_this_week')}
                        icon={CalendarDays}
                        variant="default"
                    />
                );
            case 'metrics-total-contacts':
                return (
                    <MetricCard
                        title={t('metrics.total_contacts')}
                        value={metrics.total_contacts}
                        description={t('metrics.in_system')}
                        icon={Users}
                        variant="default"
                    />
                );
            case 'response-times':
                return <ResponseTimesWidget metrics={responseTimeMetrics} />;
            case 'trends':
                return <TrendsWidget trends={trends} />;
            case 'tickets-over-time':
                return (
                    <TicketsOverTimeWidget
                        data={ticketsOverTime}
                        selectedRange={selectedRange}
                    />
                );
            case 'tickets-by-status':
                return <TicketsByStatusWidget data={ticketsByStatus} />;
            case 'agent-performance':
                return <AgentPerformanceWidget agents={agentPerformance} />;
            case 'channel-breakdown':
                return <ChannelBreakdownWidget data={ticketsByChannel} />;
            case 'sla-alerts':
                return (
                    <SlaAlertsWidget slaAtRisk={slaAtRisk} slaBreached={slaBreached} />
                );
            case 'recent-tickets':
                return <RecentTicketsWidget tickets={recentTickets} />;
            default:
                return null;
        }
    }

    const sortedWidgets = [...widgets].sort((a, b) => a.position - b.position);

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
                items={sortedWidgets.map((w) => w.id)}
                strategy={rectSortingStrategy}
                disabled={!isCustomizing}
            >
                <div className="grid grid-cols-12 gap-4">
                    {sortedWidgets.map((widget) => (
                        <WidgetContainer
                            key={widget.id}
                            id={widget.id}
                            widgetKey={widget.widget_key}
                            size={widget.size}
                            isCustomizing={isCustomizing}
                            onResize={(size) => handleResize(widget.id, size)}
                            onRemove={() => handleRemove(widget.id)}
                        >
                            {renderWidget(widget)}
                        </WidgetContainer>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
