import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthCardLayout from '@/layouts/auth/auth-card-layout';
import { Head, Link } from '@inertiajs/react';
import { Building2, CheckCircle2, LogIn, Mail } from 'lucide-react';

interface Invitation {
    token: string;
    email: string;
    role: 'admin' | 'agent';
    expires_at: string;
    organization: {
        name: string;
    };
    inviter: {
        name: string;
    };
}

interface Props {
    invitation: Invitation;
}

export default function LoginRequired({ invitation }: Props) {
    const roleLabel = invitation.role === 'admin' ? 'Beheerder' : 'Medewerker';

    return (
        <AuthCardLayout
            title="Inloggen vereist"
            description="Log in met je bestaande account om de uitnodiging te accepteren"
        >
            <Head title="Inloggen vereist" />

            <Card className="border-0 shadow-none p-0">
                <CardHeader className="px-0 pt-0">
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="size-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{invitation.organization.name}</CardTitle>
                            <CardDescription>
                                Uitgenodigd door {invitation.inviter.name}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <Mail className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">E-mail:</span>
                            <span className="font-medium">{invitation.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <CheckCircle2 className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Rol:</span>
                            <span className="font-medium">{roleLabel}</span>
                        </div>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            Er bestaat al een account met dit e-mailadres. Log in om de uitnodiging te accepteren.
                        </p>
                    </div>

                    <Button asChild className="w-full">
                        <Link href={`/login?intended=${encodeURIComponent(`/invitations/${invitation.token}`)}`}>
                            <LogIn className="mr-2 size-4" />
                            Inloggen
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </AuthCardLayout>
    );
}
