import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { CustomWidgetFilters } from '@/types/dashboard';

interface FilterBuilderProps {
    filters: CustomWidgetFilters;
    onChange: (filters: CustomWidgetFilters) => void;
}

const dateRangeOptions = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '365d', label: 'Last year' },
];

export function FilterBuilder({ filters, onChange }: FilterBuilderProps) {
    const updateFilter = <K extends keyof CustomWidgetFilters>(
        key: K,
        value: CustomWidgetFilters[K]
    ) => {
        onChange({ ...filters, [key]: value });
    };

    return (
        <div className="space-y-4">
            <Label>Filters</Label>

            <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Date Range</Label>
                    <Select
                        value={filters.date_range || '7d'}
                        onValueChange={(value) => updateFilter('date_range', value)}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {dateRangeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
