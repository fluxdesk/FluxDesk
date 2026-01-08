import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Ticket } from '@/types';
import { Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SlaAlertsWidgetProps {
    slaAtRisk: Ticket[];
    slaBreached: Ticket[];
}

export function SlaAlertsWidget({ slaAtRisk, slaBreached }: SlaAlertsWidgetProps) {
    const { t } = useTranslation('dashboard');

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    {t('sla.title')}
                </CardTitle>
                <CardDescription>{t('sla.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                {slaBreached.length === 0 && slaAtRisk.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
                        <p className="text-sm text-muted-foreground">{t('sla.all_within_sla')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {slaBreached.map((ticket) => (
                            <SlaTicketRow key={ticket.id} ticket={ticket} variant="breached" />
                        ))}
                        {slaAtRisk.map((ticket) => (
                            <SlaTicketRow key={ticket.id} ticket={ticket} variant="at-risk" />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SlaTicketRow({
    ticket,
    variant,
}: {
    ticket: Ticket;
    variant: 'breached' | 'at-risk';
}) {
    const { t } = useTranslation('dashboard');
    const deadline = new Date(ticket.sla_resolution_due_at!);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
    const minutes = Math.abs(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));

    const timeText =
        variant === 'breached'
            ? t('sla.overdue', { hours, minutes })
            : t('sla.remaining', { hours, minutes });

    return (
        <Link
            href={`/inbox/${ticket.id}`}
            prefetch
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                variant === 'breached'
                    ? 'border-destructive/50 bg-destructive/5'
                    : 'border-amber-500/50 bg-amber-500/5'
            }`}
        >
            <Clock
                className={`h-4 w-4 ${
                    variant === 'breached' ? 'text-destructive' : 'text-amber-500'
                }`}
            />
            <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium">{ticket.subject}</p>
                <p className="text-xs text-muted-foreground">
                    #{ticket.ticket_number} &middot; {ticket.contact?.name || ticket.contact?.email}
                </p>
            </div>
            <span
                className={`text-xs font-medium ${
                    variant === 'breached' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
                }`}
            >
                {timeText}
            </span>
        </Link>
    );
}
