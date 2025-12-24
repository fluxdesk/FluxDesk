'use client';

import DOMPurify from 'dompurify';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { MergeTicketsWizard } from '@/components/tickets/merge-tickets-wizard';
import * as React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
    MoreVertical,
    Trash2,
    Mail,
    MailOpen,
    Send,
    StickyNote,
    Clock,
    AlertTriangle,
    CheckCircle,
    Calendar,
    Tag as TagIcon,
    Phone,
    Building2,
    Pencil,
    Search,
    Check,
    FolderInput,
    Archive,
    Inbox,
    Eye,
    Download,
    FileText,
    Image as ImageIcon,
    Users,
    PanelRight,
    PanelRightClose,
    PanelRightOpen,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    AlertCircle,
    GitMerge,
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MentionTextarea } from '@/components/common/mention-textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import type { Ticket, Status, Priority, User, Contact, Message, TicketFolder, Tag } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { toast } from 'sonner';

interface TicketViewProps {
    ticket: Ticket;
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    contacts: Contact[];
    folders?: TicketFolder[];
    tags?: Tag[];
    currentFolder?: string;
    allTickets?: Ticket[];
}

export function TicketView({ ticket, statuses, priorities, agents, contacts, folders = [], currentFolder, allTickets = [] }: TicketViewProps) {
    const getInitials = useInitials();
    const [messageType, setMessageType] = React.useState<'reply' | 'note'>('reply');
    const [isChangeContactOpen, setIsChangeContactOpen] = React.useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
    const [isMergeOpen, setIsMergeOpen] = React.useState(false);
    const [contactSearch, setContactSearch] = React.useState('');
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('ticket-sidebar-collapsed') === 'true';
        }
        return false;
    });
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const messagesContainerRef = React.useRef<HTMLDivElement>(null);

    const toggleSidebar = React.useCallback(() => {
        setSidebarCollapsed((prev) => {
            const newValue = !prev;
            localStorage.setItem('ticket-sidebar-collapsed', String(newValue));
            return newValue;
        });
    }, []);

    // Auto-scroll to bottom when ticket changes or new messages arrive
    const scrollToBottom = React.useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Scroll to bottom on initial load and when messages change
    React.useEffect(() => {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
        return () => clearTimeout(timer);
    }, [ticket.id, ticket.messages?.length]);

    const { data, setData, post, processing, reset } = useForm({
        body: '',
        type: 'reply' as 'reply' | 'note',
    });

    const updateTicket = (field: string, value: string | number | null) => {
        router.patch(`/inbox/${ticket.id}`, { [field]: value }, {
            preserveScroll: true,
            onSuccess: () => toast.success('Ticket bijgewerkt'),
        });
    };

    const handleMarkUnread = () => {
        // Pass folder in request so backend can redirect to correct inbox view
        router.post(`/inbox/${ticket.id}/mark-unread`, { folder: currentFolder }, {
            onSuccess: () => toast.success('Gemarkeerd als ongelezen'),
        });
    };

    const handleDelete = () => {
        const deletedFolder = folders.find((f) => f.system_type === 'deleted');
        if (deletedFolder) {
            router.post(`/inbox/${ticket.id}/move`, { folder_id: deletedFolder.id }, {
                preserveScroll: true,
                onSuccess: () => toast.success('Ticket naar prullenbak verplaatst'),
            });
        } else {
            setShowDeleteDialog(true);
        }
    };

    const handlePermanentDelete = () => {
        setIsDeleting(true);
        router.delete(`/inbox/${ticket.id}`, {
            onSuccess: () => toast.success('Ticket verwijderd'),
            onFinish: () => {
                setIsDeleting(false);
                setShowDeleteDialog(false);
            },
        });
    };

    const handleMoveToFolder = (folderId: number | null) => {
        router.post(`/inbox/${ticket.id}/move`, { folder_id: folderId }, {
            preserveScroll: true,
            onSuccess: () => toast.success('Ticket verplaatst'),
        });
    };

    const handleArchive = () => {
        const archivedFolder = folders.find((f) => f.system_type === 'archived');
        if (archivedFolder) {
            handleMoveToFolder(archivedFolder.id);
        }
    };

    const handleSpam = () => {
        const spamFolder = folders.find((f) => f.system_type === 'spam');
        if (spamFolder) {
            handleMoveToFolder(spamFolder.id);
        }
    };

    const handleMarkAsSolved = () => {
        const solvedFolder = folders.find((f) => f.system_type === 'solved');
        if (solvedFolder) {
            router.post(`/inbox/${ticket.id}/move`, { folder_id: solvedFolder.id }, {
                preserveScroll: true,
                onSuccess: () => toast.success('Ticket gemarkeerd als opgelost'),
            });
        }
    };

    const solvedFolder = folders.find((f) => f.system_type === 'solved');
    const isSolved = ticket.folder_id === solvedFolder?.id;

    const handleSubmitMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!data.body.trim() || processing) return;

        post(`/inbox/${ticket.id}/messages`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                // Scroll to the new message after a short delay
                setTimeout(scrollToBottom, 150);
            },
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmitMessage();
        }
    };

    const handleContactChange = (contactId: number) => {
        updateTicket('contact_id', contactId);
        setIsChangeContactOpen(false);
        setContactSearch('');
    };

    const filteredContacts = contacts.filter((c) =>
        c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(contactSearch.toLowerCase())
    );

    // SLA calculations
    const isOverdue = ticket.sla_first_response_due_at && !ticket.first_response_at && new Date(ticket.sla_first_response_due_at) < new Date();
    const resolutionOverdue = ticket.sla_resolution_due_at && !ticket.resolved_at && new Date(ticket.sla_resolution_due_at) < new Date();

    const getProgressColor = (progress: number | null, overdue: boolean) => {
        if (overdue) return 'bg-destructive';
        if (progress === 100) return 'bg-green-500';
        if (progress && progress >= 90) return 'bg-amber-500';
        return 'bg-primary';
    };

    const calculateProgress = (due: string, created: string) => {
        const now = new Date();
        const dueDate = new Date(due);
        const createdDate = new Date(created);
        const total = dueDate.getTime() - createdDate.getTime();
        const elapsed = now.getTime() - createdDate.getTime();
        return Math.min(100, Math.max(0, (elapsed / total) * 100));
    };

    const firstResponseProgress = ticket.first_response_at
        ? 100
        : ticket.sla_first_response_due_at
            ? calculateProgress(ticket.sla_first_response_due_at, ticket.created_at)
            : null;

    const resolutionProgress = ticket.resolved_at
        ? 100
        : ticket.sla_resolution_due_at
            ? calculateProgress(ticket.sla_resolution_due_at, ticket.created_at)
            : null;

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main Content */}
            <div className="flex flex-1 flex-col min-h-0 bg-background">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-2 md:px-4 py-2 md:py-3 shrink-0">
                    {/* Mobile: Back button */}
                    <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0" asChild>
                        <Link href={currentFolder ? `/inbox?folder=${currentFolder}` : '/inbox'}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1 mx-2 md:mx-0">
                        <div className="flex items-center gap-2">
                            <h1 className="truncate text-base md:text-lg font-semibold">{ticket.subject}</h1>
                            <Badge variant="outline" className="shrink-0 text-xs hidden md:inline-flex">
                                #{ticket.ticket_number}
                            </Badge>
                        </div>
                        <div className="mt-0.5 md:mt-1 flex items-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground">
                            <span className="truncate">{ticket.contact?.name || ticket.contact?.email}</span>
                            <span className="shrink-0 hidden md:inline">&middot;</span>
                            <span className="shrink-0 hidden md:inline">{format(new Date(ticket.created_at), 'PPp')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5 md:gap-1">
                        {/* Mobile details button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden h-8 w-8"
                            onClick={() => setIsDetailsOpen(true)}
                        >
                            <PanelRight className="h-4 w-4" />
                        </Button>
                        {/* Desktop sidebar toggle */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hidden md:inline-flex"
                                    onClick={toggleSidebar}
                                >
                                    {sidebarCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{sidebarCollapsed ? 'Toon zijbalk' : 'Verberg zijbalk'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={handleMarkUnread}>
                                    {ticket.is_read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{ticket.is_read ? 'Markeer als ongelezen' : 'Gemarkeerd als ongelezen'}</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={handleMarkUnread}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Markeer als ongelezen
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <FolderInput className="mr-2 h-4 w-4" />
                                        Verplaats naar map
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="w-48">
                                        {/* Inbox (virtual folder - folder_id = null) */}
                                        <DropdownMenuItem onClick={() => handleMoveToFolder(null)}>
                                            <Inbox className="mr-2 h-4 w-4" />
                                            Postvak
                                            {ticket.folder_id === null && (
                                                <Check className="ml-auto h-4 w-4" />
                                            )}
                                        </DropdownMenuItem>
                                        {folders.length > 0 && <DropdownMenuSeparator />}
                                        {folders.map((folder) => (
                                            <DropdownMenuItem
                                                key={folder.id}
                                                onClick={() => handleMoveToFolder(folder.id)}
                                            >
                                                <span
                                                    className="mr-2 h-3 w-3 rounded"
                                                    style={{ backgroundColor: folder.color }}
                                                />
                                                {folder.name}
                                                {ticket.folder_id === folder.id && (
                                                    <Check className="ml-auto h-4 w-4" />
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                {!isSolved && (
                                    <DropdownMenuItem onClick={handleMarkAsSolved}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Markeer als opgelost
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleArchive}>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archiveren
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleSpam}>
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Markeer als spam
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsMergeOpen(true)}>
                                    <GitMerge className="mr-2 h-4 w-4" />
                                    Tickets samenvoegen
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Ticket verwijderen
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Messages - scrollable area */}
                <ScrollArea className="flex-1 min-h-0">
                    <div ref={messagesContainerRef} className="p-4">
                        <div className="space-y-4">
                            {ticket.messages && ticket.messages.length > 0 ? (
                                ticket.messages.map((message) => (
                                    <MessageBubble key={message.id} message={message} ticket={ticket} />
                                ))
                            ) : (
                                <div className="flex items-center justify-center py-8 text-muted-foreground">
                                    Nog geen berichten
                                </div>
                            )}
                            {/* Scroll anchor */}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </ScrollArea>

                {/* Composer - floating island */}
                <div className="shrink-0 p-3 md:p-4">
                    <form onSubmit={handleSubmitMessage}>
                        <div className={cn(
                            'rounded-xl border border-border/50 bg-card shadow-lg transition-shadow',
                            'hover:shadow-xl focus-within:shadow-xl focus-within:ring-1 focus-within:ring-ring/20',
                            messageType === 'note' && 'border-amber-300/50 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-900/50',
                        )}>
                            {/* Textarea */}
                            <MentionTextarea
                                placeholder={messageType === 'reply' ? `Antwoord aan ${ticket.contact?.name || 'klant'}...` : 'Voeg een interne notitie toe...'}
                                value={data.body}
                                onChange={(value) => setData('body', value)}
                                onKeyDown={handleKeyDown}
                                users={agents}
                                autoResize
                                minRows={2}
                                maxRows={10}
                                className={cn(
                                    'w-full resize-none border-0 bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0',
                                )}
                            />
                            {/* Footer bar */}
                            <div className={cn(
                                'flex items-center justify-between border-t px-3 py-2',
                                messageType === 'note' ? 'border-amber-200/50 dark:border-amber-800/50' : 'border-border/50',
                            )}>
                                <div className="flex items-center gap-2">
                                    <Tabs value={messageType} onValueChange={(v) => {
                                        setMessageType(v as 'reply' | 'note');
                                        setData('type', v as 'reply' | 'note');
                                    }}>
                                        <TabsList className="h-7 bg-transparent p-0">
                                            <TabsTrigger value="reply" className="h-7 gap-1 rounded-md px-2 text-xs data-[state=active]:bg-muted data-[state=active]:shadow-none">
                                                <Send className="h-3 w-3" />
                                                Antwoord
                                            </TabsTrigger>
                                            <TabsTrigger value="note" className="h-7 gap-1 rounded-md px-2 text-xs data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-amber-900/50 dark:data-[state=active]:text-amber-400">
                                                <StickyNote className="h-3 w-3" />
                                                Notitie
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    {messageType === 'note' && (
                                        <span className="hidden text-xs text-amber-600 dark:text-amber-400 sm:inline">
                                            Intern
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="hidden text-xs text-muted-foreground sm:inline">
                                        <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">⌘</kbd> + <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">↵</kbd>
                                    </span>
                                    <Button type="submit" disabled={processing || !data.body.trim()} size="sm" className="h-7 gap-1.5 px-3 text-xs">
                                        <Send className="h-3 w-3" />
                                        {messageType === 'reply' ? 'Versturen' : 'Toevoegen'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Actions Sidebar */}
            {!sidebarCollapsed && (
            <div className="hidden md:block w-72 shrink-0 border-l bg-background transition-all duration-200">
                <ScrollArea className="h-full">
                    <div className="space-y-4 p-4 pr-3">
                        {/* Contact */}
                        <div className="rounded-lg border bg-card overflow-hidden">
                            <button
                                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent overflow-hidden"
                                onClick={() => setIsChangeContactOpen(true)}
                            >
                                <Avatar className="h-10 w-10 shrink-0 border">
                                    <AvatarFallback className="bg-primary/10 text-sm text-primary">
                                        {getInitials(ticket.contact?.name || ticket.contact?.email || '')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <p className="truncate font-medium">{(ticket.contact?.name || 'Onbekend').slice(0, 15)}{(ticket.contact?.name?.length ?? 0) > 15 ? '…' : ''}</p>
                                    <p className="truncate text-sm text-muted-foreground">{ticket.contact?.email?.slice(0, 20)}{(ticket.contact?.email?.length ?? 0) > 20 ? '…' : ''}</p>
                                </div>
                                <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                            {(ticket.contact?.phone || ticket.contact?.company) && (
                                <div className="flex flex-col gap-1 border-t px-4 py-3 text-sm text-muted-foreground overflow-hidden">
                                    {ticket.contact?.phone && (
                                        <span className="flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{ticket.contact.phone.slice(0, 18)}</span>
                                        </span>
                                    )}
                                    {ticket.contact?.company && (
                                        <span className="flex items-center gap-1.5">
                                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{ticket.contact.company.slice(0, 18)}{ticket.contact.company.length > 18 ? '…' : ''}</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Properties */}
                        <div className="rounded-lg border bg-card p-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Status</Label>
                                    <Select value={String(ticket.status_id)} onValueChange={(v) => updateTicket('status_id', v)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.map((status) => (
                                                <SelectItem key={status.id} value={String(status.id)}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                                                        {status.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Prioriteit</Label>
                                    <Select value={String(ticket.priority_id)} onValueChange={(v) => updateTicket('priority_id', v)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorities.map((priority) => (
                                                <SelectItem key={priority.id} value={String(priority.id)}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priority.color }} />
                                                        {priority.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Toegewezen aan</Label>
                                    <Select
                                        value={ticket.assigned_to ? String(ticket.assigned_to) : 'unassigned'}
                                        onValueChange={(v) => updateTicket('assigned_to', v === 'unassigned' ? null : v)}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Niet toegewezen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">
                                                <span className="text-muted-foreground">Niet toegewezen</span>
                                            </SelectItem>
                                            {agents.map((agent) => (
                                                <SelectItem key={agent.id} value={String(agent.id)}>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarFallback className="text-[10px]">{getInitials(agent.name)}</AvatarFallback>
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

                        {/* SLA */}
                        {ticket.sla && (
                            <div className={cn('rounded-lg border bg-card', (isOverdue || resolutionOverdue) && 'border-destructive/50')}>
                                <div className="flex items-center justify-between border-b px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{ticket.sla.name}</span>
                                    </div>
                                    {(isOverdue || resolutionOverdue) && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                </div>
                                <div className="space-y-4 p-4">
                                    {ticket.sla_first_response_due_at && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">Eerste reactie</span>
                                                {ticket.first_response_at ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                        Klaar
                                                    </span>
                                                ) : (
                                                    <span className={cn('text-xs font-medium', isOverdue && 'text-destructive')}>
                                                        {formatDistanceToNow(new Date(ticket.sla_first_response_due_at), { addSuffix: true, locale: nl })}
                                                    </span>
                                                )}
                                            </div>
                                            <Progress value={firstResponseProgress ?? 0} className="h-2" indicatorClassName={getProgressColor(firstResponseProgress, !!isOverdue)} />
                                        </div>
                                    )}
                                    {ticket.sla_resolution_due_at && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">Oplossing</span>
                                                {ticket.resolved_at ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                        Klaar
                                                    </span>
                                                ) : (
                                                    <span className={cn('text-xs font-medium', resolutionOverdue && 'text-destructive')}>
                                                        {formatDistanceToNow(new Date(ticket.sla_resolution_due_at), { addSuffix: true, locale: nl })}
                                                    </span>
                                                )}
                                            </div>
                                            <Progress value={resolutionProgress ?? 0} className="h-2" indicatorClassName={getProgressColor(resolutionProgress, !!resolutionOverdue)} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        {ticket.tags && ticket.tags.length > 0 && (
                            <div className="rounded-lg border bg-card p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <TagIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Tags</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {ticket.tags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className="rounded-full px-2.5 py-1 text-xs font-medium"
                                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="rounded-lg border bg-card p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Tijdlijn</span>
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Aangemaakt</span>
                                    <span>{format(new Date(ticket.created_at), 'MMM d, h:mm a')}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Bijgewerkt</span>
                                    <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: nl })}</span>
                                </div>
                                {ticket.first_response_at && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Eerste reactie</span>
                                        <span>{format(new Date(ticket.first_response_at), 'MMM d, h:mm a')}</span>
                                    </div>
                                )}
                                {ticket.resolved_at && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Opgelost</span>
                                        <span>{format(new Date(ticket.resolved_at), 'MMM d, h:mm a')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>
            )}

            {/* Change Contact Dialog */}
            <Dialog open={isChangeContactOpen} onOpenChange={setIsChangeContactOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Contact wijzigen</DialogTitle>
                        <DialogDescription>Selecteer een ander contact voor dit ticket.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Zoek contacten..."
                                value={contactSearch}
                                onChange={(e) => setContactSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <ScrollArea className="h-64">
                            <div className="space-y-1">
                                {filteredContacts.map((contact) => (
                                    <button
                                        key={contact.id}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent',
                                            contact.id === ticket.contact_id && 'bg-accent',
                                        )}
                                        onClick={() => handleContactChange(contact.id)}
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="text-xs">
                                                {getInitials(contact.name || contact.email)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 truncate">
                                            <p className="truncate font-medium">{contact.name || contact.email}</p>
                                            {contact.name && (
                                                <p className="truncate text-sm text-muted-foreground">{contact.email}</p>
                                            )}
                                        </div>
                                        {contact.id === ticket.contact_id && (
                                            <Check className="h-4 w-4 text-primary" />
                                        )}
                                    </button>
                                ))}
                                {filteredContacts.length === 0 && (
                                    <p className="py-4 text-center text-sm text-muted-foreground">Geen contacten gevonden</p>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Mobile Details Sheet */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent side="right" className="w-80 p-0 overflow-hidden">
                    <SheetHeader className="px-4 py-3 border-b">
                        <SheetTitle>Ticket Details</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-60px)]">
                        <div className="space-y-4 p-4">
                            {/* Contact */}
                            <div className="rounded-lg border bg-card overflow-hidden">
                                <button
                                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent overflow-hidden"
                                    onClick={() => {
                                        setIsDetailsOpen(false);
                                        setIsChangeContactOpen(true);
                                    }}
                                >
                                    <Avatar className="h-10 w-10 shrink-0 border">
                                        <AvatarFallback className="bg-primary/10 text-sm text-primary">
                                            {getInitials(ticket.contact?.name || ticket.contact?.email || '')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <p className="truncate font-medium">{(ticket.contact?.name || 'Onbekend').slice(0, 18)}{(ticket.contact?.name?.length ?? 0) > 18 ? '…' : ''}</p>
                                        <p className="truncate text-sm text-muted-foreground">{ticket.contact?.email?.slice(0, 22)}{(ticket.contact?.email?.length ?? 0) > 22 ? '…' : ''}</p>
                                    </div>
                                    <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
                                </button>
                                {(ticket.contact?.phone || ticket.contact?.company) && (
                                    <div className="flex flex-col gap-1 border-t px-4 py-3 text-sm text-muted-foreground overflow-hidden">
                                        {ticket.contact?.phone && (
                                            <span className="flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{ticket.contact.phone.slice(0, 18)}</span>
                                            </span>
                                        )}
                                        {ticket.contact?.company && (
                                            <span className="flex items-center gap-1.5">
                                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{ticket.contact.company.slice(0, 18)}{ticket.contact.company.length > 18 ? '…' : ''}</span>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Properties */}
                            <div className="rounded-lg border bg-card p-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Status</Label>
                                        <Select value={String(ticket.status_id)} onValueChange={(v) => updateTicket('status_id', v)}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {statuses.map((status) => (
                                                    <SelectItem key={status.id} value={String(status.id)}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                                                            {status.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Prioriteit</Label>
                                        <Select value={String(ticket.priority_id)} onValueChange={(v) => updateTicket('priority_id', v)}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {priorities.map((priority) => (
                                                    <SelectItem key={priority.id} value={String(priority.id)}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priority.color }} />
                                                            {priority.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Toegewezen aan</Label>
                                        <Select
                                            value={ticket.assigned_to ? String(ticket.assigned_to) : 'unassigned'}
                                            onValueChange={(v) => updateTicket('assigned_to', v === 'unassigned' ? null : v)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Niet toegewezen" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">
                                                    <span className="text-muted-foreground">Niet toegewezen</span>
                                                </SelectItem>
                                                {agents.map((agent) => (
                                                    <SelectItem key={agent.id} value={String(agent.id)}>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-5 w-5">
                                                                <AvatarFallback className="text-[10px]">{getInitials(agent.name)}</AvatarFallback>
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

                            {/* SLA */}
                            {ticket.sla && (
                                <div className={cn('rounded-lg border bg-card', (isOverdue || resolutionOverdue) && 'border-destructive/50')}>
                                    <div className="flex items-center justify-between border-b px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{ticket.sla.name}</span>
                                        </div>
                                        {(isOverdue || resolutionOverdue) && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                    </div>
                                    <div className="space-y-4 p-4">
                                        {ticket.sla_first_response_due_at && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Eerste reactie</span>
                                                    {ticket.first_response_at ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                            Klaar
                                                        </span>
                                                    ) : (
                                                        <span className={cn('text-xs font-medium', isOverdue && 'text-destructive')}>
                                                            {formatDistanceToNow(new Date(ticket.sla_first_response_due_at), { addSuffix: true, locale: nl })}
                                                        </span>
                                                    )}
                                                </div>
                                                <Progress value={firstResponseProgress ?? 0} className="h-2" indicatorClassName={getProgressColor(firstResponseProgress, !!isOverdue)} />
                                            </div>
                                        )}
                                        {ticket.sla_resolution_due_at && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Oplossing</span>
                                                    {ticket.resolved_at ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                            Klaar
                                                        </span>
                                                    ) : (
                                                        <span className={cn('text-xs font-medium', resolutionOverdue && 'text-destructive')}>
                                                            {formatDistanceToNow(new Date(ticket.sla_resolution_due_at), { addSuffix: true, locale: nl })}
                                                        </span>
                                                    )}
                                                </div>
                                                <Progress value={resolutionProgress ?? 0} className="h-2" indicatorClassName={getProgressColor(resolutionProgress, !!resolutionOverdue)} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {ticket.tags && ticket.tags.length > 0 && (
                                <div className="rounded-lg border bg-card p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <TagIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">Tags</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {ticket.tags.map((tag) => (
                                            <span
                                                key={tag.id}
                                                className="rounded-full px-2.5 py-1 text-xs font-medium"
                                                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Timeline */}
                            <div className="rounded-lg border bg-card p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Tijdlijn</span>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Aangemaakt</span>
                                        <span>{format(new Date(ticket.created_at), 'MMM d, h:mm a')}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Bijgewerkt</span>
                                        <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: nl })}</span>
                                    </div>
                                    {ticket.first_response_at && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Eerste reactie</span>
                                            <span>{format(new Date(ticket.first_response_at), 'MMM d, h:mm a')}</span>
                                        </div>
                                    )}
                                    {ticket.resolved_at && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Opgelost</span>
                                            <span>{format(new Date(ticket.resolved_at), 'MMM d, h:mm a')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            <ConfirmationDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                title="Ticket permanent verwijderen"
                description={`Weet je zeker dat je ticket "${ticket.subject}" permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
                confirmLabel="Verwijderen"
                onConfirm={handlePermanentDelete}
                loading={isDeleting}
            />

            <MergeTicketsWizard
                open={isMergeOpen}
                onOpenChange={setIsMergeOpen}
                currentTicket={ticket}
                allTickets={allTickets}
            />
        </div>
    );
}

/**
 * Highlights @mentions in text with a colored background.
 * Uses blue/indigo to contrast with note's yellow/orange color.
 *
 * Matches @Name where Name consists of capitalized words (e.g., @Serge, @John Smith)
 * Stops at lowercase words, punctuation, or end of text.
 */
function highlightMentions(text: string): React.ReactNode {
    if (!text) return text;

    // Match @Name patterns where names are capitalized words
    // Examples: @Serge, @John Smith, @Mary Jane Watson
    // Stops at: lowercase word, punctuation, end of string, or another @
    const mentionRegex = /@([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)(?=\s+[a-z]|\s*[.,!?:;\n\r]|\s*$|\s*@|\s+\d)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        const mentionName = match[1].trim();

        // Skip if no valid name was captured
        if (!mentionName) continue;

        // Add text before the mention
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        // Add the highlighted mention (only the @Name part)
        parts.push(
            <span
                key={match.index}
                className="rounded bg-indigo-100 px-0.5 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
            >
                @{mentionName}
            </span>
        );

        // Calculate the actual length consumed (@ + name)
        lastIndex = match.index + 1 + mentionName.length;
    }

    // Add remaining text after the last mention
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}

function MessageBubble({ message }: { message: Message; ticket: Ticket }) {
    const getInitials = useInitials();
    const [showOriginal, setShowOriginal] = React.useState(false);
    const isCustomer = message.is_from_contact;
    const isNote = message.type === 'note';
    const isAgentReply = !isCustomer && message.type === 'reply';
    const hasRawContent = !!message.raw_content;
    const hasAttachments = message.file_attachments && message.file_attachments.length > 0;
    const hasCcRecipients = message.cc_recipients && message.cc_recipients.length > 0;

    // Get sender name from user or contact
    const senderName = isCustomer
        ? (message.contact?.name || message.contact?.email || 'Klant')
        : (message.user?.name || 'System');

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
        return <FileText className="h-4 w-4" />;
    };

    return (
        <div className={cn('group flex gap-3', !isCustomer && 'flex-row-reverse')}>
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={cn(
                    'text-xs',
                    isNote ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                    isCustomer ? 'bg-muted' : 'bg-primary text-primary-foreground',
                )}>
                    {getInitials(senderName)}
                </AvatarFallback>
            </Avatar>
            <div className={cn('flex max-w-[70%] flex-col', !isCustomer && 'items-end')}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{senderName}</span>
                    <span>{format(new Date(message.created_at), 'MMM d, h:mm a')}</span>
                    {isNote && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            <StickyNote className="mr-1 h-3 w-3" />
                            Notitie
                        </Badge>
                    )}
                    {hasRawContent && (
                        <Dialog open={showOriginal} onOpenChange={setShowOriginal}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 gap-1 px-1.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                    <Eye className="h-3 w-3" />
                                    Origineel
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] max-w-4xl overflow-hidden">
                                <DialogHeader>
                                    <DialogTitle>Originele e-mail</DialogTitle>
                                </DialogHeader>
                                <div className="mt-4 overflow-auto rounded-lg border bg-white">
                                    <iframe
                                        srcDoc={message.raw_content || ''}
                                        sandbox="allow-same-origin"
                                        className="h-[60vh] w-full border-0"
                                        title="Originele e-mail inhoud"
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                {/* CC Recipients */}
                {hasCcRecipients && (
                    <div className={cn('mb-2 flex items-center gap-1.5 text-xs text-muted-foreground', !isCustomer && 'justify-end')}>
                        <Users className="h-3 w-3" />
                        <span>CC:</span>
                        <span className="truncate">
                            {message.cc_recipients?.map((r, i) => (
                                <span key={r.id}>
                                    {i > 0 && ', '}
                                    {r.name || r.email}
                                </span>
                            ))}
                        </span>
                    </div>
                )}
                {/* Message bubble with optional email status tooltip for agent replies */}
                {isAgentReply && message.email_status ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={cn(
                                    'rounded-2xl px-4 py-2.5 text-sm cursor-default',
                                    'rounded-tr-sm bg-primary text-primary-foreground',
                                    message.email_status === 'failed' && 'ring-2 ring-destructive/50',
                                )}
                            >
                                {message.body_html ? (
                                    <div
                                        className="email-content prose prose-sm max-w-none dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body_html) }}
                                    />
                                ) : (
                                    <p className="whitespace-pre-wrap">{highlightMentions(message.body)}</p>
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="flex items-center gap-2">
                            {message.email_status === 'sent' && (
                                <>
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                    <span>E-mail verzonden</span>
                                </>
                            )}
                            {message.email_status === 'pending' && (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                                    <span>E-mail wordt verzonden...</span>
                                </>
                            )}
                            {message.email_status === 'failed' && (
                                <>
                                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                                    <span>Verzenden mislukt{message.email_error && `: ${message.email_error}`}</span>
                                </>
                            )}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <div
                        className={cn(
                            'rounded-2xl px-4 py-2.5 text-sm',
                            isNote
                                ? 'rounded-tr-sm bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
                                : isCustomer
                                    ? 'rounded-tl-sm bg-muted'
                                    : 'rounded-tr-sm bg-primary text-primary-foreground',
                        )}
                    >
                        {message.body_html ? (
                            <div
                                className="email-content prose prose-sm max-w-none dark:prose-invert"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body_html) }}
                            />
                        ) : (
                            <p className="whitespace-pre-wrap">{highlightMentions(message.body)}</p>
                        )}
                    </div>
                )}
                {/* File Attachments */}
                {hasAttachments && (
                    <div className={cn('mt-2 flex flex-wrap gap-2', !isCustomer && 'justify-end')}>
                        {message.file_attachments?.map((attachment) => (
                            <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
                            >
                                {getFileIcon(attachment.mime_type)}
                                <div className="flex flex-col">
                                    <span className="max-w-[150px] truncate font-medium">{attachment.original_filename}</span>
                                    <span className="text-xs text-muted-foreground">{attachment.human_size}</span>
                                </div>
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
