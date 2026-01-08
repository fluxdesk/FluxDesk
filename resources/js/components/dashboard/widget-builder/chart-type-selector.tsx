import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { BarChart3, Hash, LineChart, PieChart } from 'lucide-react';

interface ChartTypeSelectorProps {
    value: 'bar' | 'pie' | 'line' | 'number';
    onChange: (value: 'bar' | 'pie' | 'line' | 'number') => void;
}

const chartTypes = [
    {
        value: 'bar' as const,
        label: 'Bar',
        icon: BarChart3,
    },
    {
        value: 'pie' as const,
        label: 'Pie',
        icon: PieChart,
    },
    {
        value: 'line' as const,
        label: 'Line',
        icon: LineChart,
    },
    {
        value: 'number' as const,
        label: 'Number',
        icon: Hash,
    },
];

export function ChartTypeSelector({ value, onChange }: ChartTypeSelectorProps) {
    return (
        <div className="space-y-2">
            <Label>Chart Type</Label>
            <div className="grid grid-cols-4 gap-2">
                {chartTypes.map((chart) => {
                    const Icon = chart.icon;
                    const isSelected = value === chart.value;

                    return (
                        <button
                            key={chart.value}
                            type="button"
                            onClick={() => onChange(chart.value)}
                            className={cn(
                                'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-colors',
                                isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            )}
                        >
                            <Icon
                                className={cn(
                                    'h-5 w-5',
                                    isSelected ? 'text-primary' : 'text-muted-foreground'
                                )}
                            />
                            <div className="text-xs font-medium">{chart.label}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
