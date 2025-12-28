import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PortalLayout from '@/layouts/portal/portal-layout';
import { type PaginatedData } from '@/types';
import { type PortalSharedData, type PortalTicket } from '@/types/portal';
import { Head, Link, usePage } from '@inertiajs/react';
import { formatRelative } from '@/lib/date';
import { Clock, MessageSquare, Plus, Ticket } from 'lucide-react';

interface Props {
    tickets: PaginatedData<PortalTicket>;
}

export default function PortalDashboard({ tickets }: Props) {
    const { contact, organization } = usePage<PortalSharedData>().props;
    const primaryColor = organization?.settings?.primary_color ?? '#18181b';
    const orgSlug = organization?.slug ?? '';

    return (
        <PortalLayout>
            <Head title="Dashboard" />

            {/* Welcome Card */}
            <Card className="mb-6">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl">
                        Welkom terug, {contact?.display_name ?? 'klant'}!
                    </CardTitle>
                    <CardDescription>
                        Bekijk en beheer al je support tickets op één plek.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <Link href={`/${orgSlug}/portal/tickets/create`}>
                        <Button
                            className="text-white"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Plus className="size-4 mr-2" />
                            Nieuw ticket aanmaken
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            {/* Tickets List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Mijn tickets</h2>
                    <span className="text-sm text-muted-foreground">
                        {tickets.total} {tickets.total === 1 ? 'ticket' : 'tickets'}
                    </span>
                </div>

                {tickets.data.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div
                                className="flex size-16 items-center justify-center rounded-full mb-4"
                                style={{ backgroundColor: `${primaryColor}15` }}
                            >
                                <Ticket className="size-8" style={{ color: primaryColor }} />
                            </div>
                            <h3 className="text-lg font-medium mb-1">Geen tickets gevonden</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                                Je hebt nog geen support tickets. Maak een nieuw ticket aan als je hulp nodig hebt.
                            </p>
                            <Link href={`/${orgSlug}/portal/tickets/create`}>
                                <Button
                                    variant="outline"
                                    className="border-2"
                                    style={{ borderColor: primaryColor, color: primaryColor }}
                                >
                                    <Plus className="size-4 mr-2" />
                                    Nieuw ticket
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {tickets.data.map((ticket) => (
                            <TicketCard key={ticket.id} ticket={ticket} orgSlug={orgSlug} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {tickets.last_page > 1 && (
                    <div className="flex justify-center gap-2 pt-4">
                        {tickets.links.map((link, i) => {
                            if (i === 0 || i === tickets.links.length - 1) return null;
                            return (
                                <Link
                                    key={i}
                                    href={link.url ?? '#'}
                                    className={`size-9 flex items-center justify-center rounded-md text-sm ${
                                        link.active
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted hover:bg-muted/80'
                                    } ${!link.url ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </PortalLayout>
    );
}

function TicketCard({ ticket, orgSlug }: { ticket: PortalTicket; orgSlug: string }) {
    return (
        <Link href={`/${orgSlug}/portal/tickets/${ticket.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-muted-foreground">
                                    #{ticket.ticket_number}
                                </span>
                                {ticket.status && (
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                        style={{
                                            borderColor: ticket.status.color,
                                            color: ticket.status.color,
                                            backgroundColor: `${ticket.status.color}15`,
                                        }}
                                    >
                                        {ticket.status.name}
                                    </Badge>
                                )}
                            </div>
                            <h3 className="font-medium text-foreground truncate">
                                {ticket.subject}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {formatRelative(ticket.updated_at)}
                                </span>
                                {ticket.messages_count !== undefined && (
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="size-3" />
                                        {ticket.messages_count} {ticket.messages_count === 1 ? 'bericht' : 'berichten'}
                                    </span>
                                )}
                            </div>
                        </div>
                        {ticket.priority && (
                            <Badge
                                variant="secondary"
                                className="shrink-0"
                                style={{
                                    backgroundColor: `${ticket.priority.color}20`,
                                    color: ticket.priority.color,
                                }}
                            >
                                {ticket.priority.name}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
