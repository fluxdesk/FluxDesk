import { Button } from '@/components/ui/button';
import AuthCardLayout from '@/layouts/auth/auth-card-layout';
import { Head, Link } from '@inertiajs/react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ExpiredInvitation() {
    const { t } = useTranslation('common');

    return (
        <AuthCardLayout
            title={t('invitation.expired.title')}
            description={t('invitation.expired.description')}
        >
            <Head title={t('invitation.expired.title')} />

            <div className="space-y-6">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                    <div className="flex gap-3">
                        <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                {t('invitation.expired.invalid_title')}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                {t('invitation.expired.invalid_message')}
                            </p>
                        </div>
                    </div>
                </div>

                <Button asChild variant="outline" className="w-full">
                    <Link href="/login">
                        <ArrowLeft className="mr-2 size-4" />
                        {t('invitation.expired.back_to_login')}
                    </Link>
                </Button>
            </div>
        </AuthCardLayout>
    );
}
