import { Head } from '@inertiajs/react';
import { Clock, Mail } from 'lucide-react';

export default function LinkExpired() {
    return (
        <>
            <Head title="Link verlopen" />

            <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
                <div className="w-full max-w-md text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                    </div>

                    <h1 className="mb-2 text-2xl font-semibold">Link verlopen</h1>

                    <p className="mb-6 text-muted-foreground">
                        Deze link is niet meer geldig. Links verlopen na 30 dagen voor uw veiligheid.
                    </p>

                    <div className="rounded-lg border bg-background p-4">
                        <div className="flex items-start gap-3 text-left">
                            <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Nieuw bericht nodig?</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Reageer op een van onze e-mails of neem contact met ons op voor een nieuwe link.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
