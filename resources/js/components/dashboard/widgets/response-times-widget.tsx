import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ResponseTimeMetrics } from '@/types/dashboard';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ResponseTimesWidgetProps {
    metrics: ResponseTimeMetrics;
}

function useFormatTime() {
    const { t } = useTranslation('dashboard');
    return (hours: number): string => {
        if (hours === 0) return t('time.hours', { count: 0 });
        if (hours < 1) return t('time.minutes', { count: Math.round(hours * 60) });
        if (hours < 24) return t('time.hours', { count: Math.round(hours) });
        return t('time.days', { count: Math.round(hours / 24) });
    };
}

export function ResponseTimesWidget({ metrics }: ResponseTimesWidgetProps) {
    const { t } = useTranslation('dashboard');
    const formatTime = useFormatTime();

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" />
                    {t('response_times.title')}
                </CardTitle>
                <CardDescription>{t('response_times.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{t('response_times.first_response')}</p>
                        <p className="text-3xl font-bold">{formatTime(metrics.avgFirstResponse)}</p>
                        <p className="text-xs text-muted-foreground">{t('response_times.average')}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{t('response_times.resolution_time')}</p>
                        <p className="text-3xl font-bold">{formatTime(metrics.avgResolution)}</p>
                        <p className="text-xs text-muted-foreground">{t('response_times.average')}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
