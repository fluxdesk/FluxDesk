import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PortalLayout from '@/layouts/portal/portal-layout';
import { type PortalSharedData } from '@/types/portal';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function PortalProfile() {
    const { t } = useTranslation('portal');
    const { organization, contact } = usePage<PortalSharedData>().props;
    const primaryColor = organization?.settings?.primary_color ?? '#18181b';
    const orgSlug = organization?.slug ?? '';
    const [showSuccess, setShowSuccess] = useState(false);

    const form = useForm({
        name: contact?.name ?? '',
        phone: contact?.phone ?? '',
        company: contact?.company ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch(`/${orgSlug}/portal/profile`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowSuccess(true);
            },
        });
    };

    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess]);

    return (
        <PortalLayout>
            <Head title={t('profile.page_title')} />

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-xl">{t('profile.title')}</CardTitle>
                    <CardDescription>
                        {t('profile.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email (disabled) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('profile.email')}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={contact?.email ?? ''}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('profile.email_readonly_hint')}
                            </p>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('profile.name')}</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder={t('profile.name_placeholder')}
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                disabled={form.processing}
                            />
                            {form.errors.name && (
                                <p className="text-sm text-destructive">{form.errors.name}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('profile.phone')}</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder={t('profile.phone_placeholder')}
                                value={form.data.phone}
                                onChange={(e) => form.setData('phone', e.target.value)}
                                disabled={form.processing}
                            />
                            {form.errors.phone && (
                                <p className="text-sm text-destructive">{form.errors.phone}</p>
                            )}
                        </div>

                        {/* Company */}
                        <div className="space-y-2">
                            <Label htmlFor="company">{t('profile.company')}</Label>
                            <Input
                                id="company"
                                type="text"
                                placeholder={t('profile.company_placeholder')}
                                value={form.data.company}
                                onChange={(e) => form.setData('company', e.target.value)}
                                disabled={form.processing}
                            />
                            {form.errors.company && (
                                <p className="text-sm text-destructive">{form.errors.company}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            {showSuccess && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle2 className="size-4" />
                                    {t('profile.saved')}
                                </div>
                            )}
                            <div className={showSuccess ? '' : 'ml-auto'}>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    className="text-white"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {form.processing ? (
                                        <>
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            {t('profile.saving')}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="size-4 mr-2" />
                                            {t('profile.save')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </PortalLayout>
    );
}
