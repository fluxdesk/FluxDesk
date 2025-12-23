import { usePage, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
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
import { type SharedData } from '@/types';

const DISMISS_KEY = 'fluxdesk_update_dismissed';

export function UpdateAvailableModal() {
    const { appVersion } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!appVersion?.is_outdated || !appVersion?.latest) {
            return;
        }

        // Check if this version was already dismissed
        const dismissedVersion = localStorage.getItem(DISMISS_KEY);
        if (dismissedVersion === appVersion.latest) {
            return;
        }

        // Show the modal
        setOpen(true);
    }, [appVersion]);

    const handleDismiss = () => {
        if (appVersion?.latest) {
            localStorage.setItem(DISMISS_KEY, appVersion.latest);
        }
        setOpen(false);
    };

    const handleViewRelease = () => {
        if (appVersion?.release_url) {
            window.open(appVersion.release_url, '_blank');
        }
    };

    if (!appVersion?.is_outdated) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                            <div className="font-mono font-medium">v{appVersion.current}</div>
                        </div>
                        <div className="text-muted-foreground">→</div>
                        <div className="text-center">
                            <div className="text-muted-foreground">Nieuwste versie</div>
                            <div className="font-mono font-medium text-primary">v{appVersion.latest}</div>
                        </div>
                    </div>

                    {appVersion.release_name && (
                        <div className="text-center text-sm text-muted-foreground">
                            {appVersion.release_name}
                        </div>
                    )}

                    {appVersion.published_at && (
                        <div className="text-center text-xs text-muted-foreground">
                            Uitgebracht op {new Date(appVersion.published_at).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    <Button asChild className="w-full">
                        <Link href="/upgrade/run" onClick={() => setOpen(false)}>
                            <Rocket className="mr-2 h-4 w-4" />
                            Nu upgraden
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={handleViewRelease} className="w-full">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Release notes bekijken
                    </Button>
                    <Button variant="ghost" onClick={handleDismiss} className="w-full">
                        Herinner me later
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
