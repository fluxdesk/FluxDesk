import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PortalAuthLayout from '@/layouts/portal/portal-auth-layout';
import { type PortalSharedData } from '@/types/portal';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    status?: string;
}

export default function PortalLogin({ status }: Props) {
    const { t } = useTranslation('portal');
    const { organization } = usePage<PortalSharedData>().props;
    const orgSlug = organization?.slug ?? '';

    const form = useForm({
        email: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/${orgSlug}/portal/login`);
    };

    const primaryColor = organization?.settings?.primary_color ?? '#18181b';

    // Success state - magic link sent
    if (status === 'magic-link-sent') {
        return (
            <PortalAuthLayout>
                <Head title={t('login.check_email_title')} />

                <div className="flex flex-col items-center gap-4 py-4">
                    <div
                        className="flex size-16 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${primaryColor}15` }}
                    >
                        <CheckCircle2
                            className="size-8"
                            style={{ color: primaryColor }}
                        />
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-lg font-semibold">{t('login.check_email_title')}</h2>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            {t('login.check_email_description')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm">
                        <Mail className="size-4 text-muted-foreground" />
                        <span>{t('login.link_valid_duration')}</span>
                    </div>

                    <Button
                        variant="ghost"
                        className="mt-2"
                        onClick={() => window.location.reload()}
                    >
                        {t('login.try_again')}
                    </Button>
                </div>
            </PortalAuthLayout>
        );
    }

    return (
        <PortalAuthLayout
            title={t('login.title')}
            description={t('login.description')}
        >
            <Head title={t('login.title')} />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="space-y-2">
                    <Label htmlFor="email">{t('login.email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder={t('login.email_placeholder')}
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                        disabled={form.processing}
                        autoFocus
                        required
                    />
                    {form.errors.email && (
                        <p className="text-sm text-destructive">{form.errors.email}</p>
                    )}
                </div>

                <Button
                    type="submit"
                    className="w-full text-white"
                    style={{ backgroundColor: primaryColor }}
                    disabled={form.processing}
                >
                    {form.processing ? (
                        <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            {t('login.submitting')}
                        </>
                    ) : (
                        <>
                            <Mail className="size-4 mr-2" />
                            {t('login.submit')}
                        </>
                    )}
                </Button>
            </form>
        </PortalAuthLayout>
    );
}
