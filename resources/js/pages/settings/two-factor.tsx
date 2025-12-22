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

interface TwoFactorProps {
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
}

export default function TwoFactor({
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: TwoFactorProps) {
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
            <Head title="Tweestapsverificatie" />
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
                                        <CardTitle className="text-lg">Tweestapsverificatie</CardTitle>
                                        <CardDescription>
                                            Voeg een extra beveiligingslaag toe aan je account
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant={twoFactorEnabled ? 'default' : 'destructive'}>
                                    {twoFactorEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {twoFactorEnabled ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Tweestapsverificatie is ingeschakeld. Bij het inloggen word je gevraagd om een veilige PIN,
                                        die je kunt ophalen uit je authenticator app.
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
                                                toast.success('Tweestapsverificatie uitgeschakeld');
                                            },
                                            onError: () => {
                                                toast.error('Tweestapsverificatie uitschakelen mislukt');
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
                                                2FA uitschakelen
                                            </Button>
                                        )}
                                    </Form>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Schakel tweestapsverificatie in voor een extra beveiligingslaag.
                                        Je hebt een TOTP-compatibele authenticator app nodig zoals Google Authenticator of Authy.
                                    </p>

                                    <div>
                                        {hasSetupData ? (
                                            <Button onClick={() => setShowSetupModal(true)}>
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                                Doorgaan met instellen
                                            </Button>
                                        ) : (
                                            <Form
                                                {...enable.form()}
                                                onSuccess={() => setShowSetupModal(true)}
                                            >
                                                {({ processing }) => (
                                                    <Button type="submit" disabled={processing}>
                                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                                        2FA inschakelen
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
