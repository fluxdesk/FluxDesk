import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { CustomWidget, WidgetDefinition, WidgetPlacement, WidgetSize } from '@/types/dashboard';
import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Clock,
    Hash,
    Inbox,
    LineChart,
    Mail,
    MessageSquare,
    PieChart,
    Plus,
    Search,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AddWidgetDialogProps {
    open: boolean;
    onClose: () => void;
    availableWidgets: WidgetDefinition[];
    customWidgets: CustomWidget[];
    currentWidgets: WidgetPlacement[];
    onAddWidget: (widget: WidgetPlacement) => void;
    onCreateCustomWidget: () => void;
}

const iconMap: Record<string, typeof BarChart3> = {
    Inbox,
    Users,
    AlertTriangle,
    CheckCircle2,
    Clock,
    TrendingUp,
    LineChart,
    BarChart3,
    PieChart,
    MessageSquare,
    Mail,
    Hash,
};

export function AddWidgetDialog({
    open,
    onClose,
    availableWidgets,
    customWidgets,
    currentWidgets,
    onAddWidget,
    onCreateCustomWidget,
}: AddWidgetDialogProps) {
    const { t } = useTranslation('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('built-in');

    const filteredBuiltIn = useMemo(() => {
        return availableWidgets.filter((w) =>
            w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [availableWidgets, searchQuery]);

    const filteredCustom = useMemo(() => {
        return customWidgets.filter((w) =>
            w.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [customWidgets, searchQuery]);

    const isWidgetAdded = (widgetKey: string) => {
        return currentWidgets.some((w) => w.widget_key === widgetKey);
    };

    const isCustomWidgetAdded = (widgetId: number) => {
        return currentWidgets.some((w) => w.custom_widget_id === widgetId);
    };

    const handleAddBuiltIn = (widget: WidgetDefinition) => {
        const newWidget: WidgetPlacement = {
            id: `widget-${Date.now()}`,
            type: 'built-in',
            widget_key: widget.key,
            size: widget.defaultSize,
            position: currentWidgets.length,
        };
        onAddWidget(newWidget);
    };

    const handleAddCustom = (widget: CustomWidget) => {
        const size: WidgetSize = widget.chart_type === 'number' ? 'sm' : 'md';
        const newWidget: WidgetPlacement = {
            id: `custom-${Date.now()}`,
            type: 'custom',
            custom_widget_id: widget.id,
            size,
            position: currentWidgets.length,
        };
        onAddWidget(newWidget);
    };

    const groupedWidgets = useMemo(() => {
        const groups: Record<string, WidgetDefinition[]> = {
            metrics: [],
            charts: [],
            lists: [],
        };
        filteredBuiltIn.forEach((w) => {
            if (groups[w.category]) {
                groups[w.category].push(w);
            }
        });
        return groups;
    }, [filteredBuiltIn]);

    const categoryLabels: Record<string, string> = {
        metrics: 'Metrics',
        charts: 'Charts',
        lists: 'Lists & Tables',
    };

    const chartTypeIcons: Record<string, typeof BarChart3> = {
        bar: BarChart3,
        pie: PieChart,
        line: LineChart,
        number: Hash,
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('customize.add_widget', 'Add Widget')}</DialogTitle>
                    <DialogDescription>
                        Choose a widget to add to your dashboard
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search widgets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="built-in">Built-in Widgets</TabsTrigger>
                        <TabsTrigger value="custom">Custom Widgets</TabsTrigger>
                    </TabsList>

                    <TabsContent value="built-in" className="mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-6">
                                {Object.entries(groupedWidgets).map(([category, widgets]) => {
                                    if (widgets.length === 0) return null;
                                    return (
                                        <div key={category}>
                                            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                                                {categoryLabels[category]}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {widgets.map((widget) => {
                                                    const Icon = iconMap[widget.icon] || BarChart3;
                                                    const added = isWidgetAdded(widget.key);
                                                    return (
                                                        <button
                                                            key={widget.key}
                                                            type="button"
                                                            disabled={added}
                                                            onClick={() => handleAddBuiltIn(widget)}
                                                            className={cn(
                                                                'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                                                                added
                                                                    ? 'cursor-not-allowed bg-muted/50 opacity-50'
                                                                    : 'hover:border-primary hover:bg-muted/50'
                                                            )}
                                                        >
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                                <Icon className="h-5 w-5 text-primary" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-medium">
                                                                    {widget.name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground line-clamp-2">
                                                                    {widget.description}
                                                                </div>
                                                                {added && (
                                                                    <div className="mt-1 text-xs text-primary">
                                                                        Already added
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="custom" className="mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-4">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2 border-dashed"
                                    onClick={() => {
                                        onClose();
                                        onCreateCustomWidget();
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                    Create New Custom Widget
                                </Button>

                                {filteredCustom.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {filteredCustom.map((widget) => {
                                            const Icon = chartTypeIcons[widget.chart_type] || BarChart3;
                                            const added = isCustomWidgetAdded(widget.id);
                                            return (
                                                <button
                                                    key={widget.id}
                                                    type="button"
                                                    disabled={added}
                                                    onClick={() => handleAddCustom(widget)}
                                                    className={cn(
                                                        'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                                                        added
                                                            ? 'cursor-not-allowed bg-muted/50 opacity-50'
                                                            : 'hover:border-primary hover:bg-muted/50'
                                                    )}
                                                >
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                        <Icon className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium">{widget.name}</div>
                                                        <div className="text-xs text-muted-foreground capitalize">
                                                            {widget.chart_type} chart
                                                            {widget.group_by && ` by ${widget.group_by}`}
                                                        </div>
                                                        {widget.is_shared && (
                                                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Users className="h-3 w-3" />
                                                                Shared
                                                            </div>
                                                        )}
                                                        {added && (
                                                            <div className="mt-1 text-xs text-primary">
                                                                Already added
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : searchQuery ? (
                                    <div className="py-8 text-center text-muted-foreground">
                                        No custom widgets match your search
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-muted-foreground">
                                        <PieChart className="mx-auto mb-2 h-8 w-8" />
                                        <p className="text-sm">No custom widgets yet</p>
                                        <p className="text-xs">
                                            Create your first custom widget to visualize data your way
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
