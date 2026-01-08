import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { WidgetSize } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { getWidgetSizeClass } from './widget-registry';

interface WidgetSkeletonProps {
    size?: WidgetSize;
    type?: 'metric' | 'chart' | 'table';
}

export function WidgetSkeleton({ size = 'md', type = 'chart' }: WidgetSkeletonProps) {
    if (type === 'metric') {
        return (
            <div className={cn(getWidgetSizeClass(size))}>
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="mb-1 h-8 w-16" />
                        <Skeleton className="h-3 w-28" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (type === 'table') {
        return (
            <div className={cn(getWidgetSizeClass(size))}>
                <Card className="h-full">
                    <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-48" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Default: chart skeleton
    const chartHeight = size === 'sm' ? 'h-[100px]' : size === 'md' ? 'h-[160px]' : 'h-[200px]';

    return (
        <div className={cn(getWidgetSizeClass(size))}>
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className={cn('w-full rounded-lg', chartHeight)} />
                </CardContent>
            </Card>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="grid grid-cols-12 gap-4">
            {/* Four metric cards */}
            <WidgetSkeleton size="sm" type="metric" />
            <WidgetSkeleton size="sm" type="metric" />
            <WidgetSkeleton size="sm" type="metric" />
            <WidgetSkeleton size="sm" type="metric" />

            {/* Two medium charts */}
            <WidgetSkeleton size="md" type="chart" />
            <WidgetSkeleton size="md" type="chart" />

            {/* Full width chart */}
            <WidgetSkeleton size="lg" type="chart" />

            {/* Two more medium charts */}
            <WidgetSkeleton size="md" type="chart" />
            <WidgetSkeleton size="md" type="table" />
        </div>
    );
}
