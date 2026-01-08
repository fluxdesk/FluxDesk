import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { StatusData } from '@/types/dashboard';
import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart } from 'recharts';

interface TicketsByStatusWidgetProps {
    data: StatusData[];
}

export function TicketsByStatusWidget({ data }: TicketsByStatusWidgetProps) {
    const { t } = useTranslation('dashboard');
    const filteredData = data.filter((s) => s.value > 0);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-base">{t('activity.tickets_per_status')}</CardTitle>
                <CardDescription>{t('activity.current_distribution')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center">
                    <ChartContainer config={{}} className="h-[200px] w-[200px]">
                        <PieChart>
                            <Pie
                                data={filteredData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                            >
                                {filteredData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                    <div className="ml-4 space-y-2">
                        {data.map((status) => (
                            <div key={status.name} className="flex items-center gap-2 text-sm">
                                <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: status.color }}
                                />
                                <span className="text-muted-foreground">{status.name}</span>
                                <span className="font-medium">{status.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
