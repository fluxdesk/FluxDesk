import { InboxListHeader } from '@/components/inbox/inbox-list-header';
import { TicketListItem } from '@/components/tickets/ticket-list-item';
import { Skeleton } from '@/components/ui/skeleton';
import type { Ticket, Status, Priority, User, Contact, InboxFilters, PaginatedData } from '@/types';

interface TicketListProps {
    tickets: PaginatedData<Ticket>;
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    contacts: Contact[];
    filters: InboxFilters;
    selectedTicketId?: number;
    unreadCount?: number;
}

export function TicketList({
    tickets,
    statuses,
    priorities,
    agents,
    contacts,
    filters,
    selectedTicketId,
    unreadCount = 0,
}: TicketListProps) {
    return (
        <div className="flex h-full flex-col">
            <InboxListHeader
                statuses={statuses}
                priorities={priorities}
                agents={agents}
                contacts={contacts}
                filters={filters}
                totalCount={tickets.total}
                unreadCount={unreadCount}
            />

            <div className="flex-1 overflow-y-auto">
                {tickets.data.length === 0 ? (
                    <EmptyTicketList />
                ) : (
                    <div className="divide-y divide-border/30">
                        {tickets.data.map((ticket) => (
                            <TicketListItem
                                key={ticket.id}
                                ticket={ticket}
                                isSelected={ticket.id === selectedTicketId}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function EmptyTicketList() {
    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-3 rounded-xl bg-muted/50 p-4">
                <svg
                    className="h-8 w-8 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                    />
                </svg>
            </div>
            <h3 className="mb-1 text-sm font-medium text-foreground/80">No tickets found</h3>
            <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
        </div>
    );
}

export function TicketListSkeleton() {
    return (
        <div className="flex h-full flex-col">
            <div className="border-b border-border/50 p-4">
                <Skeleton className="mb-3 h-6 w-24" />
                <Skeleton className="h-9 w-full" />
            </div>
            <div className="flex-1 divide-y divide-border/30">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex gap-3 p-4">
                        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
