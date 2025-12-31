import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthCardLayout from '@/layouts/auth/auth-card-layout';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Building2, LogOut } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

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
    currentUserEmail: string;
}

export default function WrongAccount({ invitation, currentUserEmail }: Props) {
    const { t } = useTranslation('common');

    return (
        <AuthCardLayout
            title={t('invitation.wrong_account.title')}
            description={t('invitation.wrong_account.description')}
        >
            <Head title={t('invitation.wrong_account.title')} />

            <Card className="border-0 shadow-none p-0">
                <CardHeader className="px-0 pt-0">
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="size-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{invitation.organization.name}</CardTitle>
                            <CardDescription>
                                {t('invitation.wrong_account.invited_by', { name: invitation.inviter.name })}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                        <div className="flex gap-3">
                            <AlertTriangle className="size-5 text-red-600 dark:text-red-400 shrink-0" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                    {t('invitation.wrong_account.wrong_account_title')}
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    <Trans
                                        i18nKey="invitation.wrong_account.wrong_account_message"
                                        ns="common"
                                        values={{ invitedEmail: invitation.email, currentEmail: currentUserEmail }}
                                        components={{ strong: <strong /> }}
                                    />
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            {t('invitation.wrong_account.logout_instruction')}
                        </p>

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.post('/logout')}
                        >
                            <LogOut className="mr-2 size-4" />
                            {t('invitation.wrong_account.logout_button')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </AuthCardLayout>
    );
}
