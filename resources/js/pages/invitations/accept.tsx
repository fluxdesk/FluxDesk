import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import AuthCardLayout from '@/layouts/auth/auth-card-layout';
import { accept } from '@/routes/invitations';
import { Head, useForm } from '@inertiajs/react';
import { Building2, CheckCircle2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation('common');
    const { post, processing } = useForm({});

    function handleAccept(e: React.FormEvent) {
        e.preventDefault();
        post(accept(invitation.token).url);
    }

    const roleLabel = invitation.role === 'admin' ? t('invitation.role_admin') : t('invitation.role_agent');

    return (
        <AuthCardLayout
            title={t('invitation.accept_title')}
            description={t('invitation.accept_description')}
        >
            <Head title={t('invitation.accept_title')} />

            <Card className="border-0 shadow-none p-0">
                <CardHeader className="px-0 pt-0">
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="size-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{invitation.organization.name}</CardTitle>
                            <CardDescription>
                                {t('invitation.invited_by', { name: invitation.inviter.name })}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <User className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('invitation.email_label')}</span>
                            <span className="font-medium">{invitation.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <CheckCircle2 className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('invitation.role_label')}</span>
                            <span className="font-medium">{roleLabel}</span>
                        </div>
                    </div>

                    <form onSubmit={handleAccept}>
                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing && <Spinner />}
                            {t('invitation.accept_title')}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </AuthCardLayout>
    );
}
