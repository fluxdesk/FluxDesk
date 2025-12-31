import { Head } from '@inertiajs/react';
import { Appearance, useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function AppearancePage() {
    const { t } = useTranslation('settings');
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string; description: string }[] = [
        { value: 'light', icon: Sun, label: t('appearance.light'), description: t('appearance.light_description') },
        { value: 'dark', icon: Moon, label: t('appearance.dark'), description: t('appearance.dark_description') },
        { value: 'system', icon: Monitor, label: t('appearance.system'), description: t('appearance.system_description') },
    ];

    const handleAppearanceChange = (value: Appearance) => {
        updateAppearance(value);
        const labels: Record<Appearance, string> = {
            light: t('appearance.light').toLowerCase(),
            dark: t('appearance.dark').toLowerCase(),
            system: t('appearance.system').toLowerCase()
        };
        toast.success(t('appearance.changed', { theme: labels[value] }));
    };

    return (
        <AppLayout>
            <Head title={t('appearance.page_title')} />

            <SettingsLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('appearance.title')}</CardTitle>
                            <CardDescription>
                                {t('appearance.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {tabs.map(({ value, icon: Icon, label, description }) => (
                                    <button
                                        key={value}
                                        onClick={() => handleAppearanceChange(value)}
                                        className={cn(
                                            'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-muted/50',
                                            appearance === value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-transparent bg-muted/30'
                                        )}
                                    >
                                        <div className={cn(
                                            'rounded-lg p-3',
                                            appearance === value
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                        )}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium">{label}</p>
                                            <p className="text-xs text-muted-foreground">{description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
