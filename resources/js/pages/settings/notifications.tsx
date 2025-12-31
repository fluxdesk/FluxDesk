import { Head, useForm } from '@inertiajs/react';
import { AlertTriangle, AtSign, Bell, Mail, MessageSquare, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

interface NotificationPreference {
    notify_new_ticket: boolean;
    notify_contact_reply: boolean;
    notify_internal_note: boolean;
    notify_ticket_assigned: boolean;
    notify_when_mentioned: boolean;
    notify_sla_breach_warning: boolean;
}

interface Props {
    preferences: NotificationPreference;
    organization: {
        id: number;
        name: string;
    };
}

export default function NotificationsPage({ preferences, organization }: Props) {
    const { t } = useTranslation('settings');
    const { data, setData, patch, processing } = useForm<NotificationPreference>({
        notify_new_ticket: preferences.notify_new_ticket,
        notify_contact_reply: preferences.notify_contact_reply,
        notify_internal_note: preferences.notify_internal_note,
        notify_ticket_assigned: preferences.notify_ticket_assigned,
        notify_when_mentioned: preferences.notify_when_mentioned,
        notify_sla_breach_warning: preferences.notify_sla_breach_warning,
    });

    const notificationSettings = [
        {
            key: 'notify_new_ticket' as const,
            icon: Mail,
            title: t('notifications.new_ticket'),
            description: t('notifications.new_ticket_description'),
        },
        {
            key: 'notify_contact_reply' as const,
            icon: MessageSquare,
            title: t('notifications.contact_reply'),
            description: t('notifications.contact_reply_description'),
        },
        {
            key: 'notify_internal_note' as const,
            icon: Bell,
            title: t('notifications.internal_note'),
            description: t('notifications.internal_note_description'),
        },
        {
            key: 'notify_ticket_assigned' as const,
            icon: UserPlus,
            title: t('notifications.ticket_assigned'),
            description: t('notifications.ticket_assigned_description'),
        },
        {
            key: 'notify_when_mentioned' as const,
            icon: AtSign,
            title: t('notifications.mention'),
            description: t('notifications.mention_description'),
        },
        {
            key: 'notify_sla_breach_warning' as const,
            icon: AlertTriangle,
            title: t('notifications.sla_warning'),
            description: t('notifications.sla_warning_description'),
        },
    ];

    const handleToggle = (key: keyof NotificationPreference, checked: boolean) => {
        setData(key, checked);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patch('/settings/notifications', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('notifications.saved'));
            },
            onError: () => {
                toast.error(t('notifications.error'));
            },
        });
    };

    return (
        <AppLayout>
            <Head title={t('notifications.page_title')} />

            <SettingsLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('notifications.title')}</CardTitle>
                            <CardDescription>
                                {t('notifications.description', { organization: organization.name })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    {notificationSettings.map(({ key, icon: Icon, title, description }) => (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="rounded-lg bg-muted p-2">
                                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{title}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {description}
                                                    </p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={data[key]}
                                                onCheckedChange={(checked) => handleToggle(key, checked)}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <Button type="submit" disabled={processing}>
                                        {processing ? t('notifications.saving') : t('notifications.save')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
