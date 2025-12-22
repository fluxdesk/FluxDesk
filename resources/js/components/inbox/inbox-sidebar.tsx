import { Link, usePage } from '@inertiajs/react';
import { Inbox, Users, LayoutDashboard, Settings, Building2, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import InputError from '@/components/input-error';
import { useInitials } from '@/hooks/use-initials';
import type { SharedData } from '@/types';
import { index as inboxIndex } from '@/routes/inbox';
import { index as contactsIndex } from '@/routes/contacts';
import { dashboard } from '@/routes';
import { index as settingsIndex } from '@/routes/organization/settings';
import { edit as profileEdit } from '@/routes/profile';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface NavItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    badge?: number;
}

function NavItem({ href, icon: Icon, label, isActive, badge }: NavItemProps) {
    return (
        <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
                <Link
                    href={href}
                    className={cn(
                        'relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
                        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                            : 'text-sidebar-foreground/70',
                    )}
                >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                    {badge && badge > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                            {badge > 99 ? '99+' : badge}
                        </span>
                    )}
                </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
                {label}
            </TooltipContent>
        </Tooltip>
    );
}

export function InboxSidebar() {
    const { auth, organization, organizations } = usePage<SharedData>().props;
    const currentPath = usePage().url;
    const getInitials = useInitials();
    const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);

    const mainNav = [
        { href: inboxIndex().url, icon: Inbox, label: 'Postvak' },
        { href: contactsIndex().url, icon: Users, label: 'Contacten' },
        { href: dashboard().url, icon: LayoutDashboard, label: 'Statistieken' },
    ];

    const bottomNav = [
        { href: settingsIndex().url, icon: Building2, label: 'Organisatie' },
        { href: profileEdit().url, icon: Settings, label: 'Instellingen' },
    ];

    const isActive = (href: string) => {
        if (href === inboxIndex().url) {
            return currentPath.startsWith('/inbox');
        }
        if (href === contactsIndex().url) {
            return currentPath.startsWith('/contacts');
        }
        if (href === settingsIndex().url) {
            return currentPath.startsWith('/organization');
        }
        if (href === profileEdit().url) {
            return currentPath.startsWith('/settings');
        }
        return currentPath.startsWith(href);
    };

    return (
        <TooltipProvider>
            <div className="flex h-full flex-col items-center py-4">
                {/* Organization Switcher */}
                <DropdownMenu>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <button className="mb-6 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground transition-all hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-sidebar">
                                    {organization?.settings?.logo_path ? (
                                        <img
                                            src={`/storage/${organization.settings.logo_path}`}
                                            alt={organization.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-lg font-bold">
                                            {organization?.name?.charAt(0).toUpperCase() || 'S'}
                                        </span>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                            {organization?.name || 'Organisatie'}
                        </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-64">
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                            Wissel van organisatie
                        </DropdownMenuLabel>
                        {organizations.map((org) => (
                            <DropdownMenuItem
                                key={org.id}
                                onClick={() => {
                                    if (org.id !== organization?.id) {
                                        router.post(`/organizations/${org.slug}/switch`);
                                    }
                                }}
                                className="gap-2 py-2"
                            >
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-xs font-medium">
                                    {org.settings?.logo_path ? (
                                        <img
                                            src={`/storage/${org.settings.logo_path}`}
                                            alt={org.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        org.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <span className="flex-1 truncate font-medium">{org.name}</span>
                                {org.id === organization?.id && (
                                    <Check className="h-4 w-4 text-primary" />
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsCreateOrgOpen(true)} className="gap-2 py-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-dashed">
                                <Plus className="h-3.5 w-3.5" />
                            </div>
                            <span>Organisatie aanmaken</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <CreateOrganizationDialog
                    open={isCreateOrgOpen}
                    onOpenChange={setIsCreateOrgOpen}
                />

                {/* Main Navigation */}
                <nav className="flex flex-1 flex-col items-center gap-1">
                    {mainNav.map((item) => (
                        <NavItem
                            key={item.href}
                            {...item}
                            isActive={isActive(item.href)}
                        />
                    ))}
                </nav>

                {/* Bottom Navigation */}
                <div className="flex flex-col items-center gap-1">
                    {bottomNav.map((item) => (
                        <NavItem
                            key={item.href}
                            {...item}
                            isActive={isActive(item.href)}
                        />
                    ))}

                    {/* User Avatar */}
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Link
                                href={profileEdit().url}
                                className="mt-2 flex items-center justify-center rounded-xl p-1.5 transition-colors hover:bg-sidebar-accent"
                            >
                                <Avatar className="h-8 w-8 border-2 border-sidebar-border">
                                    <AvatarImage src={auth.user?.avatar} />
                                    <AvatarFallback className="bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
                                        {getInitials(auth.user?.name || '')}
                                    </AvatarFallback>
                                </Avatar>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                            {auth.user?.name}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    );
}

function CreateOrganizationDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
    });

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
                        <DialogDescription>
                            Maak een nieuwe organisatie aan voor een apart team of project.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="org-name">Organisatienaam</Label>
                            <Input
                                id="org-name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Bedrijf B.V."
                                autoFocus
                            />
                            <InputError message={errors.name} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
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
