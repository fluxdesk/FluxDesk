import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { send } from '@/routes/verification';
import { type SharedData } from '@/types';
import { Form, Head, Link, usePage, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { LanguageSelect } from '@/components/common/language-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { t, i18n } = useTranslation('settings');
    const { auth, locale, availableLocales } = usePage<SharedData>().props;

    return (
        <AppLayout>
            <Head title={t('profile.page_title')} />

            <SettingsLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('profile.title')}</CardTitle>
                            <CardDescription>
                                {t('profile.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form
                                {...ProfileController.update.form()}
                                options={{
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        toast.success(t('profile.saved'));
                                    },
                                    onError: () => {
                                        toast.error(t('profile.error'));
                                    },
                                }}
                                className="space-y-4"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">{t('profile.name')}</Label>
                                            <Input
                                                id="name"
                                                defaultValue={auth.user.name}
                                                name="name"
                                                required
                                                autoComplete="name"
                                                placeholder={t('profile.name_placeholder')}
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="email">{t('profile.email')}</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                defaultValue={auth.user.email}
                                                name="email"
                                                required
                                                autoComplete="username"
                                                placeholder={t('profile.email_placeholder')}
                                            />
                                            <InputError message={errors.email} />
                                        </div>

                                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                                            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                                {t('profile.email_not_verified')}{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="font-medium underline underline-offset-4"
                                                >
                                                    {t('profile.resend_verification')}
                                                </Link>
                                                {status === 'verification-link-sent' && (
                                                    <p className="mt-2 font-medium text-green-600 dark:text-green-400">
                                                        {t('profile.verification_sent')}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="pt-2">
                                            <Button disabled={processing}>
                                                {t('profile.save')}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('profile.language.title')}</CardTitle>
                            <CardDescription>
                                {t('profile.language.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="locale">{t('profile.language.label')}</Label>
                                    <LanguageSelect
                                        value={locale}
                                        availableLocales={availableLocales}
                                        onValueChange={(newLocale) => {
                                            router.patch(
                                                ProfileController.updateLocale(),
                                                { locale: newLocale },
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: () => {
                                                        i18n.changeLanguage(newLocale);
                                                        toast.success(t('common:messages.saved'));
                                                    },
                                                }
                                            );
                                        }}
                                        className="w-[180px]"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-destructive/50">
                        <CardHeader>
                            <CardTitle className="text-lg text-destructive">{t('profile.danger_zone.title')}</CardTitle>
                            <CardDescription>
                                {t('profile.danger_zone.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DeleteUser />
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
