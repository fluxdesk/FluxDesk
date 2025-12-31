import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthCardLayout from '@/layouts/auth/auth-card-layout';
import { Head, Link } from '@inertiajs/react';
import { Building2, CheckCircle2, LogIn, Mail } from 'lucide-react';
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

export default function LoginRequired({ invitation }: Props) {
    const { t } = useTranslation('common');
    const roleLabel = invitation.role === 'admin' ? t('invitation.login_required.role_admin') : t('invitation.login_required.role_agent');

    return (
        <AuthCardLayout
            title={t('invitation.login_required.title')}
            description={t('invitation.login_required.description')}
        >
            <Head title={t('invitation.login_required.title')} />

            <Card className="border-0 shadow-none p-0">
                <CardHeader className="px-0 pt-0">
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="size-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{invitation.organization.name}</CardTitle>
                            <CardDescription>
                                {t('invitation.login_required.invited_by', { name: invitation.inviter.name })}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <Mail className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('invitation.login_required.email_label')}</span>
                            <span className="font-medium">{invitation.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <CheckCircle2 className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('invitation.login_required.role_label')}</span>
                            <span className="font-medium">{roleLabel}</span>
                        </div>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            {t('invitation.login_required.account_exists')}
                        </p>
                    </div>

                    <Button asChild className="w-full">
                        <Link href={`/login?intended=${encodeURIComponent(`/invitations/${invitation.token}`)}`}>
                            <LogIn className="mr-2 size-4" />
                            {t('invitation.login_required.login_button')}
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </AuthCardLayout>
    );
}
