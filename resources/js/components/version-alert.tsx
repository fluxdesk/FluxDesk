import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link } from '@inertiajs/react';
import { ArrowUpCircle, X } from 'lucide-react';
import { useState } from 'react';

interface VersionAlertProps {
    currentVersion: string;
    latestVersion: string | null;
    isOutdated: boolean;
}

export function VersionAlert({ latestVersion, isOutdated }: VersionAlertProps) {
    const [isDismissed, setIsDismissed] = useState(() => {
        // Check sessionStorage for dismissed state
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('version-alert-dismissed') === latestVersion;
        }
        return false;
    });

    if (!isOutdated || isDismissed || !latestVersion) {
        return null;
    }

    const handleDismiss = () => {
        setIsDismissed(true);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('version-alert-dismissed', latestVersion);
        }
    };

    return (
        <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-1.5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <ArrowUpCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm">
                Update beschikbaar: <span className="font-mono font-medium">v{latestVersion}</span>
            </span>
            <Link href="/upgrade">
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs hover:bg-amber-200 dark:hover:bg-amber-800">
                    Bekijken
                </Button>
            </Link>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleDismiss}
                        className="ml-1 rounded p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800"
                    >
                        <X className="h-3.5 w-3.5" />
                        <span className="sr-only">Verbergen</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent>Verbergen tot volgende sessie</TooltipContent>
            </Tooltip>
        </div>
    );
}

/**
 * Compact version badge for tight spaces.
 * Shows just an icon with tooltip when update is available.
 */
export function VersionBadge({ currentVersion, latestVersion, isOutdated }: VersionAlertProps) {
    if (!isOutdated || !latestVersion) {
        return null;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href="/upgrade"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                    <ArrowUpCircle className="h-5 w-5" />
                    <span className="sr-only">Update beschikbaar</span>
                </Link>
            </TooltipTrigger>
            <TooltipContent>
                <p>Update beschikbaar: v{latestVersion}</p>
                <p className="text-xs text-muted-foreground">Huidige versie: v{currentVersion}</p>
            </TooltipContent>
        </Tooltip>
    );
}
