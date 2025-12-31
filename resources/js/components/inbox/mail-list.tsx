import DOMPurify from 'dompurify';
import { formatTicketListDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { useTranslation } from 'react-i18next';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuCheckboxItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/common/color-picker';
import InputError from '@/components/input-error';
import type { Ticket, TicketFolder, Tag, InboxFilters, SharedData } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    FolderInput,
    Inbox,
    Mail,
    MailOpen,
    Archive,
    Trash2,
    Tag as TagIcon,
    Check,
    AlertTriangle,
    Plus,
    Clock,
    AlertCircle,
    CheckCircle2,
    X,
    UserCircle2,
    XCircle,
} from 'lucide-react';
import * as React from 'react';

export type ListDensity = 'compact' | 'normal' | 'spacious';

// Helper function to format SLA time remaining
function formatSlaTime(dueDate: string): { text: string; isOverdue: boolean; isUrgent: boolean } {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const isOverdue = diff < 0;
    const absDiff = Math.abs(diff);

    const minutes = Math.floor(absDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let text: string;
    if (days > 0) {
        text = `${days}d ${hours % 24}u`;
    } else if (hours > 0) {
        text = `${hours}u ${minutes % 60}m`;
    } else {
        text = `${minutes}m`;
    }

    // Urgent if less than 2 hours remaining
    const isUrgent = !isOverdue && diff < 2 * 60 * 60 * 1000;

    return { text, isOverdue, isUrgent };
}

// Truncate subject to max words
function truncateSubject(subject: string, maxWords = 8): string {
    const words = subject.split(/\s+/);
    if (words.length <= maxWords) return subject;
    return words.slice(0, maxWords).join(' ') + '...';
}

// Strip HTML and get plain text preview
function getMessagePreview(message?: { body?: string; body_html?: string }, maxLength = 100): string {
    if (!message) return '';

    let text = '';
    // If there's body_html, strip HTML tags (sanitize first to prevent XSS during parsing)
    if (message.body_html) {
        const div = document.createElement('div');
        div.innerHTML = DOMPurify.sanitize(message.body_html);
        text = div.textContent?.trim() || '';
    } else {
        text = message.body?.trim() || '';
    }

    return text.slice(0, maxLength);
}

interface MailListProps {
    items: Ticket[];
    selectedTicketId?: number;
    folders?: TicketFolder[];
    tags?: Tag[];
    filters?: InboxFilters;
    density?: ListDensity;
}

export function MailList({ items, selectedTicketId, folders = [], tags = [], filters = {}, density = 'normal' }: MailListProps) {
    const { t } = useTranslation('inbox');
    const { auth } = usePage<SharedData>().props;
    const currentUserId = auth.user?.id;
    const getInitials = useInitials();

    // Check if we're in the deleted folder by looking up the folder's system_type
    const currentFolder = filters.folder ? folders.find((f) => f.id === Number(filters.folder)) : null;
    const isInDeletedFolder = currentFolder?.system_type === 'deleted';

    const [isCreateTagOpen, setIsCreateTagOpen] = React.useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [pendingDeleteId, setPendingDeleteId] = React.useState<number | null>(null);
    const [pendingDeleteType, setPendingDeleteType] = React.useState<'single' | 'bulk' | 'permanent' | 'bulk-permanent'>('single');
    const [pendingTagTicket, setPendingTagTicket] = React.useState<Ticket | null>(null);
    const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
    const [lastClickedId, setLastClickedId] = React.useState<number | null>(null);
    const dragImageRef = React.useRef<HTMLDivElement>(null);

    // Clear selection when items change
    React.useEffect(() => {
        setSelectedIds(new Set());
        setLastClickedId(null);
    }, [items]);

    const handleSelect = (ticketId: number, event?: React.MouseEvent) => {
        // Shift+click: Range selection
        if (event?.shiftKey) {
            event.preventDefault();

            if (lastClickedId !== null && lastClickedId !== ticketId) {
                // Select range from lastClickedId to current
                const startIdx = items.findIndex((t) => t.id === lastClickedId);
                const endIdx = items.findIndex((t) => t.id === ticketId);
                if (startIdx !== -1 && endIdx !== -1) {
                    const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
                    const rangeIds = items.slice(from, to + 1).map((t) => t.id);
                    // Merge with existing selection
                    const newSelected = new Set([...selectedIds, ...rangeIds]);
                    setSelectedIds(newSelected);
                    return;
                }
            } else {
                // No previous click or same item - start selection with this item
                const newSelected = new Set(selectedIds);
                newSelected.add(ticketId);
                setSelectedIds(newSelected);
                setLastClickedId(ticketId);
                return;
            }
        }

        // Cmd/Ctrl+click: Toggle single item selection
        if (event?.metaKey || event?.ctrlKey) {
            event.preventDefault();
            const newSelected = new Set(selectedIds);
            if (newSelected.has(ticketId)) {
                newSelected.delete(ticketId);
            } else {
                newSelected.add(ticketId);
            }
            setSelectedIds(newSelected);
            setLastClickedId(ticketId);
            return;
        }

        // If we have a selection and click without modifier, add to selection
        if (selectedIds.size > 0) {
            const newSelected = new Set(selectedIds);
            if (newSelected.has(ticketId)) {
                newSelected.delete(ticketId);
            } else {
                newSelected.add(ticketId);
            }
            setSelectedIds(newSelected);
            setLastClickedId(ticketId);
            return;
        }

        // Normal click without selection - navigate to ticket
        setLastClickedId(ticketId);
        const params: Record<string, string> = {};
        if (filters.folder) {
            params.folder = filters.folder;
        }
        router.get(`/inbox/${ticketId}`, params, { preserveState: true, preserveScroll: true });
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setLastClickedId(null);
    };

    // Bulk actions
    const handleBulkMarkRead = () => {
        selectedIds.forEach((id) => {
            router.post(`/inbox/${id}/mark-unread`, {}, { preserveState: true });
        });
        toast.success(t('bulk.tickets_marked_read', { count: selectedIds.size }));
        clearSelection();
    };

    const handleBulkMarkResolved = () => {
        // Find solved folder to move tickets there
        const solvedFolder = folders.find((f) => f.system_type === 'solved');
        selectedIds.forEach((id) => {
            // Update status and move to solved folder
            router.patch(`/inbox/${id}`, { status_id: 3 }, { preserveState: true });
            if (solvedFolder) {
                router.post(`/inbox/${id}/move`, { folder_id: solvedFolder.id }, { preserveState: true });
            }
        });
        toast.success(t('bulk.tickets_resolved', { count: selectedIds.size }));
        clearSelection();
    };

    const handleBulkDelete = () => {
        setPendingDeleteType('bulk');
        setDeleteConfirmOpen(true);
    };

    const handleBulkPermanentDelete = () => {
        setPendingDeleteType('bulk-permanent');
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (pendingDeleteType === 'single' && pendingDeleteId) {
            const deletedFolder = folders.find((f) => f.system_type === 'deleted');
            if (deletedFolder) {
                router.post(`/inbox/${pendingDeleteId}/move`, { folder_id: deletedFolder.id }, {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => toast.success(t('actions.deleted')),
                });
            } else {
                router.delete(`/inbox/${pendingDeleteId}`, {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => toast.success(t('actions.deleted')),
                });
            }
        } else if (pendingDeleteType === 'permanent' && pendingDeleteId) {
            router.delete(`/inbox/${pendingDeleteId}`, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => toast.success(t('actions.deleted_permanent')),
            });
        } else if (pendingDeleteType === 'bulk') {
            const deletedFolder = folders.find((f) => f.system_type === 'deleted');
            selectedIds.forEach((id) => {
                if (deletedFolder) {
                    router.post(`/inbox/${id}/move`, { folder_id: deletedFolder.id }, { preserveState: true, preserveScroll: true });
                } else {
                    router.delete(`/inbox/${id}`, { preserveState: true, preserveScroll: true });
                }
            });
            toast.success(t('bulk.tickets_deleted', { count: selectedIds.size }));
            clearSelection();
        } else if (pendingDeleteType === 'bulk-permanent') {
            selectedIds.forEach((id) => {
                router.delete(`/inbox/${id}`, { preserveState: true, preserveScroll: true });
            });
            toast.success(t('bulk.tickets_deleted_permanent', { count: selectedIds.size }));
            clearSelection();
        }
        setDeleteConfirmOpen(false);
        setPendingDeleteId(null);
    };

    const handleDragStart = (e: React.DragEvent, ticketId: number) => {
        e.dataTransfer.setData('ticketId', String(ticketId));
        e.dataTransfer.effectAllowed = 'move';
        // Use custom drag image
        if (dragImageRef.current) {
            e.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
        }
    };

    const handleMoveToFolder = (ticketId: number, folderId: number | null) => {
        router.post(`/inbox/${ticketId}/move`, { folder_id: folderId }, {
            preserveState: true,
            onSuccess: () => toast.success(t('actions.moved')),
        });
    };

    const handleMarkUnread = (ticketId: number) => {
        router.post(`/inbox/${ticketId}/mark-unread`, {}, {
            preserveState: true,
            onSuccess: () => toast.success(t('actions.marked_unread')),
        });
    };

    const handleDelete = (ticketId: number) => {
        setPendingDeleteId(ticketId);
        setPendingDeleteType('single');
        setDeleteConfirmOpen(true);
    };

    const handlePermanentDelete = (ticketId: number) => {
        setPendingDeleteId(ticketId);
        setPendingDeleteType('permanent');
        setDeleteConfirmOpen(true);
    };

    const handleArchive = (ticketId: number) => {
        const archivedFolder = folders.find((f) => f.system_type === 'archived');
        if (archivedFolder) {
            handleMoveToFolder(ticketId, archivedFolder.id);
        }
    };

    const handleSpam = (ticketId: number) => {
        const spamFolder = folders.find((f) => f.system_type === 'spam');
        if (spamFolder) {
            handleMoveToFolder(ticketId, spamFolder.id);
        }
    };

    const handleToggleTag = (ticket: Ticket, tagId: number) => {
        const currentTagIds = ticket.tags?.map((t) => t.id) || [];
        const newTagIds = currentTagIds.includes(tagId)
            ? currentTagIds.filter((id) => id !== tagId)
            : [...currentTagIds, tagId];
        router.post(`/inbox/${ticket.id}/tags`, { tags: newTagIds }, {
            preserveState: true,
            onSuccess: () => toast.success(t('actions.tags_updated')),
        });
    };

    // Density-specific padding - same horizontal, different vertical
    const densityClasses = {
        compact: 'py-1.5 px-3',
        normal: 'py-2.5 px-3',
        spacious: 'py-3.5 px-3',
    };

    if (items.length === 0) {
        return (
            <div className="flex h-full items-center justify-center p-4">
                <p className="text-sm text-muted-foreground">{t('empty.no_tickets_found')}</p>
            </div>
        );
    }

    const hasSelection = selectedIds.size > 0;

    return (
        <ScrollArea className="h-full">
            {/* Bulk action bar - compact with tooltips */}
            {hasSelection && (
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-primary px-2 py-1.5 text-primary-foreground">
                    <span className="text-xs font-medium pl-1">{selectedIds.size}</span>
                    <div className="flex items-center gap-0.5">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                                    onClick={handleBulkMarkRead}
                                >
                                    <MailOpen className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{t('tooltips.mark_read')}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                                    onClick={handleBulkMarkResolved}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{t('tooltips.mark_resolved')}</TooltipContent>
                        </Tooltip>
                        {isInDeletedFolder ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                                        onClick={handleBulkPermanentDelete}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">{t('tooltips.delete_permanent')}</TooltipContent>
                            </Tooltip>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                                        onClick={handleBulkDelete}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">{t('tooltips.delete')}</TooltipContent>
                            </Tooltip>
                        )}
                        <div className="w-px h-4 bg-primary-foreground/30 mx-1" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                                    onClick={clearSelection}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{t('tooltips.deselect')}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            )}
            {/* Custom drag image */}
            <div
                ref={dragImageRef}
                className="fixed -left-[9999px] flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg"
            >
                <FolderInput className="h-4 w-4" />
                {t('ticket.move_ticket')}
            </div>
            <div className="flex flex-col">
                {items.map((item) => {
                    // Calculate SLA status
                    const needsFirstResponse = item.sla_first_response_due_at && !item.first_response_at;
                    const slaInfo = needsFirstResponse ? formatSlaTime(item.sla_first_response_due_at!) : null;
                    const isSlaBreach = slaInfo?.isOverdue ?? false;
                    const isSlaUrgent = slaInfo?.isUrgent ?? false;

                    // Check if priority is urgent
                    const isUrgentPriority = item.priority?.slug === 'urgent';
                    const hasSlaIndicator = isSlaBreach || isSlaUrgent;

                    // Get message preview
                    const preview = getMessagePreview(item.latestMessage, 120);
                    const isSelected = selectedIds.has(item.id);

                    // Get latest message date
                    const messageDate = item.latestMessage?.created_at || item.updated_at;

                    // Check if assigned to current user
                    const isAssignedToMe = item.assigned_to_id === currentUserId;

                    return (
                    <ContextMenu key={item.id}>
                        <ContextMenuTrigger asChild>
                            <button
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                className={cn(
                                    'flex flex-col text-left transition-colors border-b border-border/50 cursor-grab active:cursor-grabbing overflow-hidden',
                                    densityClasses[density],
                                    'hover:bg-sidebar-accent',
                                    selectedTicketId === item.id && 'bg-accent',
                                    isSelected && 'bg-primary/20',
                                    // Unread styling
                                    !item.is_read && !isSelected && selectedTicketId !== item.id && 'bg-primary/[0.05]',
                                    // SLA indicators take priority
                                    isSlaBreach && 'border-l-2 border-l-destructive bg-destructive/10',
                                    isSlaUrgent && !isSlaBreach && 'border-l-2 border-l-amber-500 bg-amber-500/10',
                                    // Urgent priority indicator (when no SLA indicator)
                                    isUrgentPriority && !hasSlaIndicator && 'border-l-2',
                                )}
                                style={isUrgentPriority && !hasSlaIndicator ? { borderLeftColor: item.priority?.color } : undefined}
                                onClick={(e) => handleSelect(item.id, e)}
                            >
                                {/* KLEIN (compact): Single line with fixed date position */}
                                {density === 'compact' && (
                                    <div className="relative flex items-center gap-1.5 pr-24">
                                        {/* Left indicators (shrink-0) */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {!item.is_read && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            )}
                                            {isSelected && (
                                                <Check className="h-3 w-3 text-primary" />
                                            )}
                                            {isAssignedToMe && (
                                                <UserCircle2 className="h-3 w-3 text-primary" />
                                            )}
                                        </div>
                                        {/* Contact (fixed width) */}
                                        <span className="font-semibold text-sm w-20 shrink-0 truncate">
                                            {item.contact?.name || item.contact?.email || t('ticket.unknown')}
                                        </span>
                                        {/* SLA badge */}
                                        {isSlaBreach && (
                                            <span className="shrink-0 rounded px-1 text-[9px] font-medium bg-destructive/10 text-destructive">
                                                SLA
                                            </span>
                                        )}
                                        {isSlaUrgent && !isSlaBreach && (
                                            <span className="shrink-0 rounded px-1 text-[9px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                {slaInfo?.text}
                                            </span>
                                        )}
                                        {/* Subject (8 words max) */}
                                        <span className="text-sm text-muted-foreground truncate">
                                            {truncateSubject(item.subject, 8)}
                                        </span>
                                        {/* Tag dots with tooltips */}
                                        {item.tags && item.tags.length > 0 && (
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                {item.tags.slice(0, 4).map((tag) => (
                                                    <Tooltip key={tag.id}>
                                                        <TooltipTrigger asChild>
                                                            <span
                                                                className="h-2 w-2 rounded-full shrink-0"
                                                                style={{ backgroundColor: tag.color }}
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-xs">
                                                            {tag.name}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ))}
                                                {item.tags.length > 4 && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="text-[9px] text-muted-foreground">
                                                                +{item.tags.length - 4}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-xs">
                                                            {item.tags.slice(4).map((t) => t.name).join(', ')}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        )}
                                        {/* Time - FIXED at right edge */}
                                        <span className="absolute right-0 text-[11px] text-muted-foreground whitespace-nowrap bg-inherit">
                                            {formatTicketListDate(messageDate)}
                                        </span>
                                    </div>
                                )}

                                {/* NORMAAL: Two lines with avatar */}
                                {density === 'normal' && (
                                    <div className="relative flex items-start gap-2.5 pr-24">
                                        {/* Avatar */}
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage src={item.contact?.avatar_url} />
                                            <AvatarFallback className="text-xs">
                                                {getInitials(item.contact?.name || item.contact?.email || '?')}
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Content */}
                                        <div className="min-w-0 flex-1">
                                            {/* Line 1: Contact + badges */}
                                            <div className="flex items-center gap-1.5">
                                                {/* Left indicators */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {!item.is_read && (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                    )}
                                                    {isSelected && (
                                                        <Check className="h-3.5 w-3.5 text-primary" />
                                                    )}
                                                    {isAssignedToMe && (
                                                        <UserCircle2 className="h-3.5 w-3.5 text-primary" />
                                                    )}
                                                </div>
                                                {/* Contact name */}
                                                <span className="font-semibold text-sm truncate">
                                                    {item.contact?.name || item.contact?.email || t('ticket.unknown')}
                                                </span>
                                                {/* Badges */}
                                                {isSlaBreach && (
                                                    <span className="shrink-0 rounded px-1 text-[9px] font-medium bg-destructive/10 text-destructive">
                                                        SLA
                                                    </span>
                                                )}
                                                {isSlaUrgent && !isSlaBreach && (
                                                    <span className="shrink-0 rounded px-1 text-[9px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                        {slaInfo?.text}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Line 2: Subject + Tags */}
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <p className="text-sm text-muted-foreground truncate">
                                                    {truncateSubject(item.subject, 8)}
                                                </p>
                                                {/* Tags */}
                                                {item.tags && item.tags.length > 0 && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {item.tags.slice(0, 3).map((tag) => (
                                                            <span
                                                                key={tag.id}
                                                                className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                                                                style={{
                                                                    backgroundColor: `${tag.color}15`,
                                                                    color: tag.color,
                                                                }}
                                                            >
                                                                {tag.name}
                                                            </span>
                                                        ))}
                                                        {item.tags.length > 3 && (
                                                            <span className="text-[9px] text-muted-foreground">
                                                                +{item.tags.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Time - FIXED at right edge */}
                                        <span className="absolute right-0 top-0 text-[11px] text-muted-foreground whitespace-nowrap">
                                            {formatTicketListDate(messageDate)}
                                        </span>
                                    </div>
                                )}

                                {/* RUIM (spacious): Avatar + Contact+Time, Subject, Preview, Tags */}
                                {density === 'spacious' && (
                                    <div className="relative flex items-start gap-3 pr-28">
                                        {/* Avatar - larger for spacious */}
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarImage src={item.contact?.avatar_url} />
                                            <AvatarFallback className="text-sm">
                                                {getInitials(item.contact?.name || item.contact?.email || '?')}
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Content */}
                                        <div className="min-w-0 flex-1">
                                            {/* Line 1: Contact + badges */}
                                            <div className="flex items-center gap-1.5">
                                                {/* Left indicators */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {!item.is_read && (
                                                        <span className="h-2 w-2 rounded-full bg-primary" />
                                                    )}
                                                    {isSelected && (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    )}
                                                    {isAssignedToMe && (
                                                        <UserCircle2 className="h-4 w-4 text-primary" />
                                                    )}
                                                </div>
                                                {/* Contact name */}
                                                <span className="font-semibold text-sm truncate">
                                                    {item.contact?.name || item.contact?.email || t('ticket.unknown')}
                                                </span>
                                                {/* Badges */}
                                                {isSlaBreach && (
                                                    <span className="inline-flex items-center gap-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-destructive/10 text-destructive">
                                                        <AlertCircle className="h-3 w-3" />
                                                        SLA
                                                    </span>
                                                )}
                                                {isSlaUrgent && !isSlaBreach && (
                                                    <span className="inline-flex items-center gap-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                        <Clock className="h-3 w-3" />
                                                        {slaInfo?.text}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Line 2: Subject (8 words max) */}
                                            <p className={cn(
                                                'text-sm mt-0.5',
                                                !item.is_read ? 'text-foreground' : 'text-muted-foreground',
                                            )}>
                                                {truncateSubject(item.subject, 8)}
                                            </p>
                                            {/* Line 3: Preview */}
                                            {preview && (
                                                <p className="text-xs text-muted-foreground/70 truncate mt-1">
                                                    {preview}
                                                </p>
                                            )}
                                            {/* Line 4: Tags */}
                                            {item.tags && item.tags.length > 0 && (
                                                <div className="flex items-center gap-1 mt-1.5 overflow-hidden">
                                                    {item.tags.slice(0, 4).map((tag) => (
                                                        <span
                                                            key={tag.id}
                                                            className="rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                                                            style={{
                                                                backgroundColor: `${tag.color}15`,
                                                                color: tag.color,
                                                            }}
                                                        >
                                                            {tag.name}
                                                        </span>
                                                    ))}
                                                    {item.tags.length > 4 && (
                                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                                            +{item.tags.length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {/* Time - FIXED at right edge */}
                                        <span className="absolute right-0 top-0 text-xs text-muted-foreground whitespace-nowrap">
                                            {formatTicketListDate(messageDate)}
                                        </span>
                                    </div>
                                )}
                            </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56">
                            {/* Read/Unread */}
                            <ContextMenuItem onClick={() => handleMarkUnread(item.id)}>
                                {item.is_read ? (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        {t('actions.mark_unread')}
                                    </>
                                ) : (
                                    <>
                                        <MailOpen className="mr-2 h-4 w-4" />
                                        {t('actions.mark_read')}
                                    </>
                                )}
                            </ContextMenuItem>

                            <ContextMenuSeparator />

                            {/* Move to Folder */}
                            <ContextMenuSub>
                                <ContextMenuSubTrigger>
                                    <FolderInput className="mr-2 h-4 w-4" />
                                    {t('actions.move_to_folder')}
                                </ContextMenuSubTrigger>
                                <ContextMenuSubContent className="w-48">
                                    {/* Inbox (virtual folder - folder_id = null) */}
                                    <ContextMenuItem
                                        onClick={() => handleMoveToFolder(item.id, null)}
                                    >
                                        <Inbox className="mr-2 h-4 w-4" />
                                        {t('folders.inbox')}
                                        {item.folder_id === null && (
                                            <Check className="ml-auto h-4 w-4" />
                                        )}
                                    </ContextMenuItem>
                                    {folders.length > 0 && <ContextMenuSeparator />}
                                    {folders.map((folder) => (
                                        <ContextMenuItem
                                            key={folder.id}
                                            onClick={() => handleMoveToFolder(item.id, folder.id)}
                                        >
                                            <span
                                                className="mr-2 h-3 w-3 rounded"
                                                style={{ backgroundColor: folder.color }}
                                            />
                                            {folder.name}
                                            {item.folder_id === folder.id && (
                                                <Check className="ml-auto h-4 w-4" />
                                            )}
                                        </ContextMenuItem>
                                    ))}
                                </ContextMenuSubContent>
                            </ContextMenuSub>

                            {/* Tags */}
                            <ContextMenuSub>
                                <ContextMenuSubTrigger>
                                    <TagIcon className="mr-2 h-4 w-4" />
                                    Tags
                                </ContextMenuSubTrigger>
                                <ContextMenuSubContent className="w-48">
                                    {tags.map((tag) => {
                                        const isSelected = item.tags?.some((t) => t.id === tag.id);
                                        return (
                                            <ContextMenuCheckboxItem
                                                key={tag.id}
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggleTag(item, tag.id)}
                                            >
                                                <span
                                                    className="mr-2 h-3 w-3 rounded"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                                {tag.name}
                                                {tag.user_id && (
                                                    <span className="ml-1 text-[10px] text-muted-foreground">
                                                        ({t('ticket.personal')})
                                                    </span>
                                                )}
                                            </ContextMenuCheckboxItem>
                                        );
                                    })}
                                    {tags.length > 0 && <ContextMenuSeparator />}
                                    <ContextMenuItem
                                        onClick={() => {
                                            setPendingTagTicket(item);
                                            setIsCreateTagOpen(true);
                                        }}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('tags.create_personal')}
                                    </ContextMenuItem>
                                </ContextMenuSubContent>
                            </ContextMenuSub>

                            <ContextMenuSeparator />

                            {/* Quick Actions */}
                            <ContextMenuItem onClick={() => handleArchive(item.id)}>
                                <Archive className="mr-2 h-4 w-4" />
                                {t('actions.archive')}
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleSpam(item.id)}>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                {t('actions.mark_spam')}
                            </ContextMenuItem>

                            <ContextMenuSeparator />

                            {isInDeletedFolder ? (
                                <ContextMenuItem
                                    onClick={() => handlePermanentDelete(item.id)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {t('actions.delete_permanent')}
                                </ContextMenuItem>
                            ) : (
                                <ContextMenuItem
                                    onClick={() => handleDelete(item.id)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('actions.delete')}
                                </ContextMenuItem>
                            )}
                        </ContextMenuContent>
                    </ContextMenu>
                    );
                })}
            </div>
            <CreatePersonalTagDialog
                open={isCreateTagOpen}
                onOpenChange={setIsCreateTagOpen}
                ticket={pendingTagTicket}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {pendingDeleteType === 'permanent' || pendingDeleteType === 'bulk-permanent'
                                ? t('delete_dialog.title_permanent')
                                : t('delete_dialog.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {pendingDeleteType === 'permanent' && t('delete_dialog.description_single_permanent')}
                            {pendingDeleteType === 'bulk-permanent' && t('delete_dialog.description_bulk_permanent', { count: selectedIds.size })}
                            {pendingDeleteType === 'single' && t('delete_dialog.description_single')}
                            {pendingDeleteType === 'bulk' && t('delete_dialog.description_bulk', { count: selectedIds.size })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteConfirmOpen(false)}
                        >
                            {t('delete_dialog.cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant={pendingDeleteType === 'permanent' || pendingDeleteType === 'bulk-permanent' ? 'destructive' : 'default'}
                            onClick={confirmDelete}
                        >
                            {pendingDeleteType === 'permanent' || pendingDeleteType === 'bulk-permanent'
                                ? t('delete_dialog.confirm_permanent')
                                : t('delete_dialog.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ScrollArea>
    );
}

function CreatePersonalTagDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticket: Ticket | null;
}) {
    const { t } = useTranslation('inbox');
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        color: '#6b7280',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/personal-tags', {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('tags.dialog_title')}</DialogTitle>
                        <DialogDescription>
                            {t('tags.dialog_description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="tag-name">{t('tags.name_label')}</Label>
                            <Input
                                id="tag-name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder={t('tags.name_placeholder')}
                                autoFocus
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('common:labels.color_label')}</Label>
                            <ColorPicker value={data.color} onChange={(color) => setData('color', color)} />
                            <InputError message={errors.color} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common:buttons.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing || !data.name.trim()}>
                            {processing ? t('tags.creating') : t('tags.create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
