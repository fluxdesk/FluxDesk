import { router } from '@inertiajs/react';
import { Search, Filter, Plus, X, Mail, MailOpen, ArrowUpDown, Clock, AlertTriangle, ArrowDownAZ } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog';
import type { Status, Priority, User, Contact, InboxFilters, EmailChannel, Department } from '@/types';

interface InboxListHeaderProps {
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    contacts: Contact[];
    emailChannels: EmailChannel[];
    departments: Department[];
    filters: InboxFilters;
    totalCount?: number;
    unreadCount?: number;
}

export function InboxListHeader({
    statuses,
    priorities,
    agents,
    contacts,
    emailChannels,
    departments,
    filters,
    totalCount,
    unreadCount = 0,
}: InboxListHeaderProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const updateFilters = useCallback(
        (newFilters: Partial<InboxFilters>) => {
            const updatedFilters = { ...filters, ...newFilters };
            // Remove empty values
            Object.keys(updatedFilters).forEach((key) => {
                if (!updatedFilters[key as keyof InboxFilters]) {
                    delete updatedFilters[key as keyof InboxFilters];
                }
            });
            router.get('/inbox', updatedFilters, { preserveState: true, preserveScroll: true });
        },
        [filters],
    );

    const handleSearch = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            updateFilters({ search: search || undefined });
        },
        [search, updateFilters],
    );

    const clearFilters = useCallback(() => {
        setSearch('');
        router.get('/inbox', {}, { preserveState: true, preserveScroll: true });
    }, []);

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="border-b border-border/50">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
                    {totalCount !== undefined && (
                        <Badge variant="secondary" className="rounded-full px-2 text-xs font-normal">
                            {totalCount}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={filters.unread === '1'}
                                onPressedChange={(pressed) =>
                                    updateFilters({ unread: pressed ? '1' : undefined })
                                }
                                className="h-8 gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                {filters.unread === '1' ? (
                                    <Mail className="h-3.5 w-3.5" />
                                ) : (
                                    <MailOpen className="h-3.5 w-3.5" />
                                )}
                                {unreadCount > 0 && (
                                    <span className="text-xs">{unreadCount}</span>
                                )}
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                            {filters.unread === '1' ? 'Toont alleen ongelezen' : 'Alleen ongelezen tonen'}
                        </TooltipContent>
                    </Tooltip>
                    <Button
                        size="sm"
                        className="h-8 gap-1.5 rounded-lg text-xs"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New
                    </Button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2 px-4 pb-3">
                <form onSubmit={handleSearch} className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Zoek tickets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 rounded-lg border-border/50 bg-muted/30 pl-8 text-sm placeholder:text-muted-foreground/60 focus-visible:bg-background"
                    />
                </form>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="relative h-9 gap-1.5 rounded-lg border-border/50 text-xs"
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Filteren
                            {activeFilterCount > 0 && (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="flex items-center justify-between">
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Alles wissen
                                </Button>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {/* Status Filter */}
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                            Status
                        </DropdownMenuLabel>
                        {statuses.map((status) => (
                            <DropdownMenuItem
                                key={status.id}
                                onClick={() =>
                                    updateFilters({
                                        status:
                                            filters.status === String(status.id)
                                                ? undefined
                                                : String(status.id),
                                    })
                                }
                                className="gap-2"
                            >
                                <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: status.color }}
                                />
                                <span className="flex-1">{status.name}</span>
                                {filters.status === String(status.id) && (
                                    <span className="text-primary">
                                        <X className="h-3 w-3" />
                                    </span>
                                )}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />

                        {/* Priority Filter */}
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                            Prioriteit
                        </DropdownMenuLabel>
                        {priorities.map((priority) => (
                            <DropdownMenuItem
                                key={priority.id}
                                onClick={() =>
                                    updateFilters({
                                        priority:
                                            filters.priority === String(priority.id)
                                                ? undefined
                                                : String(priority.id),
                                    })
                                }
                                className="gap-2"
                            >
                                <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: priority.color }}
                                />
                                <span className="flex-1">{priority.name}</span>
                                {filters.priority === String(priority.id) && (
                                    <span className="text-primary">
                                        <X className="h-3 w-3" />
                                    </span>
                                )}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />

                        {/* Assignee Filter */}
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                            Toegewezen aan
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() =>
                                updateFilters({
                                    assigned_to:
                                        filters.assigned_to === 'unassigned'
                                            ? undefined
                                            : 'unassigned',
                                })
                            }
                            className="gap-2"
                        >
                            <span className="flex-1">Niet toegewezen</span>
                            {filters.assigned_to === 'unassigned' && (
                                <span className="text-primary">
                                    <X className="h-3 w-3" />
                                </span>
                            )}
                        </DropdownMenuItem>
                        {agents.map((agent) => (
                            <DropdownMenuItem
                                key={agent.id}
                                onClick={() =>
                                    updateFilters({
                                        assigned_to:
                                            filters.assigned_to === String(agent.id)
                                                ? undefined
                                                : String(agent.id),
                                    })
                                }
                                className="gap-2"
                            >
                                <span className="flex-1">{agent.name}</span>
                                {filters.assigned_to === String(agent.id) && (
                                    <span className="text-primary">
                                        <X className="h-3 w-3" />
                                    </span>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort dropdown */}
                <Select
                    value={filters.sort || 'latest'}
                    onValueChange={(value) => updateFilters({ sort: value as InboxFilters['sort'] })}
                >
                    <SelectTrigger className="h-9 w-[140px] gap-1.5 rounded-lg border-border/50 text-xs">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="latest">
                            <span className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                Nieuwste eerst
                            </span>
                        </SelectItem>
                        <SelectItem value="oldest">
                            <span className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                Oudste eerst
                            </span>
                        </SelectItem>
                        <SelectItem value="priority">
                            <span className="flex items-center gap-2">
                                <ArrowDownAZ className="h-3.5 w-3.5" />
                                Prioriteit
                            </span>
                        </SelectItem>
                        <SelectItem value="sla">
                            <span className="flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                SLA urgentie
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <CreateTicketDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                contacts={contacts}
                statuses={statuses}
                priorities={priorities}
                agents={agents}
                emailChannels={emailChannels}
                departments={departments}
            />
        </div>
    );
}
