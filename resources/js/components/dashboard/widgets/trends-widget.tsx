import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Trends } from '@/types/dashboard';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TrendsWidgetProps {
    trends: Trends;
}

export function TrendsWidget({ trends }: TrendsWidgetProps) {
    const { t } = useTranslation('dashboard');

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-base">{t('trends.title')}</CardTitle>
                <CardDescription>{t('trends.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-6">
                    <TrendItem
                        label={t('trends.new_tickets')}
                        current={trends.created.current}
                        change={trends.created.change}
                    />
                    <TrendItem
                        label={t('trends.resolved_tickets')}
                        current={trends.resolved.current}
                        change={trends.resolved.change}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function TrendItem({ label, current, change }: { label: string; current: number; change: number }) {
    const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
    const colorClass =
        change > 0
            ? 'text-green-600 dark:text-green-400'
            : change < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-muted-foreground';

    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{current}</span>
                <span className={`flex items-center gap-0.5 text-sm font-medium ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                    {Math.abs(change)}%
                </span>
            </div>
        </div>
    );
}
