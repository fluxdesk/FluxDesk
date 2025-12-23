import { Head } from '@inertiajs/react';
import { Mail } from '@/components/inbox/mail';
import type { Ticket, Status, Priority, User, Contact, InboxFilters, PaginatedData, TicketFolder, Tag, EmailChannel, Department } from '@/types';

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
    departments: Department[];
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
    departments,
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
                    departments={departments}
                    filters={filters}
                    selectedTicket={ticket}
                />
            </div>
        </>
    );
}
