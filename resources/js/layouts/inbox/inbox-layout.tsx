import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface InboxLayoutProps {
    sidebar: ReactNode;
    list: ReactNode;
    detail?: ReactNode;
    className?: string;
}

export function InboxLayout({ sidebar, list, detail, className }: InboxLayoutProps) {
    return (
        <div className={cn('flex h-screen w-full overflow-hidden bg-sidebar', className)}>
            {/* Icon Sidebar */}
            <aside className="flex h-full w-16 shrink-0 flex-col border-r border-sidebar-border">
                {sidebar}
            </aside>

            {/* Main Content Area - Inset Card Style */}
            <div className="flex flex-1 overflow-hidden p-2 pl-0">
                <div className="flex flex-1 overflow-hidden rounded-lg border bg-background shadow-sm">
                    {/* Ticket List Panel - fixed width */}
                    <div className="flex h-full w-80 shrink-0 flex-col border-r">
                        {list}
                    </div>

                    {/* Ticket Detail Panel - flexible width */}
                    <main className="flex h-full flex-1 flex-col overflow-hidden">
                        {detail || <EmptyDetail />}
                    </main>
                </div>
            </div>
        </div>
    );
}

function EmptyDetail() {
    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-2xl bg-muted/50 p-6">
                <svg
                    className="h-12 w-12 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z"
                    />
                </svg>
            </div>
            <h3 className="mb-1 text-lg font-medium text-foreground/80">Geen ticket geselecteerd</h3>
            <p className="max-w-[200px] text-sm text-muted-foreground">
                Selecteer een ticket uit de lijst om details te bekijken
            </p>
        </div>
    );
}
