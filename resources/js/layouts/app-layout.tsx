import { AppShell } from '@/layouts/app-shell';
import { type ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: unknown;
}

export default function AppLayout({ children }: AppLayoutProps) {
    return <AppShell>{children}</AppShell>;
}
