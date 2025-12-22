import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type PortalSharedData } from '@/types/portal';
import { Link, router, usePage } from '@inertiajs/react';
import { Home, LogOut, Plus, Ticket, User } from 'lucide-react';
import { type PropsWithChildren } from 'react';

interface PortalLayoutProps {
    title?: string;
}

export default function PortalLayout({
    children,
    title,
}: PropsWithChildren<PortalLayoutProps>) {
    const { organization, contact } = usePage<PortalSharedData>().props;

    const brandStyles = {
        '--portal-primary': organization?.settings?.primary_color ?? '#18181b',
        '--portal-secondary': organization?.settings?.secondary_color ?? '#71717a',
        '--portal-accent': organization?.settings?.accent_color ?? '#3b82f6',
    } as React.CSSProperties;

    const orgSlug = organization?.slug ?? '';

    const handleLogout = () => {
        router.post(`/${orgSlug}/portal/logout`);
    };

    const navItems = [
        { href: `/${orgSlug}/portal`, label: 'Dashboard', icon: Home },
        { href: `/${orgSlug}/portal/tickets/create`, label: 'Nieuw ticket', icon: Plus },
        { href: `/${orgSlug}/portal/profile`, label: 'Profiel', icon: User },
    ];

    return (
        <div
            className="min-h-svh bg-muted/30 dark:bg-background"
            style={brandStyles}
        >
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
                    {/* Logo / Name */}
                    <Link href={`/${orgSlug}/portal`} className="flex items-center gap-3">
                        {organization?.settings?.logo_path ? (
                            <img
                                src={`/storage/${organization.settings.logo_path}`}
                                alt={organization?.name}
                                className="h-8 w-auto"
                            />
                        ) : (
                            <div
                                className="flex size-9 items-center justify-center rounded-lg text-white font-bold"
                                style={{ backgroundColor: 'var(--portal-primary)' }}
                            >
                                {organization?.name?.charAt(0) ?? 'P'}
                            </div>
                        )}
                        <span className="font-semibold text-foreground hidden sm:inline">
                            {organization?.name ?? 'Support Portal'}
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                            >
                                <item.icon className="size-4" />
                                {item.label}
                            </Link>
                        ))}

                        {/* Mobile menu */}
                        <div className="sm:hidden">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Ticket className="size-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {navItems.map((item) => (
                                        <DropdownMenuItem key={item.href} asChild>
                                            <Link href={item.href} className="flex items-center gap-2">
                                                <item.icon className="size-4" />
                                                {item.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout}>
                                        <LogOut className="size-4 mr-2" />
                                        Uitloggen
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* User dropdown (desktop) */}
                        <div className="hidden sm:block ml-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="gap-2">
                                        <div
                                            className="flex size-7 items-center justify-center rounded-full text-white text-xs font-medium"
                                            style={{ backgroundColor: 'var(--portal-accent)' }}
                                        >
                                            {contact?.display_name?.charAt(0).toUpperCase() ?? 'U'}
                                        </div>
                                        <span className="max-w-[100px] truncate">
                                            {contact?.display_name ?? 'Gebruiker'}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <div className="px-2 py-1.5">
                                        <p className="text-sm font-medium truncate">
                                            {contact?.display_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {contact?.email}
                                        </p>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={`/${orgSlug}/portal/profile`} className="flex items-center gap-2">
                                            <User className="size-4" />
                                            Profiel
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout}>
                                        <LogOut className="size-4 mr-2" />
                                        Uitloggen
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-4xl px-4 py-8">
                {title && (
                    <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
                )}
                {children}
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t bg-background/50">
                <div className="mx-auto max-w-4xl px-4 py-6">
                    <p className="text-center text-sm text-muted-foreground">
                        {organization?.name} Support Portal
                    </p>
                </div>
            </footer>
        </div>
    );
}
