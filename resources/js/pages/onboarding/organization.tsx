import { LanguageSelect } from '@/components/common/language-select';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SUPPORTED_LOCALES } from '@/i18n/config';
import { Head, useForm } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function OnboardingOrganization() {
    const { t } = useTranslation('common');

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        locale: 'en',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/onboarding/organization');
    }

    return (
        <>
            <Head title={t('onboarding.create_organization')} />

            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo/Icon */}
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                            <Building2 className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t('onboarding.title')}
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            {t('onboarding.subtitle')}
                        </p>
                    </div>

                    {/* Form */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('onboarding.organization_name')}</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder={t('onboarding.organization_placeholder')}
                                    autoFocus
                                    required
                                />
                                <InputError message={errors.name} />
                                <p className="text-xs text-muted-foreground">
                                    {t('onboarding.organization_hint')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="locale">{t('onboarding.email_locale')}</Label>
                                <LanguageSelect
                                    name="locale"
                                    value={data.locale}
                                    availableLocales={[...SUPPORTED_LOCALES]}
                                    onValueChange={(value) => setData('locale', value)}
                                />
                                <InputError message={errors.locale} />
                                <p className="text-xs text-muted-foreground">
                                    {t('onboarding.email_locale_hint')}
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={processing || !data.name.trim()}
                            >
                                {processing ? t('onboarding.creating') : t('onboarding.create_organization')}
                            </Button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-muted-foreground">
                        {t('onboarding.invite_later')}
                    </p>
                </div>
            </div>
        </>
    );
}
