import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChannelData } from '@/types/dashboard';
import { Code, Globe, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart } from 'recharts';

interface ChannelBreakdownWidgetProps {
    data: ChannelData[];
}

const icons: Record<string, React.ElementType> = {
    globe: Globe,
    mail: Mail,
    code: Code,
};

export function ChannelBreakdownWidget({ data }: ChannelBreakdownWidgetProps) {
    const { t } = useTranslation('dashboard');
    const hasData = data.some((d) => d.value > 0);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-base">{t('channels.title')}</CardTitle>
                <CardDescription>{t('channels.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Globe className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{t('channels.no_tickets')}</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-center">
                        <ChartContainer config={{}} className="h-[160px] w-[160px]">
                            <PieChart>
                                <Pie
                                    data={data.filter((d) => d.value > 0)}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={2}
                                >
                                    {data
                                        .filter((d) => d.value > 0)
                                        .map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                            </PieChart>
                        </ChartContainer>
                        <div className="ml-6 space-y-3">
                            {data.map((channel) => {
                                const IconComponent = icons[channel.icon] || Globe;
                                return (
                                    <div key={channel.name} className="flex items-center gap-3 text-sm">
                                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                                        <span className="min-w-[50px] text-muted-foreground">{channel.name}</span>
                                        <span className="font-medium">{channel.value}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
