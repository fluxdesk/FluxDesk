import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editNotifications } from '@/routes/notifications';
import { edit } from '@/routes/profile';
import { show } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell, KeyRound, Palette, ShieldCheck, User } from 'lucide-react';
import { type PropsWithChildren } from 'react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profiel',
        href: edit(),
        icon: User,
    },
    {
        title: 'Wachtwoord',
        href: editPassword(),
        icon: KeyRound,
    },
    {
        title: 'Tweestapsverificatie',
        href: show(),
        icon: ShieldCheck,
    },
    {
        title: 'Notificaties',
        href: editNotifications(),
        icon: Bell,
    },
    {
        title: 'Weergave',
        href: editAppearance(),
        icon: Palette,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const currentPath = usePage().url;

    const isActive = (href: string) => {
        const url = typeof href === 'string' ? href : (href as { url: string }).url;
        return currentPath.startsWith(url);
    };

    return (
        <div className="flex h-full flex-col sm:flex-row">
            {/* Sidebar - visible on all screen sizes */}
            <aside className="w-full sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-border/50 bg-sidebar">
                <div className="flex flex-col">
                    <div className="p-4 pb-2 sm:pb-4">
                        <h2 className="text-lg font-semibold tracking-tight">Instellingen</h2>
                        <p className="hidden sm:block text-xs text-muted-foreground">Beheer je account</p>
                    </div>
                    <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible px-3 pb-3 sm:pb-0 sm:space-y-1">
                        {sidebarNavItems.map((item) => {
                            const href = typeof item.href === 'string' ? item.href : item.href.url;
                            const active = isActive(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        'flex items-center gap-2 sm:gap-3 whitespace-nowrap sm:whitespace-normal rounded-md px-3 py-2 text-sm font-medium transition-colors shrink-0 sm:shrink',
                                        active
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                                    )}
                                >
                                    {item.icon && <item.icon className="h-4 w-4" />}
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-background">
                <div className="p-4 sm:p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
