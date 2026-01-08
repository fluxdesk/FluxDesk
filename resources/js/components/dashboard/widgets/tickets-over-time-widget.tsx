import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { TimeData } from '@/types/dashboard';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface TicketsOverTimeWidgetProps {
    data: TimeData[];
    selectedRange: string;
}

export function TicketsOverTimeWidget({ data, selectedRange }: TicketsOverTimeWidgetProps) {
    const { t } = useTranslation('dashboard');

    const chartConfig = {
        created: {
            label: t('charts.created'),
            color: 'var(--color-chart-1)',
        },
        resolved: {
            label: t('charts.resolved'),
            color: 'var(--color-chart-2)',
        },
    } satisfies ChartConfig;

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('activity.title')}</CardTitle>
                <CardDescription>
                    {t(`date_ranges.${selectedRange}`) || t('date_ranges.7d')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-created)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-created)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-resolved)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-resolved)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            fontSize={12}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            fontSize={12}
                            allowDecimals={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                            type="monotone"
                            dataKey="created"
                            stroke="var(--color-created)"
                            fill="url(#fillCreated)"
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="resolved"
                            stroke="var(--color-resolved)"
                            fill="url(#fillResolved)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
