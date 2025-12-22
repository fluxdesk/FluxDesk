import { Head } from '@inertiajs/react';
import { Mail } from '@/components/inbox/mail';
import type { Ticket, Status, Priority, User, Contact, InboxFilters, PaginatedData, TicketFolder, Tag, EmailChannel } from '@/types';

interface InboxShowProps {
    ticket: Ticket;
    tickets: PaginatedData<Ticket>;
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    contacts: Contact[];
    folders: TicketFolder[];
    tags: Tag[];
    emailChannels: EmailChannel[];
    filters: InboxFilters;
}

export default function InboxShow({
    ticket,
    tickets,
    statuses,
    priorities,
    agents,
    contacts,
    folders,
    tags,
    emailChannels,
    filters,
}: InboxShowProps) {
    return (
        <>
            <Head title={`${ticket.ticket_number} - ${ticket.subject}`} />
            <div className="flex h-screen flex-col">
                <Mail
                    tickets={tickets}
                    statuses={statuses}
                    priorities={priorities}
                    agents={agents}
                    contacts={contacts}
                    folders={folders}
                    tags={tags}
                    emailChannels={emailChannels}
                    filters={filters}
                    selectedTicket={ticket}
                />
            </div>
        </>
    );
}
