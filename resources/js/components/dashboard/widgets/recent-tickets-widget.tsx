import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Ticket } from '@/types';
import { Link } from '@inertiajs/react';
import { Inbox, Ticket as TicketIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RecentTicketsWidgetProps {
    tickets: Ticket[];
}

export function RecentTicketsWidget({ tickets }: RecentTicketsWidgetProps) {
    const { t } = useTranslation('dashboard');

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <TicketIcon className="h-4 w-4" />
                    {t('recent_tickets.title')}
                </CardTitle>
                <CardDescription>{t('recent_tickets.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                {tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Inbox className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{t('recent_tickets.empty')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {tickets.map((ticket) => (
                            <Link
                                key={ticket.id}
                                href={`/inbox/${ticket.id}`}
                                prefetch
                                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                            >
                                <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: ticket.status?.color }}
                                />
                                <div className="flex-1 truncate">
                                    <p className="truncate text-sm font-medium">{ticket.subject}</p>
                                    <p className="text-xs text-muted-foreground">
                                        #{ticket.ticket_number} &middot;{' '}
                                        {ticket.contact?.name || ticket.contact?.email}
                                    </p>
                                </div>
                                <div
                                    className="rounded px-2 py-0.5 text-xs"
                                    style={{
                                        backgroundColor: `${ticket.priority?.color}20`,
                                        color: ticket.priority?.color,
                                    }}
                                >
                                    {ticket.priority?.name}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
