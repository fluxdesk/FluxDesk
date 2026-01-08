import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import type { CustomWidget, WidgetSize } from '@/types/dashboard';
import { BarChart3 } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from 'recharts';

interface CustomQueryWidgetProps {
    widget: CustomWidget;
    data: unknown;
    size: WidgetSize;
}

const COLORS = [
    'oklch(0.705 0.213 47.604)',
    'oklch(0.646 0.222 41.116)',
    'oklch(0.837 0.128 66.29)',
    'oklch(0.6 0.2 280)',
    'oklch(0.7 0.15 180)',
    'oklch(0.55 0.18 220)',
    'oklch(0.75 0.16 140)',
    'oklch(0.65 0.2 320)',
];

export function CustomQueryWidget({ widget, data, size }: CustomQueryWidgetProps) {
    const chartData = Array.isArray(data) ? data : [];

    if (widget.chart_type === 'number') {
        const numberData = data as { value: number; label: string } | null;
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{widget.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 items-center justify-center">
                    <div className="text-center">
                        <div className="text-4xl font-bold">{numberData?.value ?? 0}</div>
                        <div className="text-sm text-muted-foreground">
                            {numberData?.label ?? 'Total'}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[180px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (chartData.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{widget.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No data available</p>
                </CardContent>
            </Card>
        );
    }

    const chartHeight = size === 'sm' ? 120 : size === 'md' ? 180 : 240;

    if (widget.chart_type === 'pie') {
        const innerRadius = size === 'sm' ? 30 : 40;
        const outerRadius = size === 'sm' ? 50 : 70;

        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{widget.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className={`mx-auto h-[${chartHeight}px] w-full`}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={innerRadius}
                                outerRadius={outerRadius}
                                paddingAngle={2}
                            >
                                {chartData.map((entry: { color?: string }, index: number) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color || COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        );
    }

    if (widget.chart_type === 'line') {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{widget.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className={`h-[${chartHeight}px] w-full`}>
                        <LineChart data={chartData} margin={{ left: 0, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                fontSize={11}
                                tickMargin={8}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                fontSize={11}
                                width={40}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={COLORS[0]}
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        );
    }

    // Default: Bar chart
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">{widget.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className={`h-[${chartHeight}px] w-full`}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0 }}>
                        <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={80}
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" radius={4}>
                            {chartData.map((entry: { color?: string }, index: number) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color || COLORS[index % COLORS.length]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
