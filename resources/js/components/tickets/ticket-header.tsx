import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Ticket } from '@/types';
import { router, Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, Mail, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface TicketHeaderProps {
    ticket: Ticket;
}

export function TicketHeader({ ticket }: TicketHeaderProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(`/inbox/${ticket.id}`, {
            onSuccess: () => toast.success('Ticket verwijderd'),
            onError: () => toast.error('Ticket verwijderen mislukt'),
            onFinish: () => {
                setIsDeleting(false);
                setShowDeleteDialog(false);
            },
        });
    };

    const handleMarkAsUnread = () => {
        router.post(`/inbox/${ticket.id}/mark-unread`, {}, { preserveScroll: true });
    };

    return (
        <>
            <div className="flex items-center justify-between border-b border-border/50 bg-background px-6 py-3">
                <div className="flex items-center gap-4">
                    <Link
                        href="/inbox"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>

                    <div className="min-w-0">
                        <div className="mb-0.5 flex items-center gap-2">
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                                {ticket.ticket_number}
                            </span>
                            <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                    backgroundColor: `${ticket.status?.color}15`,
                                    color: ticket.status?.color,
                                }}
                            >
                                {ticket.status?.name}
                            </span>
                            <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                    backgroundColor: `${ticket.priority?.color}15`,
                                    color: ticket.priority?.color,
                                }}
                            >
                                {ticket.priority?.name}
                            </span>
                        </div>
                        <h1 className="truncate text-lg font-semibold tracking-tight">
                            {ticket.subject}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleMarkAsUnread}>
                                <Mail className="mr-2 h-4 w-4" />
                                Markeren als ongelezen
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in nieuw tabblad
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Ticket verwijderen
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <ConfirmationDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                title="Ticket verwijderen"
                description={`Weet je zeker dat je ticket "${ticket.subject}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
                confirmLabel="Verwijderen"
                onConfirm={handleDelete}
                loading={isDeleting}
            />
        </>
    );
}
