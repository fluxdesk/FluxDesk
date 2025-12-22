'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useInitials } from '@/hooks/use-initials';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    Search,
    ArrowRight,
    Check,
    ChevronLeft,
    GitMerge,
    Loader2,
    MessageSquare,
    Users,
    Mail,
    AlertTriangle,
} from 'lucide-react';
import type { Ticket } from '@/types';

interface MergeTicketsWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentTicket: Ticket;
    allTickets: Ticket[];
}

type MergeStep = 'select' | 'configure' | 'confirm';

interface MergeOptions {
    keepAsPrimary: 'current' | 'selected';
    copyCcRecipients: boolean;
    addMergeNote: boolean;
}

export function MergeTicketsWizard({
    open,
    onOpenChange,
    currentTicket,
    allTickets,
}: MergeTicketsWizardProps) {
    const getInitials = useInitials();
    const [step, setStep] = React.useState<MergeStep>('select');
    const [search, setSearch] = React.useState('');
    const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [options, setOptions] = React.useState<MergeOptions>({
        keepAsPrimary: 'current',
        copyCcRecipients: true,
        addMergeNote: true,
    });

    // Reset state when dialog opens/closes
    React.useEffect(() => {
        if (!open) {
            setStep('select');
            setSearch('');
            setSelectedTicket(null);
            setOptions({
                keepAsPrimary: 'current',
                copyCcRecipients: true,
                addMergeNote: true,
            });
        }
    }, [open]);

    // Filter tickets - exclude current ticket
    const filteredTickets = React.useMemo(() => {
        return allTickets
            .filter((t) => t.id !== currentTicket.id)
            .filter((t) => {
                if (!search) return true;
                const searchLower = search.toLowerCase();
                return (
                    t.subject.toLowerCase().includes(searchLower) ||
                    t.ticket_number.toLowerCase().includes(searchLower) ||
                    t.contact?.name?.toLowerCase().includes(searchLower) ||
                    t.contact?.email?.toLowerCase().includes(searchLower)
                );
            });
    }, [allTickets, currentTicket.id, search]);

    const handleSelectTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setStep('configure');
    };

    const handleMerge = () => {
        if (!selectedTicket) return;

        setIsProcessing(true);

        const primaryId = options.keepAsPrimary === 'current' ? currentTicket.id : selectedTicket.id;
        const secondaryId = options.keepAsPrimary === 'current' ? selectedTicket.id : currentTicket.id;

        router.post(`/inbox/${primaryId}/merge`, {
            merge_ticket_id: secondaryId,
            copy_cc_recipients: options.copyCcRecipients,
            add_merge_note: options.addMergeNote,
        }, {
            onSuccess: () => {
                toast.success('Tickets samengevoegd');
                onOpenChange(false);
            },
            onError: () => {
                toast.error('Samenvoegen mislukt');
            },
            onFinish: () => {
                setIsProcessing(false);
            },
        });
    };

    const primaryTicket = options.keepAsPrimary === 'current' ? currentTicket : selectedTicket;
    const secondaryTicket = options.keepAsPrimary === 'current' ? selectedTicket : currentTicket;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
                {/* Header */}
                <DialogHeader className="border-b px-5 py-4">
                    <div className="flex items-center gap-3">
                        {step !== 'select' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => setStep(step === 'confirm' ? 'configure' : 'select')}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <div className="min-w-0">
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <GitMerge className="h-4 w-4 shrink-0" />
                                Tickets samenvoegen
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                {step === 'select' && 'Selecteer een ticket'}
                                {step === 'configure' && 'Configureer opties'}
                                {step === 'confirm' && 'Bevestig samenvoeging'}
                            </DialogDescription>
                        </div>
                    </div>
                    {/* Step indicator - minimal */}
                    <div className="mt-3 flex items-center gap-1">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    'h-1 flex-1 rounded-full transition-colors',
                                    (s === 1 && step !== 'select') || (s === 2 && step === 'confirm') || (s === 3 && step === 'confirm')
                                        ? 'bg-primary'
                                        : s === 1 && step === 'select'
                                        ? 'bg-primary'
                                        : s === 2 && step === 'configure'
                                        ? 'bg-primary'
                                        : 'bg-muted',
                                )}
                            />
                        ))}
                    </div>
                </DialogHeader>

                {/* Step 1: Select ticket */}
                {step === 'select' && (
                    <div className="flex flex-col">
                        {/* Search */}
                        <div className="border-b px-4 py-2.5">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Zoek ticket..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 pl-8 text-sm"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Ticket list */}
                        <ScrollArea className="max-h-[280px]">
                            <div className="divide-y">
                                {filteredTickets.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                        <Search className="mb-2 h-6 w-6 opacity-50" />
                                        <p className="text-sm">Geen tickets gevonden</p>
                                    </div>
                                ) : (
                                    filteredTickets.slice(0, 10).map((ticket) => (
                                        <button
                                            key={ticket.id}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                                            onClick={() => handleSelectTicket(ticket)}
                                        >
                                            <Avatar className="h-7 w-7 shrink-0">
                                                <AvatarFallback className="text-[10px]">
                                                    {getInitials(ticket.contact?.name || ticket.contact?.email || '')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">{ticket.subject}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {ticket.contact?.name || ticket.contact?.email} · #{ticket.ticket_number}
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* Step 2: Configure */}
                {step === 'configure' && selectedTicket && (
                    <div className="flex flex-col">
                        <div className="space-y-5 px-5 py-4">
                            {/* Which ticket stays */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Welk ticket blijft behouden?</Label>
                                <div className="grid gap-2">
                                    <TicketOption
                                        ticket={currentTicket}
                                        selected={options.keepAsPrimary === 'current'}
                                        onClick={() => setOptions({ ...options, keepAsPrimary: 'current' })}
                                        label="Huidig"
                                    />
                                    <TicketOption
                                        ticket={selectedTicket}
                                        selected={options.keepAsPrimary === 'selected'}
                                        onClick={() => setOptions({ ...options, keepAsPrimary: 'selected' })}
                                        label="Geselecteerd"
                                    />
                                </div>
                            </div>

                            {/* Options */}
                            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <Label htmlFor="copy-cc" className="text-sm">CC-ontvangers overnemen</Label>
                                    </div>
                                    <Switch
                                        id="copy-cc"
                                        checked={options.copyCcRecipients}
                                        onCheckedChange={(checked) => setOptions({ ...options, copyCcRecipients: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <Label htmlFor="add-note" className="text-sm">Samenvoegnotitie toevoegen</Label>
                                    </div>
                                    <Switch
                                        id="add-note"
                                        checked={options.addMergeNote}
                                        onCheckedChange={(checked) => setOptions({ ...options, addMergeNote: checked })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 border-t px-5 py-3">
                            <Button variant="outline" size="sm" onClick={() => setStep('select')}>
                                Terug
                            </Button>
                            <Button size="sm" onClick={() => setStep('confirm')}>
                                Volgende
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Confirm */}
                {step === 'confirm' && selectedTicket && primaryTicket && secondaryTicket && (
                    <div className="flex flex-col">
                        <div className="space-y-4 px-5 py-4">
                            {/* Warning */}
                            <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                                <div className="text-sm">
                                    <p className="font-medium text-amber-800 dark:text-amber-200">Dit kan niet ongedaan worden</p>
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        #{secondaryTicket.ticket_number} wordt verwijderd.
                                    </p>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0 rounded-lg border bg-muted/30 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Wordt verwijderd</p>
                                    <p className="truncate text-sm font-medium">{secondaryTicket.subject}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0 rounded-lg border border-primary bg-primary/5 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wide text-primary">Blijft behouden</p>
                                    <p className="truncate text-sm font-medium">{primaryTicket.subject}</p>
                                </div>
                            </div>

                            {/* What will happen */}
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                                    <MessageSquare className="h-3 w-3" />
                                    Berichten verplaatsen
                                </span>
                                {options.copyCcRecipients && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                                        <Users className="h-3 w-3" />
                                        CC overnemen
                                    </span>
                                )}
                                {options.addMergeNote && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                                        <Mail className="h-3 w-3" />
                                        Notitie toevoegen
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 border-t px-5 py-3">
                            <Button variant="outline" size="sm" onClick={() => setStep('configure')} disabled={isProcessing}>
                                Terug
                            </Button>
                            <Button size="sm" onClick={handleMerge} disabled={isProcessing}>
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                        Bezig...
                                    </>
                                ) : (
                                    <>
                                        <GitMerge className="mr-2 h-3.5 w-3.5" />
                                        Samenvoegen
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function TicketOption({ ticket, selected, onClick, label }: { ticket: Ticket; selected: boolean; onClick: () => void; label: string }) {
    const getInitials = useInitials();

    return (
        <button
            type="button"
            className={cn(
                'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
            )}
            onClick={onClick}
        >
            <div className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full border-2 shrink-0',
                selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
            )}>
                {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
            </div>
            <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-[10px]">
                    {getInitials(ticket.contact?.name || ticket.contact?.email || '')}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">#{ticket.ticket_number}</span>
                </div>
                <p className="truncate text-sm font-medium">{ticket.subject}</p>
            </div>
        </button>
    );
}
