import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Password() {
    const { t } = useTranslation('settings');
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <AppLayout>
            <Head title={t('password.page_title')} />

            <SettingsLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('password.title')}</CardTitle>
                            <CardDescription>
                                {t('password.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form
                                {...PasswordController.update.form()}
                                options={{
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        toast.success(t('password.saved'));
                                    },
                                    onError: () => {
                                        toast.error(t('password.error'));
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
                                            <Label htmlFor="current_password">{t('password.current')}</Label>
                                            <Input
                                                id="current_password"
                                                ref={currentPasswordInput}
                                                name="current_password"
                                                type="password"
                                                autoComplete="current-password"
                                                placeholder={t('password.current_placeholder')}
                                            />
                                            <InputError message={errors.current_password} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="password">{t('password.new')}</Label>
                                            <Input
                                                id="password"
                                                ref={passwordInput}
                                                name="password"
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder={t('password.new_placeholder')}
                                            />
                                            <InputError message={errors.password} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="password_confirmation">{t('password.confirm')}</Label>
                                            <Input
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder={t('password.confirm_placeholder')}
                                            />
                                            <InputError message={errors.password_confirmation} />
                                        </div>

                                        <div className="pt-2">
                                            <Button disabled={processing}>
                                                {t('password.submit')}
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
