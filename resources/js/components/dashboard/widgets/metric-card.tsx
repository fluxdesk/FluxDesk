import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: number;
    description: string;
    icon: LucideIcon;
    variant?: 'default' | 'warning' | 'destructive' | 'success';
}

const variantStyles = {
    default: '',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    destructive: 'bg-destructive/10 text-destructive',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
};

const iconStyles = {
    default: 'text-muted-foreground',
    warning: 'text-amber-500',
    destructive: 'text-destructive',
    success: 'text-green-500',
};

export function MetricCard({
    title,
    value,
    description,
    icon: Icon,
    variant = 'default',
}: MetricCardProps) {
    return (
        <Card className={variant !== 'default' ? variantStyles[variant] : ''}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${iconStyles[variant]}`} />
                </div>
            </CardContent>
        </Card>
    );
}
