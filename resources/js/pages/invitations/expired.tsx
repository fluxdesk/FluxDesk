import { Button } from '@/components/ui/button';
import AuthCardLayout from '@/layouts/auth/auth-card-layout';
import { Head, Link } from '@inertiajs/react';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function ExpiredInvitation() {
    return (
        <AuthCardLayout
            title="Uitnodiging verlopen"
            description="Deze uitnodiging is niet meer geldig"
        >
            <Head title="Uitnodiging verlopen" />

            <div className="space-y-6">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                    <div className="flex gap-3">
                        <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                Uitnodiging ongeldig
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                Deze uitnodiging is verlopen of bestaat niet. Neem contact op met de beheerder om een nieuwe uitnodiging te ontvangen.
                            </p>
                        </div>
                    </div>
                </div>

                <Button asChild variant="outline" className="w-full">
                    <Link href="/login">
                        <ArrowLeft className="mr-2 size-4" />
                        Terug naar inloggen
                    </Link>
                </Button>
            </div>
        </AuthCardLayout>
    );
}
