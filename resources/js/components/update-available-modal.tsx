import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowUpCircle, ExternalLink, Rocket } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useVersionCheck } from '@/hooks/use-version-check';
import { cn } from '@/lib/utils';

interface UpdateNotificationProps {
    isCollapsed?: boolean;
}

/**
 * Subtle notification button for the sidebar.
 * Shows "Nieuwe versie beschikbaar" when an update is available.
 * Opens a modal with details when clicked.
 */
export function UpdateNotification({ isCollapsed = false }: UpdateNotificationProps) {
    const { versionStatus } = useVersionCheck();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Don't render anything if no update available
    if (!versionStatus?.is_outdated || !versionStatus?.latest) {
        return null;
    }

    const handleViewRelease = () => {
        if (versionStatus?.release_url) {
            window.open(versionStatus.release_url, '_blank');
        }
    };

    return (
        <>
            {/* Subtle notification button */}
            <Button
                variant="ghost"
                size={isCollapsed ? 'icon' : 'default'}
                className={cn(
                    'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-950/50',
                    isCollapsed ? 'h-9 w-9' : 'w-full justify-start gap-2'
                )}
                onClick={() => setIsModalOpen(true)}
            >
                <ArrowUpCircle className="h-4 w-4" />
                {!isCollapsed && <span>Nieuwe versie beschikbaar</span>}
            </Button>

            {/* Modal with details */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <ArrowUpCircle className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-center">Update Beschikbaar</DialogTitle>
                        <DialogDescription className="text-center">
                            Er is een nieuwe versie van FluxDesk beschikbaar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-center gap-4 text-sm">
                            <div className="text-center">
                                <div className="text-muted-foreground">Huidige versie</div>
                                <div className="font-mono font-medium">v{versionStatus.current}</div>
                            </div>
                            <div className="text-muted-foreground">→</div>
                            <div className="text-center">
                                <div className="text-muted-foreground">Nieuwste versie</div>
                                <div className="font-mono font-medium text-primary">v{versionStatus.latest}</div>
                            </div>
                        </div>

                        {versionStatus.release_name && (
                            <div className="text-center text-sm text-muted-foreground">
                                {versionStatus.release_name}
                            </div>
                        )}

                        {versionStatus.published_at && (
                            <div className="text-center text-xs text-muted-foreground">
                                Uitgebracht op {new Date(versionStatus.published_at).toLocaleDateString('nl-NL', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                        <Button asChild className="w-full">
                            <Link href="/upgrade/run" onClick={() => setIsModalOpen(false)}>
                                <Rocket className="mr-2 h-4 w-4" />
                                Nu upgraden
                            </Link>
                        </Button>
                        <Button variant="outline" onClick={handleViewRelease} className="w-full">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Release notes bekijken
                        </Button>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full">
                            Later
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
