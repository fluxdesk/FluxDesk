import { InboxSidebar } from '@/components/inbox/inbox-sidebar';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface MainLayoutProps {
    children: ReactNode;
    className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-sidebar">
            {/* Icon Sidebar */}
            <aside className="flex h-full w-16 shrink-0 flex-col border-r border-sidebar-border">
                <InboxSidebar />
            </aside>

            {/* Main Content - Inset Card Style */}
            <main className="flex flex-1 flex-col overflow-hidden p-2 pl-0">
                <div className={cn(
                    'flex flex-1 flex-col overflow-auto rounded-lg border bg-background shadow-sm',
                    className
                )}>
                    {children}
                </div>
            </main>
        </div>
    );
}
