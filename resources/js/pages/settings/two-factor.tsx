import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { disable, enable } from '@/routes/two-factor';
import { Form, Head } from '@inertiajs/react';
import { ShieldBan, ShieldCheck, Shield } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface TwoFactorProps {
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
}

export default function TwoFactor({
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: TwoFactorProps) {
    const { t } = useTranslation('settings');
    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

    return (
        <AppLayout>
            <Head title={t('two_factor.page_title')} />
            <SettingsLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`rounded-lg p-2 ${twoFactorEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                                        <Shield className={`h-5 w-5 ${twoFactorEnabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{t('two_factor.title')}</CardTitle>
                                        <CardDescription>
                                            {t('two_factor.description')}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant={twoFactorEnabled ? 'default' : 'destructive'}>
                                    {twoFactorEnabled ? t('two_factor.status_enabled') : t('two_factor.status_disabled')}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {twoFactorEnabled ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        {t('two_factor.enabled_description')}
                                    </p>

                                    <TwoFactorRecoveryCodes
                                        recoveryCodesList={recoveryCodesList}
                                        fetchRecoveryCodes={fetchRecoveryCodes}
                                        errors={errors}
                                    />

                                    <Form
                                        {...disable.form()}
                                        options={{
                                            onSuccess: () => {
                                                toast.success(t('two_factor.disabled_success'));
                                            },
                                            onError: () => {
                                                toast.error(t('two_factor.disable_error'));
                                            },
                                        }}
                                    >
                                        {({ processing }) => (
                                            <Button
                                                variant="destructive"
                                                type="submit"
                                                disabled={processing}
                                            >
                                                <ShieldBan className="mr-2 h-4 w-4" />
                                                {t('two_factor.disable')}
                                            </Button>
                                        )}
                                    </Form>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        {t('two_factor.disabled_description')}
                                    </p>

                                    <div>
                                        {hasSetupData ? (
                                            <Button onClick={() => setShowSetupModal(true)}>
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                                {t('two_factor.continue_setup')}
                                            </Button>
                                        ) : (
                                            <Form
                                                {...enable.form()}
                                                onSuccess={() => setShowSetupModal(true)}
                                            >
                                                {({ processing }) => (
                                                    <Button type="submit" disabled={processing}>
                                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                                        {t('two_factor.enable')}
                                                    </Button>
                                                )}
                                            </Form>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <TwoFactorSetupModal
                        isOpen={showSetupModal}
                        onClose={() => setShowSetupModal(false)}
                        requiresConfirmation={requiresConfirmation}
                        twoFactorEnabled={twoFactorEnabled}
                        qrCodeSvg={qrCodeSvg}
                        manualSetupKey={manualSetupKey}
                        clearSetupData={clearSetupData}
                        fetchSetupData={fetchSetupData}
                        errors={errors}
                    />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
