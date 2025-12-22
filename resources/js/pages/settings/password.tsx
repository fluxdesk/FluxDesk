import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <AppLayout>
            <Head title="Wachtwoordinstellingen" />

            <SettingsLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Wachtwoord wijzigen</CardTitle>
                            <CardDescription>
                                Gebruik een lang, willekeurig wachtwoord voor extra veiligheid
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form
                                {...PasswordController.update.form()}
                                options={{
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        toast.success('Wachtwoord bijgewerkt');
                                    },
                                    onError: () => {
                                        toast.error('Wachtwoord bijwerken mislukt');
                                    },
                                }}
                                resetOnError={['password', 'password_confirmation', 'current_password']}
                                resetOnSuccess
                                onError={(errors) => {
                                    if (errors.password) {
                                        passwordInput.current?.focus();
                                    }
                                    if (errors.current_password) {
                                        currentPasswordInput.current?.focus();
                                    }
                                }}
                                className="space-y-4"
                            >
                                {({ errors, processing }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="current_password">Huidig wachtwoord</Label>
                                            <Input
                                                id="current_password"
                                                ref={currentPasswordInput}
                                                name="current_password"
                                                type="password"
                                                autoComplete="current-password"
                                                placeholder="Voer huidig wachtwoord in"
                                            />
                                            <InputError message={errors.current_password} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="password">Nieuw wachtwoord</Label>
                                            <Input
                                                id="password"
                                                ref={passwordInput}
                                                name="password"
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder="Voer nieuw wachtwoord in"
                                            />
                                            <InputError message={errors.password} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="password_confirmation">Bevestig wachtwoord</Label>
                                            <Input
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder="Bevestig nieuw wachtwoord"
                                            />
                                            <InputError message={errors.password_confirmation} />
                                        </div>

                                        <div className="pt-2">
                                            <Button disabled={processing}>
                                                Wachtwoord wijzigen
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
