import { AddWidgetDialog } from '@/components/dashboard/add-widget-dialog';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SaveTemplateDialog } from '@/components/dashboard/save-template-dialog';
import { TemplateGalleryDialog } from '@/components/dashboard/template-gallery-dialog';
import { WidgetBuilderDialog } from '@/components/dashboard/widget-builder/widget-builder-dialog';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { AppShell } from '@/layouts/app-shell';
import type { Ticket } from '@/types';
import type {
    AgentPerformance,
    ChannelData,
    CustomWidget,
    DashboardLayout,
    DashboardTemplate,
    Metrics,
    ResponseTimeMetrics,
    StatusData,
    TimeData,
    Trends,
    WidgetDefinition,
    WidgetPlacement,
} from '@/types/dashboard';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    layout: DashboardLayout;
    availableWidgets: WidgetDefinition[];
    customWidgets: CustomWidget[];
    customWidgetData: Record<number, unknown>;
    templates: DashboardTemplate[];
    metrics: Metrics;
    ticketsByStatus: StatusData[];
    ticketsOverTime: TimeData[];
    recentTickets: Ticket[];
    slaAtRisk: Ticket[];
    slaBreached: Ticket[];
    selectedRange: string;
    responseTimeMetrics: ResponseTimeMetrics;
    agentPerformance: AgentPerformance[];
    trends: Trends;
    ticketsByChannel: ChannelData[];
}

export default function Dashboard({
    layout,
    availableWidgets,
    customWidgets,
    customWidgetData,
    templates,
    metrics,
    ticketsByStatus,
    ticketsOverTime,
    recentTickets,
    slaAtRisk,
    slaBreached,
    selectedRange,
    responseTimeMetrics,
    agentPerformance,
    trends,
    ticketsByChannel,
}: Props) {
    const {
        widgets,
        isCustomizing,
        hasChanges,
        updateWidgets,
        resetLayout,
        toggleCustomizing,
    } = useDashboardLayout({ layout });

    const [showAddWidgetDialog, setShowAddWidgetDialog] = useState(false);
    const [showWidgetBuilderDialog, setShowWidgetBuilderDialog] = useState(false);
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);

    const handleRangeChange = (value: string) => {
        router.get('/dashboard', { range: value }, { preserveState: true, preserveScroll: true });
    };

    const handleAddWidget = (widget: WidgetPlacement) => {
        updateWidgets([...widgets, widget]);
        setShowAddWidgetDialog(false);
    };

    return (
        <AppShell>
            <Head title="Dashboard" />

            <div className="flex min-h-full flex-col">
                <DashboardHeader
                    selectedRange={selectedRange}
                    onRangeChange={handleRangeChange}
                    isCustomizing={isCustomizing}
                    onCustomizeToggle={toggleCustomizing}
                    onReset={resetLayout}
                    onAddWidget={() => setShowAddWidgetDialog(true)}
                    onOpenTemplates={() => setShowTemplateGallery(true)}
                    onSaveTemplate={() => setShowSaveTemplate(true)}
                    hasChanges={hasChanges}
                />

                <div className="flex-1 p-6">
                    <DashboardGrid
                        widgets={widgets}
                        isCustomizing={isCustomizing}
                        onWidgetsChange={updateWidgets}
                        metrics={metrics}
                        ticketsByStatus={ticketsByStatus}
                        ticketsOverTime={ticketsOverTime}
                        recentTickets={recentTickets}
                        slaAtRisk={slaAtRisk}
                        slaBreached={slaBreached}
                        responseTimeMetrics={responseTimeMetrics}
                        agentPerformance={agentPerformance}
                        trends={trends}
                        ticketsByChannel={ticketsByChannel}
                        selectedRange={selectedRange}
                        customWidgets={customWidgets}
                        customWidgetData={customWidgetData}
                    />
                </div>
            </div>

            <AddWidgetDialog
                open={showAddWidgetDialog}
                onClose={() => setShowAddWidgetDialog(false)}
                availableWidgets={availableWidgets}
                customWidgets={customWidgets}
                currentWidgets={widgets}
                onAddWidget={handleAddWidget}
                onCreateCustomWidget={() => setShowWidgetBuilderDialog(true)}
            />

            <WidgetBuilderDialog
                open={showWidgetBuilderDialog}
                onClose={() => setShowWidgetBuilderDialog(false)}
            />

            <TemplateGalleryDialog
                open={showTemplateGallery}
                onClose={() => setShowTemplateGallery(false)}
                templates={templates}
            />

            <SaveTemplateDialog
                open={showSaveTemplate}
                onClose={() => setShowSaveTemplate(false)}
            />
        </AppShell>
    );
}
