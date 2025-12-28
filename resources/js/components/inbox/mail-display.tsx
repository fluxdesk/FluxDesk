import { formatDateTime } from '@/lib/date';
import {
    Archive,
    ArchiveX,
    Forward,
    MoreVertical,
    Reply,
    ReplyAll,
    Trash2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import type { Ticket, Status, Priority, User, Contact } from '@/types';
import { usePage } from '@inertiajs/react';

interface MailDisplayProps {
    ticket?: Ticket | null;
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    contacts: Contact[];
}

export function MailDisplay({ ticket }: MailDisplayProps) {
    const getInitials = useInitials();
    const { props } = usePage<{ ticket?: Ticket }>();

    // Use the ticket from page props if available (for show page)
    const displayTicket = ticket || props.ticket;

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center p-2">
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!displayTicket}>
                                <Archive className="h-4 w-4" />
                                <span className="sr-only">Archiveren</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Archiveren</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!displayTicket}>
                                <ArchiveX className="h-4 w-4" />
                                <span className="sr-only">Naar spam</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Naar spam</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!displayTicket}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Naar prullenbak</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Naar prullenbak</TooltipContent>
                    </Tooltip>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!displayTicket}>
                                <Reply className="h-4 w-4" />
                                <span className="sr-only">Beantwoorden</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Beantwoorden</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!displayTicket}>
                                <ReplyAll className="h-4 w-4" />
                                <span className="sr-only">Allen beantwoorden</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Allen beantwoorden</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!displayTicket}>
                                <Forward className="h-4 w-4" />
                                <span className="sr-only">Doorsturen</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Doorsturen</TooltipContent>
                    </Tooltip>
                </div>
                <Separator orientation="vertical" className="mx-2 h-6" />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={!displayTicket}>
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Meer</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>Markeer als ongelezen</DropdownMenuItem>
                        <DropdownMenuItem>Label toevoegen</DropdownMenuItem>
                        <DropdownMenuItem>Status wijzigen</DropdownMenuItem>
                        <DropdownMenuItem>Toewijzen aan...</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <Separator />
            {displayTicket ? (
                <div className="flex flex-1 flex-col">
                    <div className="flex items-start p-4">
                        <div className="flex items-start gap-4 text-sm">
                            <Avatar>
                                <AvatarImage alt={displayTicket.contact?.name || ''} />
                                <AvatarFallback>
                                    {getInitials(displayTicket.contact?.name || displayTicket.contact?.email || '')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid gap-1">
                                <div className="font-semibold">
                                    {displayTicket.contact?.name || 'Onbekend'}
                                </div>
                                <div className="line-clamp-1 text-xs">{displayTicket.subject}</div>
                                <div className="line-clamp-1 text-xs">
                                    <span className="font-medium">Van:</span>{' '}
                                    {displayTicket.contact?.email}
                                </div>
                            </div>
                        </div>
                        {displayTicket.created_at && (
                            <div className="ml-auto text-xs text-muted-foreground">
                                {formatDateTime(displayTicket.created_at)}
                            </div>
                        )}
                    </div>
                    <Separator />
                    <div className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm">
                        {displayTicket.messages?.map((message) => (
                            <div key={message.id} className="mb-6">
                                <div className="mb-2 flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-[10px]">
                                            {getInitials(message.sender_name || '')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-sm">{message.sender_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDateTime(message.created_at)}
                                    </span>
                                </div>
                                <div className="pl-8 text-sm">{message.content}</div>
                            </div>
                        )) || <p className="text-muted-foreground">Geen berichten</p>}
                    </div>
                    <Separator className="mt-auto" />
                    <div className="p-4">
                        <form>
                            <div className="grid gap-4">
                                <Textarea
                                    className="p-4"
                                    placeholder={`Antwoord aan ${displayTicket.contact?.name || 'klant'}...`}
                                />
                                <div className="flex items-center">
                                    <Button size="sm" className="ml-auto">
                                        Versturen
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
                    Geen ticket geselecteerd
                </div>
            )}
        </div>
    );
}
