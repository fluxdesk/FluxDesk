import { Head } from '@inertiajs/react';
import { Mail } from '@/components/inbox/mail';
import type { Ticket, Status, Priority, User, Contact, InboxFilters, PaginatedData, TicketFolder, Tag, EmailChannel, Department } from '@/types';

interface InboxIndexProps {
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

export default function InboxIndex({
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
}: InboxIndexProps) {
    return (
        <>
            <Head title="Postvak" />
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
                />
            </div>
        </>
    );
}
