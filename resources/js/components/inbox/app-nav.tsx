'use client';

import * as React from 'react';
import { Link, router, usePage, useForm } from '@inertiajs/react';
import {
    Inbox,
    Users,
    LayoutDashboard,
    Building,
    Building2,
    Settings,
    LogOut,
    Check,
    Plus,
    ChevronsUpDown,
    CheckCircle,
    AlertTriangle,
    Archive,
    Trash2,
    Folder,
    FolderPlus,
    Pencil,
    Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import InputError from '@/components/input-error';
import { useInitials } from '@/hooks/use-initials';
import { ColorPicker } from '@/components/common/color-picker';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import type { SharedData, TicketFolder, Tag } from '@/types';
import { toast } from 'sonner';

interface AppNavProps {
    isCollapsed: boolean;
    folders?: TicketFolder[];
    tags?: Tag[];
    currentFolder?: string;
}

const folderIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    inbox: Inbox,
    solved: CheckCircle,
    spam: AlertTriangle,
    archived: Archive,
    deleted: Trash2,
    folder: Folder,
};

export function AppNav({ isCollapsed, folders: propFolders, currentFolder }: AppNavProps) {
    const { auth, organization, organizations, isAdmin, inboxCount, folders: sharedFolders } = usePage<SharedData>().props;
    // Use props if provided, otherwise fall back to shared data
    const folders = propFolders ?? sharedFolders ?? [];
    const currentPath = usePage().url;
    const getInitials = useInitials();
    const [isCreateOrgOpen, setIsCreateOrgOpen] = React.useState(false);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = React.useState(false);
    const [editingFolder, setEditingFolder] = React.useState<TicketFolder | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = React.useState<number | string | null>(null);

    const mainLinks = [
        { title: 'Contacten', label: '', icon: Users, href: '/contacts' },
        { title: 'Bedrijven', label: '', icon: Building, href: '/companies' },
        { title: 'Statistieken', label: '', icon: LayoutDashboard, href: '/dashboard' },
    ];

    // Only show organization settings for admins
    const bottomLinks = [
        ...(isAdmin ? [{ title: 'Organisatie', label: '', icon: Building2, href: '/organization/settings' }] : []),
        { title: 'Instellingen', label: '', icon: Settings, href: '/settings/profile' },
    ];

    const isActive = (href: string) => {
        if (href === '/contacts') return currentPath.startsWith('/contacts');
        if (href === '/companies') return currentPath.startsWith('/companies');
        if (href === '/dashboard') return currentPath === '/dashboard';
        if (href === '/organization/settings') return currentPath.startsWith('/organization');
        if (href === '/settings/profile') return currentPath.startsWith('/settings');
        return false;
    };

    const isFolderActive = (folderId: number | string | null) => {
        if (!currentPath.startsWith('/inbox')) return false;
        // 'inbox' is a virtual folder - active when no folder filter or folder=inbox
        if (folderId === 'inbox') return !currentFolder || currentFolder === 'inbox';
        if (folderId === null) return !currentFolder;
        return currentFolder === String(folderId);
    };

    const handleFolderClick = (folderId: number | string | null) => {
        const params = new URLSearchParams(window.location.search);
        if (folderId === null || folderId === 'inbox') {
            params.delete('folder');
        } else {
            params.set('folder', String(folderId));
        }
        params.delete('unread');
        router.get('/inbox', Object.fromEntries(params), { preserveState: true });
    };

    const handleDragOver = (e: React.DragEvent, folderId: number | string) => {
        e.preventDefault();
        setDragOverFolderId(folderId);
    };

    const handleDragLeave = () => {
        setDragOverFolderId(null);
    };

    const handleDrop = (e: React.DragEvent, folderId: number | string) => {
        e.preventDefault();
        setDragOverFolderId(null);
        const ticketId = e.dataTransfer.getData('ticketId');
        if (ticketId) {
            // 'inbox' means move to Inbox (folder_id = null)
            const folderIdValue = folderId === 'inbox' ? null : folderId;
            router.post(`/inbox/${ticketId}/move`, { folder_id: folderIdValue }, {
                preserveState: true,
                onSuccess: () => toast.success('Ticket verplaatst'),
            });
        }
    };

    const getFolderIcon = (folder: TicketFolder) => {
        const Icon = folderIcons[folder.system_type || folder.icon || 'folder'] || Folder;
        return Icon;
    };

    // Separate system folders from custom folders
    // Filter out 'inbox' type - Inbox is a virtual folder shown separately
    const systemFolders = folders.filter((f) => f.is_system && f.system_type !== 'inbox');
    const customFolders = folders.filter((f) => !f.is_system);

    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex h-screen flex-col overflow-hidden">
                {/* Organization Switcher */}
                <div className={cn('flex h-[52px] items-center justify-center', isCollapsed ? 'h-[52px]' : 'px-2')}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    'flex w-full items-center gap-2 [&>span]:line-clamp-1 [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-1 [&>span]:truncate',
                                    isCollapsed && 'h-9 w-9 shrink-0 justify-center p-0 [&>span]:w-auto [&>svg]:hidden',
                                )}
                            >
                                <span>
                                    {organization?.settings?.logo_path ? (
                                        <img
                                            src={`/storage/${organization.settings.logo_path}`}
                                            alt={organization?.name || ''}
                                            className="h-5 w-5 shrink-0 rounded object-cover"
                                        />
                                    ) : (
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                                            {organization?.name?.charAt(0).toUpperCase() || 'O'}
                                        </span>
                                    )}
                                    <span className={cn('ml-2 truncate', isCollapsed && 'hidden')}>
                                        {organization?.name || 'Organisatie'}
                                    </span>
                                </span>
                                <ChevronsUpDown className={cn('ml-auto h-4 w-4 shrink-0 opacity-50', isCollapsed && 'hidden')} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64">
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                Wissel van organisatie
                            </DropdownMenuLabel>
                            {organizations.map((org) => (
                                <DropdownMenuItem
                                    key={org.id}
                                    onClick={() => org.id !== organization?.id && router.post(`/organizations/${org.slug}/switch`)}
                                    className="gap-2 py-2"
                                >
                                    {org.settings?.logo_path ? (
                                        <img src={`/storage/${org.settings.logo_path}`} alt={org.name} className="h-5 w-5 shrink-0 rounded object-cover" />
                                    ) : (
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium">
                                            {org.name.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                    <span className="flex-1 truncate">{org.name}</span>
                                    {org.id === organization?.id && <Check className="h-4 w-4 text-primary" />}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setIsCreateOrgOpen(true)} className="gap-2 py-2">
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-dashed">
                                    <Plus className="h-3 w-3" />
                                </div>
                                <span>Organisatie aanmaken</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <Separator />

                {/* Scrollable Content */}
                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-4 py-2">
                        {/* Folders Section */}
                        <div className="px-2">
                            {!isCollapsed && (
                                <div className="flex items-center justify-between px-2 py-1">
                                    <span className="text-xs font-medium text-muted-foreground">Mappen</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={() => setIsCreateFolderOpen(true)}
                                    >
                                        <FolderPlus className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <nav className="grid gap-0.5">
                                {/* Inbox - virtual folder for tickets with no folder */}
                                {(() => {
                                    const active = isFolderActive('inbox');
                                    const isDragOver = dragOverFolderId === 'inbox';
                                    return isCollapsed ? (
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => handleFolderClick('inbox')}
                                                    onDragOver={(e) => handleDragOver(e, 'inbox')}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, 'inbox')}
                                                    className={cn(
                                                        buttonVariants({ variant: active ? 'default' : 'ghost', size: 'icon' }),
                                                        'h-9 w-9',
                                                        isDragOver && 'ring-2 ring-primary',
                                                    )}
                                                >
                                                    <Inbox className="h-4 w-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="flex items-center gap-2">
                                                Inbox
                                                {inboxCount > 0 && <span className="text-muted-foreground">{inboxCount}</span>}
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <button
                                            onClick={() => handleFolderClick('inbox')}
                                            onDragOver={(e) => handleDragOver(e, 'inbox')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'inbox')}
                                            className={cn(
                                                buttonVariants({ variant: active ? 'default' : 'ghost', size: 'sm' }),
                                                'justify-start',
                                                isDragOver && 'ring-2 ring-primary',
                                            )}
                                        >
                                            <Inbox className="mr-2 h-4 w-4" />
                                            <span className="flex-1 text-left truncate">Inbox</span>
                                            {inboxCount > 0 && (
                                                <Badge variant={active ? 'secondary' : 'outline'} className="ml-auto h-5 px-1.5 text-xs">
                                                    {inboxCount}
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })()}

                                {/* System Folders (Solved, Spam, Archived, Deleted) */}
                                {systemFolders.map((folder) => {
                                        const Icon = getFolderIcon(folder);
                                        const active = isFolderActive(folder.id);
                                        const isDragOver = dragOverFolderId === folder.id;
                                        return isCollapsed ? (
                                            <Tooltip key={folder.id} delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => handleFolderClick(folder.id)}
                                                        onDragOver={(e) => handleDragOver(e, folder.id)}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={(e) => handleDrop(e, folder.id)}
                                                        className={cn(
                                                            buttonVariants({ variant: active ? 'default' : 'ghost', size: 'icon' }),
                                                            'h-9 w-9',
                                                            isDragOver && 'ring-2 ring-primary',
                                                        )}
                                                    >
                                                        <Icon className="h-4 w-4" style={{ color: active ? undefined : folder.color }} />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="flex items-center gap-2">
                                                    {folder.name}
                                                    {folder.tickets_count !== undefined && folder.tickets_count > 0 && (
                                                        <span className="text-muted-foreground">{folder.tickets_count}</span>
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <ContextMenu key={folder.id}>
                                                <ContextMenuTrigger asChild>
                                                    <button
                                                        onClick={() => handleFolderClick(folder.id)}
                                                        onDragOver={(e) => handleDragOver(e, folder.id)}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={(e) => handleDrop(e, folder.id)}
                                                        className={cn(
                                                            buttonVariants({ variant: active ? 'default' : 'ghost', size: 'sm' }),
                                                            'w-full justify-start',
                                                            isDragOver && 'ring-2 ring-primary',
                                                        )}
                                                    >
                                                        <Icon className="mr-2 h-4 w-4" style={{ color: active ? undefined : folder.color }} />
                                                        <span className="flex-1 text-left truncate">{folder.name}</span>
                                                        {folder.tickets_count !== undefined && folder.tickets_count > 0 && (
                                                            <Badge variant={active ? 'secondary' : 'outline'} className="ml-auto h-5 px-1.5 text-xs">
                                                                {folder.tickets_count}
                                                            </Badge>
                                                        )}
                                                    </button>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent className="w-48">
                                                    <ContextMenuItem onClick={() => setEditingFolder(folder)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Hernoemen
                                                    </ContextMenuItem>
                                                    <ContextMenuItem onClick={() => setEditingFolder(folder)}>
                                                        <Palette className="mr-2 h-4 w-4" />
                                                        Kleur wijzigen
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        );
                                    })}

                                    {/* Custom Folders */}
                                    {customFolders.length > 0 && (
                                        <>
                                            {!isCollapsed && <Separator className="my-1" />}
                                            {customFolders.map((folder) => {
                                                const active = isFolderActive(folder.id);
                                                const isDragOver = dragOverFolderId === folder.id;
                                                return isCollapsed ? (
                                                    <Tooltip key={folder.id} delayDuration={0}>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => handleFolderClick(folder.id)}
                                                                onDragOver={(e) => handleDragOver(e, folder.id)}
                                                                onDragLeave={handleDragLeave}
                                                                onDrop={(e) => handleDrop(e, folder.id)}
                                                                className={cn(
                                                                    buttonVariants({ variant: active ? 'default' : 'ghost', size: 'icon' }),
                                                                    'h-9 w-9',
                                                                    isDragOver && 'ring-2 ring-primary',
                                                                )}
                                                            >
                                                                <Folder className="h-4 w-4" style={{ color: active ? undefined : folder.color }} />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="flex items-center gap-2">
                                                            {folder.name}
                                                            {folder.tickets_count !== undefined && folder.tickets_count > 0 && (
                                                                <span className="text-muted-foreground">{folder.tickets_count}</span>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <ContextMenu key={folder.id}>
                                                        <ContextMenuTrigger asChild>
                                                            <button
                                                                onClick={() => handleFolderClick(folder.id)}
                                                                onDragOver={(e) => handleDragOver(e, folder.id)}
                                                                onDragLeave={handleDragLeave}
                                                                onDrop={(e) => handleDrop(e, folder.id)}
                                                                className={cn(
                                                                    buttonVariants({ variant: active ? 'default' : 'ghost', size: 'sm' }),
                                                                    'w-full justify-start',
                                                                    isDragOver && 'ring-2 ring-primary',
                                                                )}
                                                            >
                                                                <Folder className="mr-2 h-4 w-4" style={{ color: active ? undefined : folder.color }} />
                                                                <span className="flex-1 text-left truncate">{folder.name}</span>
                                                                {folder.tickets_count !== undefined && folder.tickets_count > 0 && (
                                                                    <Badge variant={active ? 'secondary' : 'outline'} className="ml-auto h-5 px-1.5 text-xs">
                                                                        {folder.tickets_count}
                                                                    </Badge>
                                                                )}
                                                            </button>
                                                        </ContextMenuTrigger>
                                                        <ContextMenuContent className="w-48">
                                                            <ContextMenuItem onClick={() => setEditingFolder(folder)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Hernoemen
                                                            </ContextMenuItem>
                                                            <ContextMenuItem onClick={() => setEditingFolder(folder)}>
                                                                <Palette className="mr-2 h-4 w-4" />
                                                                Kleur wijzigen
                                                            </ContextMenuItem>
                                                            <ContextMenuSeparator />
                                                            <ContextMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => router.delete(`/folders/${folder.id}`, {
                                                                    onSuccess: () => toast.success('Map verwijderd'),
                                                                    onError: () => toast.error('Map verwijderen mislukt'),
                                                                })}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Verwijderen
                                                            </ContextMenuItem>
                                                        </ContextMenuContent>
                                                    </ContextMenu>
                                                );
                                            })}
                                        </>
                                    )}
                                </nav>
                            </div>

                        <Separator />

                        {/* Main Navigation */}
                        <nav className="grid gap-1 px-2">
                            {mainLinks.map((link) => {
                                const active = isActive(link.href);
                                const variant = active ? 'default' : 'ghost';
                                return isCollapsed ? (
                                    <Tooltip key={link.href} delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={link.href}
                                                className={cn(
                                                    buttonVariants({ variant, size: 'icon' }),
                                                    'h-9 w-9',
                                                    variant === 'default' && 'dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white',
                                                )}
                                            >
                                                <link.icon className="h-4 w-4" />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="flex items-center gap-4">
                                            {link.title}
                                            {link.label && <span className="ml-auto text-muted-foreground">{link.label}</span>}
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={cn(
                                            buttonVariants({ variant, size: 'sm' }),
                                            variant === 'default' && 'dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white',
                                            'justify-start',
                                        )}
                                    >
                                        <link.icon className="mr-2 h-4 w-4" />
                                        {link.title}
                                        {link.label && (
                                            <span className={cn('ml-auto', variant === 'default' && 'text-background dark:text-white')}>
                                                {link.label}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        <Separator />

                        <nav className="grid gap-1 px-2">
                            {bottomLinks.map((link) => {
                                const active = isActive(link.href);
                                const variant = active ? 'default' : 'ghost';
                                return isCollapsed ? (
                                    <Tooltip key={link.href} delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <Link href={link.href} className={cn(buttonVariants({ variant, size: 'icon' }), 'h-9 w-9')}>
                                                <link.icon className="h-4 w-4" />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">{link.title}</TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <Link key={link.href} href={link.href} className={cn(buttonVariants({ variant, size: 'sm' }), 'justify-start')}>
                                        <link.icon className="mr-2 h-4 w-4" />
                                        {link.title}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </ScrollArea>

                {/* Notifications */}
                <div className="mt-auto">
                    <Separator />
                    <div className="p-2">
                        <div className="mb-1">
                            <NotificationDropdown isCollapsed={isCollapsed} />
                        </div>
                    </div>
                </div>
                <Separator />
                <div className="p-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start gap-2',
                                    isCollapsed && 'h-9 w-9 justify-center p-0',
                                )}
                            >
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={auth.user?.avatar} />
                                    <AvatarFallback className="text-[10px]">{getInitials(auth.user?.name || '')}</AvatarFallback>
                                </Avatar>
                                {!isCollapsed && (
                                    <div className="flex flex-1 flex-col items-start text-left">
                                        <span className="truncate text-sm font-medium">{auth.user?.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{auth.user?.email}</span>
                                    </div>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isCollapsed ? 'center' : 'end'} side="top" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col">
                                    <span>{auth.user?.name}</span>
                                    <span className="text-xs font-normal text-muted-foreground">{auth.user?.email}</span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/settings/profile">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Profielinstellingen
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => router.post('/logout')}
                                className="text-destructive focus:text-destructive"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Uitloggen
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <CreateOrgDialog open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen} />
                <CreateFolderDialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen} />
                <EditFolderDialog folder={editingFolder} onOpenChange={(open) => !open && setEditingFolder(null)} />
            </div>
        </TooltipProvider>
    );
}

function CreateOrgDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/organizations', {
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
                        <DialogTitle>Organisatie aanmaken</DialogTitle>
                        <DialogDescription>Maak een nieuwe organisatie aan voor een apart team of project.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="org-name">Organisatienaam</Label>
                            <Input id="org-name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Bedrijf B.V." autoFocus />
                            <InputError message={errors.name} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
                        <Button type="submit" disabled={processing || !data.name.trim()}>{processing ? 'Aanmaken...' : 'Aanmaken'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function CreateFolderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        color: '#6b7280',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/folders', {
            onSuccess: () => {
                toast.success('Map aangemaakt');
                reset();
                onOpenChange(false);
            },
            onError: () => toast.error('Map aanmaken mislukt'),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Map aanmaken</DialogTitle>
                        <DialogDescription>Maak een nieuwe map om je tickets te organiseren.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="folder-name">Mapnaam</Label>
                            <Input
                                id="folder-name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Mijn map"
                                autoFocus
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Kleur</Label>
                            <ColorPicker value={data.color} onChange={(color) => setData('color', color)} />
                            <InputError message={errors.color} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuleren
                        </Button>
                        <Button type="submit" disabled={processing || !data.name.trim()}>
                            {processing ? 'Aanmaken...' : 'Aanmaken'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditFolderDialog({ folder, onOpenChange }: { folder: TicketFolder | null; onOpenChange: (open: boolean) => void }) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        name: folder?.name || '',
        color: folder?.color || '#6b7280',
    });

    React.useEffect(() => {
        if (folder) {
            setData({ name: folder.name, color: folder.color });
        }
    }, [folder, setData]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!folder) return;
        patch(`/folders/${folder.id}`, {
            onSuccess: () => {
                toast.success('Map bijgewerkt');
                reset();
                onOpenChange(false);
            },
            onError: () => toast.error('Map bijwerken mislukt'),
        });
    }

    return (
        <Dialog open={!!folder} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Map bewerken</DialogTitle>
                        <DialogDescription>Wijzig de mapnaam en kleur.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-folder-name">Mapnaam</Label>
                            <Input
                                id="edit-folder-name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                autoFocus
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Kleur</Label>
                            <ColorPicker value={data.color} onChange={(color) => setData('color', color)} />
                            <InputError message={errors.color} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuleren
                        </Button>
                        <Button type="submit" disabled={processing || !data.name.trim()}>
                            {processing ? 'Opslaan...' : 'Opslaan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
