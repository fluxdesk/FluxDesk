'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppNav } from '@/components/inbox/app-nav';
import { UpdateAvailableModal } from '@/components/update-available-modal';

interface AppShellProps {
    children: React.ReactNode;
    defaultLayout?: number[];
    defaultCollapsed?: boolean;
    navCollapsedSize?: number;
    resizable?: boolean;
}

export function AppShell({
    children,
    defaultLayout = [12, 88],
    defaultCollapsed = false,
    navCollapsedSize = 4,
    resizable = false,
}: AppShellProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    // Non-resizable layout (for settings, contacts, etc.)
    if (!resizable) {
        return (
            <TooltipProvider delayDuration={0}>
                <UpdateAvailableModal />
                {/* Mobile Layout - Collapsed icon sidebar */}
                <div className="flex h-screen overflow-hidden md:hidden">
                    <div className="w-[50px] shrink-0 bg-muted/40 border-r overflow-hidden">
                        <AppNav isCollapsed={true} />
                    </div>
                    <div className="flex-1 overflow-auto">
                        {children}
                    </div>
                </div>

                {/* Desktop Layout - Full sidebar */}
                <div className="hidden md:flex h-screen overflow-hidden">
                    <div className="w-[200px] shrink-0 bg-muted/40 border-r overflow-hidden">
                        <AppNav isCollapsed={false} />
                    </div>
                    <div className="flex-1 overflow-auto">
                        {children}
                    </div>
                </div>
            </TooltipProvider>
        );
    }

    // Resizable layout (for inbox)
    return (
        <TooltipProvider delayDuration={0}>
            <UpdateAvailableModal />
            <div className="flex h-screen overflow-hidden">
                {/* Navigation Sidebar - Fixed, never scrolls */}
                <ResizablePanelGroup
                    direction="horizontal"
                    onLayout={(sizes: number[]) => {
                        document.cookie = `fluxdesk:layout=${JSON.stringify(sizes)}`;
                    }}
                    className="h-full"
                >
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
                            'bg-muted/40 !overflow-hidden',
                            isCollapsed && 'min-w-[50px] transition-all duration-300 ease-in-out',
                        )}
                    >
                        <AppNav isCollapsed={isCollapsed} />
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Main Content - Scrollable */}
                    <ResizablePanel defaultSize={defaultLayout[1]} minSize={50} className="!overflow-hidden">
                        <div className="h-full overflow-auto">
                            {children}
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </TooltipProvider>
    );
}
