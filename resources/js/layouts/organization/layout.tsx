import { cn } from '@/lib/utils';
import { index as settingsIndex } from '@/routes/organization/settings';
import { index as brandingIndex } from '@/routes/organization/branding';
import { index as ticketNumbersIndex } from '@/routes/organization/ticket-numbers';
import { index as portalIndex } from '@/routes/organization/portal';
import { index as statusesIndex } from '@/routes/organization/statuses';
import { index as prioritiesIndex } from '@/routes/organization/priorities';
import { index as tagsIndex } from '@/routes/organization/tags';
import { index as slasIndex } from '@/routes/organization/slas';
import { index as membersIndex } from '@/routes/organization/members';
import { index as emailChannelsIndex } from '@/routes/organization/email-channels';
import { index as messagingChannelsIndex } from '@/routes/organization/messaging-channels';
import { index as departmentsIndex } from '@/routes/organization/departments';
import { index as integrationsIndex } from '@/routes/organization/integrations';
import { index as aiSettingsIndex } from '@/routes/organization/ai-settings';
import { index as webhooksIndex } from '@/routes/organization/webhooks';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Settings, CircleDot, Flag, Tags, Clock, Users, Mail, MessageCircle, Building2, Plug, Palette, Hash, Globe, Webhook, Bot } from 'lucide-react';
import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

export default function OrganizationLayout({ children }: PropsWithChildren) {
    const { t } = useTranslation('organization');

    const sidebarNavItems: NavItem[] = [
        {
            title: t('nav.general'),
            href: settingsIndex(),
            icon: Settings,
        },
        {
            title: t('nav.branding'),
            href: brandingIndex(),
            icon: Palette,
        },
        {
            title: t('nav.ticket_numbers'),
            href: ticketNumbersIndex(),
            icon: Hash,
        },
        {
            title: t('nav.portal'),
            href: portalIndex(),
            icon: Globe,
        },
        {
            title: t('nav.statuses'),
            href: statusesIndex(),
            icon: CircleDot,
        },
        {
            title: t('nav.priorities'),
            href: prioritiesIndex(),
            icon: Flag,
        },
        {
            title: t('nav.tags'),
            href: tagsIndex(),
            icon: Tags,
        },
        {
            title: t('nav.slas'),
            href: slasIndex(),
            icon: Clock,
        },
        {
            title: t('nav.team'),
            href: membersIndex(),
            icon: Users,
        },
        {
            title: t('nav.departments'),
            href: departmentsIndex(),
            icon: Building2,
        },
        {
            title: t('nav.email'),
            href: emailChannelsIndex(),
            icon: Mail,
        },
        {
            title: t('nav.messaging'),
            href: messagingChannelsIndex(),
            icon: MessageCircle,
        },
        {
            title: t('nav.integrations'),
            href: integrationsIndex(),
            icon: Plug,
        },
        {
            title: t('nav.ai'),
            href: aiSettingsIndex(),
            icon: Bot,
        },
        {
            title: t('nav.webhooks'),
            href: webhooksIndex(),
            icon: Webhook,
        },
    ];
    const currentPath = usePage().url;

    const isActive = (href: string) => {
        const url = typeof href === 'string' ? href : (href as { url: string }).url;
        return currentPath.startsWith(url);
    };

    return (
        <div className="flex h-full flex-col md:flex-row overflow-hidden">
            {/* Mobile Nav - horizontal scrollable */}
            <div className="md:hidden border-b bg-sidebar shrink-0">
                <div className="p-3 pb-0">
                    <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
                </div>
                <nav className="flex overflow-x-auto px-3 pb-2 pt-2 gap-1">
                    {sidebarNavItems.map((item) => {
                        const href = typeof item.href === 'string' ? item.href : item.href.url;
                        const active = isActive(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                prefetch
                                className={cn(
                                    'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors shrink-0',
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

            {/* Desktop Sidebar - Fixed, never scrolls */}
            <aside className="hidden md:flex w-56 shrink-0 border-r border-border/50 bg-sidebar flex-col h-full overflow-hidden">
                <div className="p-4">
                    <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('nav.sidebar_description')}</p>
                </div>
                <nav className="flex-1 space-y-1 px-3 pb-4">
                    {sidebarNavItems.map((item) => {
                        const href = typeof item.href === 'string' ? item.href : item.href.url;
                        const active = isActive(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                prefetch
                                className={cn(
                                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
            </aside>

            {/* Content Area - Only this scrolls */}
            <div className="flex-1 min-h-0 overflow-auto bg-background">
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
