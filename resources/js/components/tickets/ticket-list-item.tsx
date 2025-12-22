import { Link } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { Ticket } from '@/types';

interface TicketListItemProps {
    ticket: Ticket;
    isSelected?: boolean;
}

export function TicketListItem({ ticket, isSelected }: TicketListItemProps) {
    const getInitials = useInitials();
    const contactName = ticket.contact?.name || ticket.contact?.email || 'Unknown';
    const previewText = ticket.latest_message?.[0]?.body || 'No messages yet';
    const timeAgo = formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: nl });

    return (
        <Link
            href={`/inbox/${ticket.id}`}
            className={cn(
                'group relative flex cursor-pointer gap-3 border-b border-border/30 px-3 py-3 transition-all duration-150',
                'hover:bg-muted/50',
                isSelected && 'bg-muted/70 hover:bg-muted/70',
                !ticket.is_read && 'bg-primary/5',
            )}
        >
            {/* Priority indicator */}
            <div
                className="absolute left-0 top-0 h-full w-1 rounded-r transition-opacity"
                style={{
                    backgroundColor: ticket.priority?.color || '#6b7280',
                    opacity: isSelected ? 1 : 0.6,
                }}
            />

            {/* Unread indicator */}
            {!ticket.is_read && (
                <div className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
            )}

            {/* Contact Avatar */}
            <Avatar className="mt-0.5 h-9 w-9 shrink-0 border border-border/50">
                <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                    {getInitials(contactName)}
                </AvatarFallback>
            </Avatar>

            {/* Content */}
            <div className="min-w-0 flex-1">
                {/* Header row */}
                <div className="mb-0.5 flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                        {contactName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo}</span>
                </div>

                {/* Subject */}
                <div className="mb-1 flex items-center gap-2">
                    <span className="truncate text-sm text-foreground/90">{ticket.subject}</span>
                </div>

                {/* Preview */}
                <p className="mb-1.5 truncate text-xs text-muted-foreground">{previewText}</p>

                {/* Footer: Ticket number, status, assignee */}
                <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                        {ticket.ticket_number}
                    </span>
                    <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                            backgroundColor: `${ticket.status?.color}18`,
                            color: ticket.status?.color,
                        }}
                    >
                        {ticket.status?.name}
                    </span>
                    {ticket.assignee ? (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[8px]">
                                    {getInitials(ticket.assignee.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[60px]">{ticket.assignee.name.split(' ')[0]}</span>
                        </span>
                    ) : (
                        <span className="text-[10px] italic text-muted-foreground/60">Unassigned</span>
                    )}
                </div>
            </div>
        </Link>
    );
}
