import { Head } from '@inertiajs/react';
import { XCircle } from 'lucide-react';

interface Organization {
    id: string;
    name: string;
    slug: string;
}

interface Props {
    organization: Organization;
}

export default function Disabled({ organization }: Props) {
    return (
        <>
            <Head title={`${organization.name} - Portaal niet beschikbaar`} />

            <div className="min-h-svh flex flex-col items-center justify-center bg-gradient-to-b from-muted/30 to-muted/60 dark:from-background dark:to-muted/20 px-4">
                <div className="w-full max-w-md text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                            <XCircle className="size-8 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            Portaal niet beschikbaar
                        </h1>
                        <p className="text-muted-foreground">
                            Het klantenportaal van {organization.name} is momenteel niet beschikbaar.
                        </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Neem contact op met de organisatie voor meer informatie.
                    </p>
                </div>

                <footer className="absolute bottom-6 text-center">
                    <p className="text-xs text-muted-foreground/60">
                        Powered by{' '}
                        <span className="font-medium text-muted-foreground">FluxDesk</span>
                    </p>
                </footer>
            </div>
        </>
    );
}
