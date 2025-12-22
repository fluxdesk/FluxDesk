import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Clock,
    Calendar,
    Tag as TagIcon,
    AlertTriangle,
    CheckCircle,
    Phone,
    Building2,
    Pencil,
} from 'lucide-react';
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import type { Ticket, Status, Priority, User, Contact } from '@/types';

interface TicketActionsProps {
    ticket: Ticket;
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    contacts?: Contact[];
}

export function TicketActions({ ticket, statuses, priorities, agents, contacts = [] }: TicketActionsProps) {
    const getInitials = useInitials();
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [contactSearch, setContactSearch] = useState('');

    const updateTicket = (field: string, value: string | null) => {
        router.patch(
            `/inbox/${ticket.id}`,
            { [field]: value },
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleContactChange = (contactId: number) => {
        updateTicket('contact_id', String(contactId));
        setContactDialogOpen(false);
    };

    const filteredContacts = contacts.filter(
        (contact) =>
            contact.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
            contact.email.toLowerCase().includes(contactSearch.toLowerCase()),
    );

    // SLA calculations
    const now = new Date();

    const calculateSlaProgress = (dueAt: string | null, respondedAt: string | null) => {
        if (!dueAt) return null;
        if (respondedAt) return 100; // Completed

        const due = new Date(dueAt);
        const created = new Date(ticket.created_at);
        const totalMinutes = differenceInMinutes(due, created);
        const elapsedMinutes = differenceInMinutes(now, created);

        if (totalMinutes <= 0) return 100;
        const progress = Math.min(100, (elapsedMinutes / totalMinutes) * 100);
        return progress;
    };

    const firstResponseProgress = calculateSlaProgress(ticket.sla_first_response_due_at, ticket.first_response_at);
    const resolutionProgress = calculateSlaProgress(ticket.sla_resolution_due_at, ticket.resolved_at);

    const isOverdue = ticket.sla_first_response_due_at && !ticket.first_response_at && new Date(ticket.sla_first_response_due_at) < now;
    const resolutionOverdue = ticket.sla_resolution_due_at && !ticket.resolved_at && new Date(ticket.sla_resolution_due_at) < now;

    const getProgressColor = (progress: number | null, overdue: boolean) => {
        if (overdue) return 'bg-destructive';
        if (progress === null) return 'bg-muted';
        if (progress >= 90) return 'bg-amber-500';
        return 'bg-primary';
    };

    return (
        <div className="h-full overflow-y-auto bg-muted/30">
            <div className="space-y-3 p-4">
                {/* Contact Section */}
                <div className="rounded-lg border bg-card">
                    <button
                        onClick={() => setContactDialogOpen(true)}
                        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                    >
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                                <AvatarFallback className="bg-primary/10 text-sm text-primary">
                                    {getInitials(ticket.contact?.name || ticket.contact?.email || '')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate font-medium">
                                    {ticket.contact?.name || 'Unknown'}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                    {ticket.contact?.email}
                                </p>
                            </div>
                        </div>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {(ticket.contact?.phone || ticket.contact?.company) && (
                        <div className="border-t px-4 py-3">
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                                {ticket.contact?.phone && (
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5" />
                                        {ticket.contact.phone}
                                    </span>
                                )}
                                {ticket.contact?.company && (
                                    <span className="flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5" />
                                        {ticket.contact.company}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Properties Section */}
                <div className="rounded-lg border bg-card p-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Status
                            </label>
                            <Select
                                value={String(ticket.status_id)}
                                onValueChange={(value) => updateTicket('status_id', value)}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map((status) => (
                                        <SelectItem key={status.id} value={String(status.id)}>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: status.color }}
                                                />
                                                {status.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Priority
                            </label>
                            <Select
                                value={String(ticket.priority_id)}
                                onValueChange={(value) => updateTicket('priority_id', value)}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {priorities.map((priority) => (
                                        <SelectItem key={priority.id} value={String(priority.id)}>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: priority.color }}
                                                />
                                                {priority.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Assignee
                            </label>
                            <Select
                                value={ticket.assigned_to ? String(ticket.assigned_to) : 'unassigned'}
                                onValueChange={(value) =>
                                    updateTicket('assigned_to', value === 'unassigned' ? null : value)
                                }
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">
                                        <span className="text-muted-foreground">Unassigned</span>
                                    </SelectItem>
                                    {agents.map((agent) => (
                                        <SelectItem key={agent.id} value={String(agent.id)}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarFallback className="text-[10px]">
                                                        {getInitials(agent.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {agent.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* SLA Section */}
                {ticket.sla && (
                    <div className={`rounded-lg border bg-card ${(isOverdue || resolutionOverdue) ? 'border-destructive/50' : ''}`}>
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{ticket.sla.name}</span>
                            </div>
                            {(isOverdue || resolutionOverdue) && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                        </div>
                        <div className="space-y-4 p-4">
                            {ticket.sla_first_response_due_at && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            First Response
                                        </span>
                                        {ticket.first_response_at ? (
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                Done
                                            </span>
                                        ) : (
                                            <span className={`text-xs font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                                                {formatDistanceToNow(new Date(ticket.sla_first_response_due_at), { addSuffix: true, locale: nl })}
                                            </span>
                                        )}
                                    </div>
                                    <Progress
                                        value={firstResponseProgress ?? 0}
                                        className="h-2"
                                        indicatorClassName={getProgressColor(firstResponseProgress, !!isOverdue)}
                                    />
                                </div>
                            )}

                            {ticket.sla_resolution_due_at && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Resolution
                                        </span>
                                        {ticket.resolved_at ? (
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                Done
                                            </span>
                                        ) : (
                                            <span className={`text-xs font-medium ${resolutionOverdue ? 'text-destructive' : ''}`}>
                                                {formatDistanceToNow(new Date(ticket.sla_resolution_due_at), { addSuffix: true, locale: nl })}
                                            </span>
                                        )}
                                    </div>
                                    <Progress
                                        value={resolutionProgress ?? 0}
                                        className="h-2"
                                        indicatorClassName={getProgressColor(resolutionProgress, !!resolutionOverdue)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tags Section */}
                {ticket.tags && ticket.tags.length > 0 && (
                    <div className="rounded-lg border bg-card p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <TagIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                                Tags
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {ticket.tags.map((tag) => (
                                <span
                                    key={tag.id}
                                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                                    style={{
                                        backgroundColor: `${tag.color}20`,
                                        color: tag.color,
                                    }}
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline Section */}
                <div className="rounded-lg border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            Timeline
                        </span>
                    </div>
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Created</span>
                            <span>{format(new Date(ticket.created_at), 'MMM d, h:mm a')}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Updated</span>
                            <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: nl })}</span>
                        </div>
                        {ticket.first_response_at && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">First response</span>
                                <span>{format(new Date(ticket.first_response_at), 'MMM d, h:mm a')}</span>
                            </div>
                        )}
                        {ticket.resolved_at && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Resolved</span>
                                <span>{format(new Date(ticket.resolved_at), 'MMM d, h:mm a')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Change Contact Dialog */}
            <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Contact</DialogTitle>
                        <DialogDescription>
                            Select a different contact for this ticket.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="contact-search">Search contacts</Label>
                            <Input
                                id="contact-search"
                                placeholder="Search by name or email..."
                                value={contactSearch}
                                onChange={(e) => setContactSearch(e.target.value)}
                            />
                        </div>
                        <div className="max-h-[300px] space-y-1 overflow-y-auto">
                            {filteredContacts.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    No contacts found
                                </p>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <button
                                        key={contact.id}
                                        onClick={() => handleContactChange(contact.id)}
                                        className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted ${
                                            contact.id === ticket.contact_id ? 'bg-primary/10' : ''
                                        }`}
                                    >
                                        <Avatar className="h-8 w-8 border">
                                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                                {getInitials(contact.name || contact.email)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {contact.name || 'Unknown'}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {contact.email}
                                            </p>
                                        </div>
                                        {contact.id === ticket.contact_id && (
                                            <CheckCircle className="h-4 w-4 text-primary" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
