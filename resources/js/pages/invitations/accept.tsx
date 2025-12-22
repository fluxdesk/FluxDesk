import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import AuthCardLayout from '@/layouts/auth/auth-card-layout';
import { accept } from '@/routes/invitations';
import { Head, useForm } from '@inertiajs/react';
import { Building2, CheckCircle2, User } from 'lucide-react';

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

export default function AcceptInvitation({ invitation }: Props) {
    const { post, processing } = useForm({});

    function handleAccept(e: React.FormEvent) {
        e.preventDefault();
        post(accept(invitation.token).url);
    }

    const roleLabel = invitation.role === 'admin' ? 'Beheerder' : 'Medewerker';

    return (
        <AuthCardLayout
            title="Uitnodiging accepteren"
            description="Je bent uitgenodigd om lid te worden van een team"
        >
            <Head title="Uitnodiging accepteren" />

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
                            <User className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">E-mail:</span>
                            <span className="font-medium">{invitation.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <CheckCircle2 className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Rol:</span>
                            <span className="font-medium">{roleLabel}</span>
                        </div>
                    </div>

                    <form onSubmit={handleAccept}>
                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing && <Spinner />}
                            Uitnodiging accepteren
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </AuthCardLayout>
    );
}
