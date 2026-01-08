import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

interface WidgetPreviewProps {
    data: unknown;
    chartType: 'bar' | 'pie' | 'line' | 'number';
    isLoading: boolean;
    name: string;
}

const COLORS = [
    'oklch(0.705 0.213 47.604)',
    'oklch(0.646 0.222 41.116)',
    'oklch(0.837 0.128 66.29)',
    'oklch(0.6 0.2 280)',
    'oklch(0.7 0.15 180)',
];

export function WidgetPreview({ data, chartType, isLoading, name }: WidgetPreviewProps) {
    if (isLoading) {
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

    const chartData = Array.isArray(data) ? data : [];

    if (chartType === 'number') {
        const numberData = data as { value: number; label: string } | null;
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{name}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
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

    if (chartData.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        No data available for preview
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (chartType === 'pie') {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="mx-auto h-[180px] w-[180px]">
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={2}
                            >
                                {chartData.map((entry: any, index: number) => (
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

    // Default: Bar chart
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">{name}</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[180px] w-full">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0 }}>
                        <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={70}
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" radius={4}>
                            {chartData.map((entry: any, index: number) => (
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
