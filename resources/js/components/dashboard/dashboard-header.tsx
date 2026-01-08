import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Check, LayoutGrid, LayoutTemplate, Plus, RotateCcw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DATE_RANGE_KEYS = ['24h', '7d', '30d', '90d'] as const;

interface DashboardHeaderProps {
    selectedRange: string;
    onRangeChange: (range: string) => void;
    isCustomizing: boolean;
    onCustomizeToggle: () => void;
    onReset: () => void;
    onAddWidget: () => void;
    onOpenTemplates: () => void;
    onSaveTemplate: () => void;
    hasChanges: boolean;
}

export function DashboardHeader({
    selectedRange,
    onRangeChange,
    isCustomizing,
    onCustomizeToggle,
    onReset,
    onAddWidget,
    onOpenTemplates,
    onSaveTemplate,
    hasChanges,
}: DashboardHeaderProps) {
    const { t } = useTranslation('dashboard');

    return (
        <div className="shrink-0 border-b px-6 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('description')}</p>
                </div>
                <div className="flex items-center gap-3">
                    {isCustomizing ? (
                        <>
                            <Button variant="outline" size="sm" onClick={onAddWidget}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('customize.add_widget', 'Add Widget')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={onSaveTemplate}>
                                <Save className="mr-2 h-4 w-4" />
                                {t('customize.save_template', 'Save Template')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={onReset}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                {t('customize.reset')}
                            </Button>
                            <Button size="sm" onClick={onCustomizeToggle}>
                                <Check className="mr-2 h-4 w-4" />
                                {t('customize.done')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Select value={selectedRange} onValueChange={onRangeChange}>
                                <SelectTrigger className="h-9 w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DATE_RANGE_KEYS.map((rangeKey) => (
                                        <SelectItem key={rangeKey} value={rangeKey}>
                                            {t(`date_ranges.${rangeKey}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={onOpenTemplates}>
                                <LayoutTemplate className="mr-2 h-4 w-4" />
                                {t('customize.templates', 'Templates')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={onCustomizeToggle}>
                                <LayoutGrid className="mr-2 h-4 w-4" />
                                {t('customize.button')}
                            </Button>
                        </>
                    )}
                </div>
            </div>
            {isCustomizing && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
                    <LayoutGrid className="h-4 w-4" />
                    <span>{t('customize.hint')}</span>
                    {hasChanges && (
                        <span className="ml-auto text-xs text-primary">{t('customize.saving')}</span>
                    )}
                </div>
            )}
        </div>
    );
}
