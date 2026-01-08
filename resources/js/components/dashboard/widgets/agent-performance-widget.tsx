import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { AgentPerformance } from '@/types/dashboard';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface AgentPerformanceWidgetProps {
    agents: AgentPerformance[];
}

export function AgentPerformanceWidget({ agents }: AgentPerformanceWidgetProps) {
    const { t } = useTranslation('dashboard');

    const agentChartConfig = {
        total_assigned: {
            label: t('charts.assigned'),
            color: 'var(--color-chart-1)',
        },
        resolved_count: {
            label: t('charts.resolved'),
            color: 'var(--color-chart-2)',
        },
    } satisfies ChartConfig;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    {t('agent_performance.title')}
                </CardTitle>
                <CardDescription>{t('agent_performance.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                {agents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Users className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{t('agent_performance.no_activity')}</p>
                    </div>
                ) : (
                    <ChartContainer config={agentChartConfig} className="h-[200px] w-full">
                        <BarChart data={agents} layout="vertical" margin={{ left: 0, right: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={80}
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar
                                dataKey="total_assigned"
                                fill="var(--color-total_assigned)"
                                radius={4}
                                barSize={12}
                            />
                            <Bar
                                dataKey="resolved_count"
                                fill="var(--color-resolved_count)"
                                radius={4}
                                barSize={12}
                            />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
