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
    Users,
    Plus,
    X,
    Loader2,
} from 'lucide-react';
import api from '@/lib/axios';
import { differenceInMinutes } from 'date-fns';
import { formatDateTime, formatRelative } from '@/lib/date';
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
import { useTranslation } from 'react-i18next';

interface TicketActionsProps {
    ticket: Ticket;
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    contacts?: Contact[];
}

export function TicketActions({ ticket, statuses, priorities, agents, contacts = [] }: TicketActionsProps) {
    const { t } = useTranslation('ticket');
    const getInitials = useInitials();
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [ccEmail, setCcEmail] = useState('');
    const [ccLoading, setCcLoading] = useState(false);
    const [removingCcId, setRemovingCcId] = useState<number | null>(null);

    const addCcContact = async () => {
        if (!ccEmail.trim()) return;
        setCcLoading(true);
        try {
            await api.post(`/inbox/${ticket.id}/cc`, { email: ccEmail.trim() });
            setCcEmail('');
            router.reload({ only: ['ticket'] });
        } catch {
            // Error handling - could show toast
        } finally {
            setCcLoading(false);
        }
    };

    const removeCcContact = async (ccId: number) => {
        setRemovingCcId(ccId);
        try {
            await api.delete(`/inbox/${ticket.id}/cc/${ccId}`);
            router.reload({ only: ['ticket'] });
        } catch {
            // Error handling
        } finally {
            setRemovingCcId(null);
        }
    };

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
                                    {ticket.contact?.name || t('details.unknown')}
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

                {/* CC Contacts Section */}
                <div className="rounded-lg border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            {t('cc.title')}
                        </span>
                    </div>

                    {/* Existing CC contacts */}
                    {ticket.cc_contacts && ticket.cc_contacts.length > 0 && (
                        <div className="mb-3 space-y-2">
                            {ticket.cc_contacts.map((cc) => (
                                <div
                                    key={cc.id}
                                    className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm">
                                            {cc.name || cc.email}
                                        </p>
                                        {cc.name && (
                                            <p className="truncate text-xs text-muted-foreground">
                                                {cc.email}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeCcContact(cc.id)}
                                        disabled={removingCcId === cc.id}
                                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                                    >
                                        {removingCcId === cc.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <X className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add CC input */}
                    <div className="flex gap-2">
                        <Input
                            type="email"
                            placeholder={t('cc.add_placeholder')}
                            value={ccEmail}
                            onChange={(e) => setCcEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCcContact()}
                            className="h-8 text-sm"
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={addCcContact}
                            disabled={ccLoading || !ccEmail.trim()}
                            className="h-8 px-2"
                        >
                            {ccLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Properties Section */}
                <div className="rounded-lg border bg-card p-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                {t('details.status')}
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
                                {t('details.priority')}
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
                                {t('details.assigned_to')}
                            </label>
                            <Select
                                value={ticket.assigned_to ? String(ticket.assigned_to) : 'unassigned'}
                                onValueChange={(value) =>
                                    updateTicket('assigned_to', value === 'unassigned' ? null : value)
                                }
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder={t('details.unassigned')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">
                                        <span className="text-muted-foreground">{t('details.unassigned')}</span>
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
                                            {t('sla.first_response')}
                                        </span>
                                        {ticket.first_response_at ? (
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                {t('sla.done')}
                                            </span>
                                        ) : (
                                            <span className={`text-xs font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                                                {formatRelative(ticket.sla_first_response_due_at)}
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
                                            {t('sla.resolution')}
                                        </span>
                                        {ticket.resolved_at ? (
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                {t('sla.done')}
                                            </span>
                                        ) : (
                                            <span className={`text-xs font-medium ${resolutionOverdue ? 'text-destructive' : ''}`}>
                                                {formatRelative(ticket.sla_resolution_due_at)}
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
                                {t('details.tags')}
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
                            {t('timeline.title')}
                        </span>
                    </div>
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('timeline.created')}</span>
                            <span>{formatDateTime(ticket.created_at)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('timeline.updated')}</span>
                            <span>{formatRelative(ticket.updated_at)}</span>
                        </div>
                        {ticket.first_response_at && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t('timeline.first_response')}</span>
                                <span>{formatDateTime(ticket.first_response_at)}</span>
                            </div>
                        )}
                        {ticket.resolved_at && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t('timeline.resolved')}</span>
                                <span>{formatDateTime(ticket.resolved_at)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Change Contact Dialog */}
            <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('contact_dialog.change_title')}</DialogTitle>
                        <DialogDescription>
                            {t('contact_dialog.change_description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="contact-search">{t('contact_dialog.search_label')}</Label>
                            <Input
                                id="contact-search"
                                placeholder={t('contact_dialog.search_hint')}
                                value={contactSearch}
                                onChange={(e) => setContactSearch(e.target.value)}
                            />
                        </div>
                        <div className="max-h-[300px] space-y-1 overflow-y-auto">
                            {filteredContacts.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    {t('contact_dialog.no_contacts')}
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
                                                {contact.name || t('details.unknown')}
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
                            {t('common:buttons.cancel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
