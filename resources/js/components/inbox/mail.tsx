'use client';

import * as React from 'react';
import { Search, Plus, LayoutList, AlignJustify, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppNav } from '@/components/inbox/app-nav';
import { MailList, type ListDensity } from '@/components/inbox/mail-list';
import { TicketView } from '@/components/inbox/ticket-view';
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog';
import type { Ticket, Status, Priority, User, Contact, InboxFilters, PaginatedData, SharedData, TicketFolder, Tag, EmailChannel } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { useState, useCallback } from 'react';

interface MailProps {
    tickets: PaginatedData<Ticket>;
    statuses: Status[];
    priorities: Priority[];
    agents: User[];
    contacts: Contact[];
    folders: TicketFolder[];
    tags: Tag[];
    emailChannels: EmailChannel[];
    filters: InboxFilters;
    selectedTicket?: Ticket;
    defaultLayout?: number[];
    defaultCollapsed?: boolean;
    navCollapsedSize?: number;
}

export function Mail({
    tickets,
    statuses,
    priorities,
    agents,
    contacts,
    folders,
    tags,
    emailChannels,
    filters,
    selectedTicket,
    defaultLayout = [12, 22, 66],
    defaultCollapsed = false,
    navCollapsedSize = 4,
}: MailProps) {
    const { unreadCount } = usePage<SharedData>().props;
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [density, setDensity] = useState<ListDensity>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('inbox-density') as ListDensity) || 'normal';
        }
        return 'normal';
    });

    // Persist density preference
    const handleDensityChange = useCallback((value: ListDensity) => {
        setDensity(value);
        localStorage.setItem('inbox-density', value);
    }, []);

    const handleSearch = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            router.get('/inbox', { ...filters, search: search || undefined }, { preserveState: true, preserveScroll: true });
        },
        [search, filters],
    );

    // Ticket list header component for reuse
    const TicketListHeader = (
        <Tabs
            value={filters.unread === '1' ? 'unread' : 'all'}
            onValueChange={(value) => {
                router.get('/inbox', { ...filters, unread: value === 'unread' ? '1' : undefined }, { preserveState: true });
            }}
            className="flex h-full flex-col"
        >
            <div className="flex items-center justify-between px-4 py-2">
                <h1 className="text-lg font-semibold">
                    {filters.folder && filters.folder !== 'inbox'
                        ? folders.find((f) => f.id === Number(filters.folder))?.name || 'Inbox'
                        : 'Inbox'}
                </h1>
                <div className="flex items-center gap-1">
                    <TabsList className="h-8">
                        <TabsTrigger value="all" className="text-xs px-2">
                            Alles
                        </TabsTrigger>
                        <TabsTrigger value="unread" className="text-xs px-2">
                            Ongelezen {unreadCount > 0 && `(${unreadCount})`}
                        </TabsTrigger>
                    </TabsList>
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8">
                                        {density === 'compact' && <List className="h-4 w-4" />}
                                        {density === 'normal' && <AlignJustify className="h-4 w-4" />}
                                        {density === 'spacious' && <LayoutList className="h-4 w-4" />}
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Weergave</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end">
                            <DropdownMenuRadioGroup value={density} onValueChange={(v) => handleDensityChange(v as ListDensity)}>
                                <DropdownMenuRadioItem value="compact">
                                    <List className="mr-2 h-4 w-4" />
                                    Klein
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="normal">
                                    <AlignJustify className="mr-2 h-4 w-4" />
                                    Normaal
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="spacious">
                                    <LayoutList className="mr-2 h-4 w-4" />
                                    Ruim
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <Separator />
            <div className="p-2">
                <form onSubmit={handleSearch}>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Zoek tickets..."
                            className="h-9 pl-8 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </form>
            </div>
            <TabsContent value="all" className="m-0 flex-1 overflow-hidden">
                <MailList items={tickets.data} selectedTicketId={selectedTicket?.id} folders={folders} tags={tags} filters={filters} density={density} />
            </TabsContent>
            <TabsContent value="unread" className="m-0 flex-1 overflow-hidden">
                <MailList items={tickets.data} selectedTicketId={selectedTicket?.id} folders={folders} tags={tags} filters={filters} density={density} />
            </TabsContent>
        </Tabs>
    );

    return (
        <TooltipProvider delayDuration={0}>
            {/* Mobile Layout */}
            <div className="md:hidden h-screen flex flex-col">
                {selectedTicket ? (
                    // Mobile: Show ticket conversation fullscreen
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Ticket view takes full height and handles its own scrolling */}
                        <div className="flex-1 min-h-0">
                            <TicketView
                                ticket={selectedTicket}
                                statuses={statuses}
                                priorities={priorities}
                                agents={agents}
                                contacts={contacts}
                                folders={folders}
                                tags={tags}
                                currentFolder={filters.folder}
                                allTickets={tickets.data}
                            />
                        </div>
                    </div>
                ) : (
                    // Mobile: Show collapsed nav + ticket list
                    <div className="flex h-full">
                        {/* Collapsed navigation */}
                        <div className="w-[50px] shrink-0 bg-muted/40 border-r">
                            <AppNav isCollapsed={true} folders={folders} tags={tags} currentFolder={filters.folder} />
                        </div>
                        {/* Ticket list */}
                        <div className="flex-1 overflow-hidden">
                            {TicketListHeader}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block h-screen">
                <ResizablePanelGroup
                    direction="horizontal"
                    onLayout={(sizes: number[]) => {
                        document.cookie = `fluxdesk:layout=${JSON.stringify(sizes)}`;
                    }}
                    className="h-full items-stretch"
                >
                    {/* Navigation Sidebar */}
                    <ResizablePanel
                        defaultSize={defaultLayout[0]}
                        collapsedSize={navCollapsedSize}
                        collapsible={true}
                        minSize={8}
                        maxSize={18}
                        onCollapse={() => {
                            setIsCollapsed(true);
                            document.cookie = `fluxdesk:collapsed=${JSON.stringify(true)}`;
                        }}
                        onResize={(size) => {
                            setIsCollapsed(size < 8);
                            document.cookie = `fluxdesk:collapsed=${JSON.stringify(size < 8)}`;
                        }}
                        className={cn(
                            'bg-muted/40',
                            isCollapsed && 'min-w-[50px] transition-all duration-300 ease-in-out',
                        )}
                    >
                        <AppNav isCollapsed={isCollapsed} folders={folders} tags={tags} currentFolder={filters.folder} />
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Ticket List */}
                    <ResizablePanel defaultSize={defaultLayout[1]} minSize={22} maxSize={40}>
                        {TicketListHeader}
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Ticket Detail */}
                    <ResizablePanel defaultSize={defaultLayout[2]} minSize={40}>
                        {selectedTicket ? (
                            <TicketView
                                ticket={selectedTicket}
                                statuses={statuses}
                                priorities={priorities}
                                agents={agents}
                                contacts={contacts}
                                folders={folders}
                                tags={tags}
                                currentFolder={filters.folder}
                                allTickets={tickets.data}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <div className="text-center">
                                    <p className="text-lg font-medium text-muted-foreground">Geen ticket geselecteerd</p>
                                    <p className="text-sm text-muted-foreground/70">Selecteer een ticket uit de lijst om details te bekijken</p>
                                </div>
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            <CreateTicketDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                contacts={contacts}
                statuses={statuses}
                priorities={priorities}
                agents={agents}
                emailChannels={emailChannels}
            />
        </TooltipProvider>
    );
}
