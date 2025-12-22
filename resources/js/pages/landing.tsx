import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Head, Link } from '@inertiajs/react';
import { Headset, Users } from 'lucide-react';

interface Organization {
    id: string;
    name: string;
    slug: string;
    settings: {
        logo_path: string | null;
        primary_color: string | null;
        accent_color: string | null;
    } | null;
}

interface Props {
    organization: Organization;
}

export default function Landing({ organization }: Props) {
    const primaryColor = organization.settings?.primary_color ?? '#18181b';
    const accentColor = organization.settings?.accent_color ?? '#3b82f6';

    const brandStyles = {
        '--portal-primary': primaryColor,
        '--portal-accent': accentColor,
    } as React.CSSProperties;

    return (
        <>
            <Head title={`${organization.name} - Support Portal`} />

            <div
                className="min-h-svh flex flex-col bg-gradient-to-b from-muted/30 to-muted/60 dark:from-background dark:to-muted/20"
                style={brandStyles}
            >
                {/* Main content - centered */}
                <main className="flex-1 flex items-center justify-center px-4 py-12">
                    <div className="w-full max-w-md space-y-8">
                        {/* Logo & Organization name */}
                        <div className="flex flex-col items-center text-center space-y-4">
                            {organization.settings?.logo_path ? (
                                <img
                                    src={`/storage/${organization.settings.logo_path}`}
                                    alt={organization.name}
                                    className="h-16 w-auto"
                                />
                            ) : (
                                <div
                                    className="flex size-20 items-center justify-center rounded-2xl text-white text-3xl font-bold shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {organization.name.charAt(0)}
                                </div>
                            )}

                            <div className="space-y-2">
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                                    {organization.name}
                                </h1>
                                <p className="text-muted-foreground">
                                    Welkom bij ons support portaal
                                </p>
                            </div>
                        </div>

                        {/* Login options card */}
                        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-6 space-y-4">
                                <p className="text-center text-sm text-muted-foreground pb-2">
                                    Kies hoe je wilt inloggen
                                </p>

                                {/* Customer login - Primary CTA */}
                                <Link
                                    href={`/${organization.slug}/portal/login`}
                                    className="block"
                                >
                                    <Button
                                        className="w-full h-12 text-base font-medium text-white shadow-md hover:shadow-lg transition-all duration-200"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <Headset className="size-5 mr-2.5" />
                                        Inloggen als klant
                                    </Button>
                                </Link>

                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">of</span>
                                    </div>
                                </div>

                                {/* Staff login - Secondary CTA */}
                                <Link href="/login" className="block">
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 text-base font-medium border-2 hover:bg-muted/50 transition-all duration-200"
                                    >
                                        <Users className="size-5 mr-2.5" />
                                        Inloggen als medewerker
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Help text */}
                        <p className="text-center text-sm text-muted-foreground">
                            Heb je nog geen account?{' '}
                            <Link
                                href={`/${organization.slug}/portal/login`}
                                className="font-medium underline-offset-4 hover:underline"
                                style={{ color: primaryColor }}
                            >
                                Vraag toegang aan
                            </Link>
                        </p>
                    </div>
                </main>

                {/* Footer */}
                <footer className="py-6 text-center">
                    <p className="text-xs text-muted-foreground/60">
                        Powered by{' '}
                        <span className="font-medium text-muted-foreground">FluxDesk</span>
                    </p>
                </footer>
            </div>
        </>
    );
}
