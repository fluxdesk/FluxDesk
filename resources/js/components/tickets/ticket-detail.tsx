import { TicketHeader } from '@/components/tickets/ticket-header';
import { TicketActions } from '@/components/tickets/ticket-actions';
import { MessageThread } from '@/components/tickets/message-thread';
import { MessageComposer } from '@/components/tickets/message-composer';
import type { Ticket, Status, Priority, User, Contact } from '@/types';

interface TicketDetailProps {
    ticket: Ticket;
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    contacts?: Contact[];
}

export function TicketDetail({ ticket, statuses, priorities, agents, contacts = [] }: TicketDetailProps) {
    return (
        <div className="flex h-full">
            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <TicketHeader ticket={ticket} />
                <MessageThread messages={ticket.messages || []} />
                <MessageComposer ticket={ticket} />
            </div>

            {/* Sidebar - fixed width */}
            <div className="w-80 shrink-0 border-l border-border/50">
                <TicketActions
                    ticket={ticket}
                    statuses={statuses}
                    priorities={priorities}
                    agents={agents}
                    contacts={contacts}
                />
            </div>
        </div>
    );
}
