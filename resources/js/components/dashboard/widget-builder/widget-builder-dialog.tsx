import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import type { CustomWidget, CustomWidgetFilters } from '@/types/dashboard';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { ChartTypeSelector } from './chart-type-selector';
import { EntitySelector } from './entity-selector';
import { FilterBuilder } from './filter-builder';
import { GroupBySelector } from './group-by-selector';
import { WidgetPreview } from './widget-preview';

interface WidgetBuilderDialogProps {
    open: boolean;
    onClose: () => void;
    existingWidget?: CustomWidget;
}

interface WidgetConfig {
    name: string;
    entity: 'tickets' | 'contacts';
    chart_type: 'bar' | 'pie' | 'line' | 'number';
    group_by: string | null;
    aggregation: 'count' | 'sum' | 'avg';
    filters: CustomWidgetFilters;
    is_shared: boolean;
}

const defaultConfig: WidgetConfig = {
    name: '',
    entity: 'tickets',
    chart_type: 'bar',
    group_by: 'status',
    aggregation: 'count',
    filters: {
        date_range: '7d',
    },
    is_shared: false,
};

export function WidgetBuilderDialog({
    open,
    onClose,
    existingWidget,
}: WidgetBuilderDialogProps) {
    const [config, setConfig] = useState<WidgetConfig>(defaultConfig);
    const [previewData, setPreviewData] = useState<unknown[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (existingWidget) {
            setConfig({
                name: existingWidget.name,
                entity: existingWidget.entity,
                chart_type: existingWidget.chart_type,
                group_by: existingWidget.group_by,
                aggregation: existingWidget.aggregation,
                filters: existingWidget.filters,
                is_shared: existingWidget.is_shared,
            });
        } else {
            setConfig(defaultConfig);
        }
    }, [existingWidget, open]);

    const fetchPreview = useCallback(async () => {
        if (config.chart_type === 'number' || !config.group_by) {
            setIsLoadingPreview(true);
            try {
                const response = await axios.post('/custom-widgets/preview', {
                    entity: config.entity,
                    chart_type: config.chart_type,
                    group_by: config.group_by,
                    aggregation: config.aggregation,
                    filters: config.filters,
                });
                setPreviewData(response.data.data);
            } catch (error) {
                console.error('Preview failed:', error);
            } finally {
                setIsLoadingPreview(false);
            }
            return;
        }

        setIsLoadingPreview(true);
        try {
            const response = await axios.post('/custom-widgets/preview', {
                entity: config.entity,
                chart_type: config.chart_type,
                group_by: config.group_by,
                aggregation: config.aggregation,
                filters: config.filters,
            });
            setPreviewData(response.data.data);
        } catch (error) {
            console.error('Preview failed:', error);
        } finally {
            setIsLoadingPreview(false);
        }
    }, [config]);

    useEffect(() => {
        if (open && config.entity) {
            const timeout = setTimeout(fetchPreview, 300);
            return () => clearTimeout(timeout);
        }
    }, [open, config.entity, config.chart_type, config.group_by, config.filters, fetchPreview]);

    const handleSave = () => {
        if (!config.name.trim()) {
            return;
        }

        setIsSaving(true);

        const payload = config as unknown as Record<string, unknown>;

        if (existingWidget) {
            router.patch(`/custom-widgets/${existingWidget.id}`, payload, {
                onSuccess: () => {
                    setIsSaving(false);
                    onClose();
                },
                onError: () => {
                    setIsSaving(false);
                },
            });
        } else {
            router.post('/custom-widgets', payload, {
                onSuccess: () => {
                    setIsSaving(false);
                    onClose();
                },
                onError: () => {
                    setIsSaving(false);
                },
            });
        }
    };

    const updateConfig = <K extends keyof WidgetConfig>(
        key: K,
        value: WidgetConfig[K]
    ) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>
                        {existingWidget ? 'Edit Widget' : 'Create Custom Widget'}
                    </DialogTitle>
                    <DialogDescription>
                        Build a custom widget by selecting the data you want to visualize.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6">
                    {/* Left: Configuration */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="widget-name">Widget Name</Label>
                            <Input
                                id="widget-name"
                                value={config.name}
                                onChange={(e) => updateConfig('name', e.target.value)}
                                placeholder="My Custom Widget"
                            />
                        </div>

                        <EntitySelector
                            value={config.entity}
                            onChange={(value) => updateConfig('entity', value)}
                        />

                        <ChartTypeSelector
                            value={config.chart_type}
                            onChange={(value) => updateConfig('chart_type', value)}
                        />

                        {config.chart_type !== 'number' && (
                            <GroupBySelector
                                value={config.group_by}
                                entity={config.entity}
                                onChange={(value) => updateConfig('group_by', value)}
                            />
                        )}

                        <FilterBuilder
                            filters={config.filters}
                            onChange={(filters) => updateConfig('filters', filters)}
                        />

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is-shared"
                                checked={config.is_shared}
                                onCheckedChange={(checked) =>
                                    updateConfig('is_shared', checked === true)
                                }
                            />
                            <Label htmlFor="is-shared" className="text-sm font-normal">
                                Share with team members
                            </Label>
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="mb-2 text-sm font-medium">Preview</div>
                        <WidgetPreview
                            data={previewData}
                            chartType={config.chart_type}
                            isLoading={isLoadingPreview}
                            name={config.name || 'Preview'}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !config.name.trim()}>
                        {isSaving && <Spinner className="mr-2 h-4 w-4" />}
                        {existingWidget ? 'Update Widget' : 'Create Widget'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
