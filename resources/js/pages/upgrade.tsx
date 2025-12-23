import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Github,
    RefreshCw,
    Terminal,
} from 'lucide-react';
import { useState } from 'react';

interface VersionStatus {
    current: string;
    latest: string | null;
    is_outdated: boolean;
    release_url: string | null;
    release_notes: string | null;
    release_name: string | null;
    published_at: string | null;
}

interface Props {
    versionStatus: VersionStatus;
    githubRepo: string;
}

export default function Upgrade({ versionStatus, githubRepo }: Props) {
    const [isChecking, setIsChecking] = useState(false);
    const [status] = useState(versionStatus);

    const handleCheckForUpdates = () => {
        setIsChecking(true);
        router.post(
            '/upgrade/check',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    // The page props will be updated automatically
                    setIsChecking(false);
                },
                onError: () => {
                    setIsChecking(false);
                },
            }
        );
    };

    return (
        <AppLayout>
            <Head title="Systeem Updates" />

            <div className="mx-auto max-w-4xl px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold">Systeem Updates</h1>
                    <p className="mt-1 text-muted-foreground">
                        Beheer en update FluxDesk naar de nieuwste versie
                    </p>
                </div>

                {/* Version Cards */}
                <div className="grid gap-6 md:grid-cols-2 mb-8">
                    {/* Current Version */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Huidige versie</CardDescription>
                            <CardTitle className="text-3xl font-mono">
                                v{status.current}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                {status.is_outdated ? (
                                    <>
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        <span className="text-sm text-amber-600 dark:text-amber-400">
                                            Update beschikbaar
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span className="text-sm text-green-600 dark:text-green-400">
                                            Je hebt de nieuwste versie
                                        </span>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Latest Version */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Laatste versie</CardDescription>
                            <CardTitle className="text-3xl font-mono">
                                {status.latest ? `v${status.latest}` : 'Onbekend'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {status.published_at && (
                                <p className="text-sm text-muted-foreground">
                                    Uitgebracht{' '}
                                    {formatDistanceToNow(new Date(status.published_at), {
                                        addSuffix: true,
                                        locale: nl,
                                    })}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Update Alert */}
                {status.is_outdated && status.latest && (
                    <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">
                                        Update beschikbaar: v{status.latest}
                                    </CardTitle>
                                    <CardDescription>
                                        {status.release_name || `Versie ${status.latest}`}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {status.release_notes && (
                                <div className="rounded-md bg-background p-4">
                                    <h4 className="mb-2 text-sm font-medium">Release Notes</h4>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                                            {status.release_notes}
                                        </pre>
                                    </div>
                                </div>
                            )}
                            {status.release_url && (
                                <a
                                    href={status.release_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                    <Github className="h-4 w-4" />
                                    Bekijk release op GitHub
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Upgrade Instructions */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5" />
                            Upgrade Instructies
                        </CardTitle>
                        <CardDescription>
                            Volg deze stappen om FluxDesk te updaten naar de nieuwste versie
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <Step number={1} title="Maak een backup">
                                Maak een backup van je database en bestanden voordat je update.
                            </Step>
                            <Step number={2} title="Download de nieuwste versie">
                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                    git pull origin main
                                </code>
                                <span className="ml-2 text-muted-foreground">of download van GitHub</span>
                            </Step>
                            <Step number={3} title="Update dependencies">
                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                    composer install --no-dev
                                </code>
                            </Step>
                            <Step number={4} title="Update frontend">
                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                    npm install && npm run build
                                </code>
                            </Step>
                            <Step number={5} title="Voer de upgrade command uit">
                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                    php artisan fluxdesk:upgrade
                                </code>
                            </Step>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleCheckForUpdates} disabled={isChecking} variant="outline">
                        <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                        {isChecking ? 'Controleren...' : 'Controleer op updates'}
                    </Button>
                    <a
                        href={`https://github.com/${githubRepo}/releases`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button variant="outline">
                            <Github className="mr-2 h-4 w-4" />
                            Alle releases bekijken
                            <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                    </a>
                </div>
            </div>
        </AppLayout>
    );
}

function Step({
    number,
    title,
    children,
}: {
    number: number;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {number}
            </div>
            <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{children}</p>
            </div>
        </div>
    );
}
