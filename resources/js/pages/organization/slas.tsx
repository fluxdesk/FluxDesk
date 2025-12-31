import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { store, update, destroy } from '@/routes/organization/slas';
import { update as updateSettings } from '@/routes/organization/sla-settings';
import { type Sla, type Priority, type SlaSettings } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { Bell, Clock, Pencil, Plus, Settings, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Props {
    slas: Sla[];
    priorities: Priority[];
    slaSettings: SlaSettings;
}

const REMINDER_PRESETS = [
    { value: 15, labelKey: 'slas.reminder_presets.15_minutes' },
    { value: 30, labelKey: 'slas.reminder_presets.30_minutes' },
    { value: 60, labelKey: 'slas.reminder_presets.1_hour' },
    { value: 120, labelKey: 'slas.reminder_presets.2_hours' },
    { value: 240, labelKey: 'slas.reminder_presets.4_hours' },
    { value: 480, labelKey: 'slas.reminder_presets.8_hours' },
    { value: 1440, labelKey: 'slas.reminder_presets.24_hours' },
];

export default function Slas({ slas, priorities, slaSettings }: Props) {
    const { t } = useTranslation('organization');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingSla, setEditingSla] = useState<Sla | null>(null);
    const [deletingSla, setDeletingSla] = useState<Sla | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const formatMinutes = (minutes: number): string => {
        if (minutes < 60) return t('slas.format_minutes.minutes', { count: minutes });
        if (minutes < 1440) return t('slas.format_minutes.hours', { count: Math.floor(minutes / 60) });
        return t('slas.format_minutes.days', { count: Math.floor(minutes / 1440) });
    };

    const settingsForm = useForm({
        share_sla_times_with_contacts: slaSettings.share_sla_times_with_contacts,
        share_average_reply_time: slaSettings.share_average_reply_time,
        sla_reminder_intervals: slaSettings.sla_reminder_intervals ?? [],
    });

    const handleSettingsSubmit = () => {
        settingsForm.patch(updateSettings().url, {
            onSuccess: () => toast.success(t('slas.settings_saved')),
            onError: () => toast.error(t('slas.settings_save_failed')),
        });
    };

    const addReminderInterval = (minutes: number) => {
        if (!settingsForm.data.sla_reminder_intervals.includes(minutes)) {
            settingsForm.setData('sla_reminder_intervals',
                [...settingsForm.data.sla_reminder_intervals, minutes].sort((a, b) => b - a)
            );
        }
    };

    const removeReminderInterval = (minutes: number) => {
        settingsForm.setData('sla_reminder_intervals',
            settingsForm.data.sla_reminder_intervals.filter(m => m !== minutes)
        );
    };

    const handleDelete = () => {
        if (!deletingSla) return;
        setIsDeleting(true);
        router.delete(destroy(deletingSla.id).url, {
            onSuccess: () => {
                toast.success(t('slas.deleted'));
                setDeletingSla(null);
            },
            onError: () => toast.error(t('slas.delete_failed')),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AppLayout>
            <Head title={t('slas.page_title')} />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    {/* SLA Settings Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <CardTitle className="text-lg">{t('slas.settings_title')}</CardTitle>
                                    <CardDescription>
                                        {t('slas.settings_description')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Sharing settings */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>{t('slas.share_sla_times_label')}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {t('slas.share_sla_times_description')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settingsForm.data.share_sla_times_with_contacts}
                                        onCheckedChange={(checked) =>
                                            settingsForm.setData('share_sla_times_with_contacts', checked)
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>{t('slas.share_average_reply_time_label')}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {t('slas.share_average_reply_time_description')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settingsForm.data.share_average_reply_time}
                                        onCheckedChange={(checked) =>
                                            settingsForm.setData('share_average_reply_time', checked)
                                        }
                                    />
                                </div>
                            </div>

                            {/* Reminder intervals */}
                            <div className="space-y-3 border-t pt-4">
                                <div className="flex items-center gap-2">
                                    <Bell className="h-4 w-4 text-muted-foreground" />
                                    <Label>{t('slas.reminders_label')}</Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {t('slas.reminders_description')}
                                </p>

                                {/* Current intervals */}
                                {settingsForm.data.sla_reminder_intervals.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {settingsForm.data.sla_reminder_intervals.map((minutes) => (
                                            <div
                                                key={minutes}
                                                className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
                                            >
                                                <span>{formatMinutes(minutes)} {t('slas.before_deadline')}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeReminderInterval(minutes)}
                                                    className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add interval */}
                                <div className="flex flex-wrap gap-2">
                                    {REMINDER_PRESETS.filter(
                                        (p) => !settingsForm.data.sla_reminder_intervals.includes(p.value)
                                    ).map((preset) => (
                                        <Button
                                            key={preset.value}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addReminderInterval(preset.value)}
                                        >
                                            <Plus className="mr-1 h-3 w-3" />
                                            {t(preset.labelKey)}
                                        </Button>
                                    ))}
                                </div>

                                {settingsForm.data.sla_reminder_intervals.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic">
                                        {t('slas.no_reminders')}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end border-t pt-4">
                                <Button
                                    onClick={handleSettingsSubmit}
                                    disabled={settingsForm.processing}
                                >
                                    {t('slas.save_settings')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SLA List Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">{t('slas.title')}</CardTitle>
                                    <CardDescription>
                                        {t('slas.description')}
                                    </CardDescription>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('slas.add')}
                                        </Button>
                                    </DialogTrigger>
                                    <SlaFormDialog priorities={priorities} onClose={() => setIsCreateOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                {slas.map((sla) => (
                                    <div key={sla.id} className="rounded-lg border bg-muted/30 p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{sla.name}</span>
                                                {sla.is_default && (
                                                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                                                        {t('slas.default_badge')}
                                                    </span>
                                                )}
                                                {sla.is_system && (
                                                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                                        {t('slas.system_badge')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Dialog
                                                    open={editingSla?.id === sla.id}
                                                    onOpenChange={(open) => setEditingSla(open ? sla : null)}
                                                >
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <SlaFormDialog
                                                        sla={sla}
                                                        priorities={priorities}
                                                        onClose={() => setEditingSla(null)}
                                                    />
                                                </Dialog>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setDeletingSla(sla)}
                                                    disabled={sla.is_system || sla.is_default}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">{t('slas.first_response')}</p>
                                                <p className="font-medium">
                                                    {sla.first_response_hours ? t('slas.hours', { count: sla.first_response_hours }) : t('slas.not_set')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">{t('slas.resolution')}</p>
                                                <p className="font-medium">
                                                    {sla.resolution_hours ? t('slas.hours', { count: sla.resolution_hours }) : t('slas.not_set')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                            {sla.business_hours_only && <span>{t('slas.business_hours_only')}</span>}
                                            {sla.priority && (
                                                <span className="flex items-center gap-1">
                                                    <div
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: sla.priority.color }}
                                                    />
                                                    {t('slas.priority_label', { name: sla.priority.name })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationDialog
                    open={!!deletingSla}
                    onOpenChange={(open) => !open && setDeletingSla(null)}
                    title={t('slas.delete_title')}
                    description={t('slas.delete_description', { name: deletingSla?.name })}
                    confirmLabel={t('common.delete')}
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function SlaFormDialog({
    sla,
    priorities,
    onClose,
}: {
    sla?: Sla;
    priorities: Priority[];
    onClose: () => void;
}) {
    const { t } = useTranslation('organization');
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: sla?.name || '',
        first_response_hours: sla?.first_response_hours?.toString() || '',
        resolution_hours: sla?.resolution_hours?.toString() || '',
        business_hours_only: sla?.business_hours_only || false,
        is_default: sla?.is_default || false,
        priority_id: sla?.priority_id?.toString() || 'all',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload: Record<string, unknown> = {
            name: data.name,
            first_response_hours: parseInt(data.first_response_hours) || null,
            resolution_hours: parseInt(data.resolution_hours) || null,
            business_hours_only: data.business_hours_only,
            is_default: data.is_default,
        };

        if (data.priority_id && data.priority_id !== 'all') {
            payload.priority_id = parseInt(data.priority_id);
        }

        if (sla) {
            patch(update(sla.id).url, {
                data: payload,
                onSuccess: () => {
                    toast.success(t('slas.updated'));
                    reset();
                    onClose();
                },
                onError: () => toast.error(t('slas.update_failed')),
            });
        } else {
            post(store().url, {
                data: payload,
                onSuccess: () => {
                    toast.success(t('slas.created'));
                    reset();
                    onClose();
                },
                onError: () => toast.error(t('slas.create_failed')),
            });
        }
    }

    return (
        <DialogContent>
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{sla ? t('slas.edit_title') : t('slas.create_title')}</DialogTitle>
                    <DialogDescription>
                        {sla ? t('slas.edit_description') : t('slas.create_description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('slas.name_label')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('slas.name_placeholder')}
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="first_response_hours">{t('slas.first_response_hours_label')}</Label>
                            <Input
                                id="first_response_hours"
                                type="number"
                                min="1"
                                value={data.first_response_hours}
                                onChange={(e) => setData('first_response_hours', e.target.value)}
                                placeholder="24"
                            />
                            <InputError message={errors.first_response_hours} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="resolution_hours">{t('slas.resolution_hours_label')}</Label>
                            <Input
                                id="resolution_hours"
                                type="number"
                                min="1"
                                value={data.resolution_hours}
                                onChange={(e) => setData('resolution_hours', e.target.value)}
                                placeholder="72"
                            />
                            <InputError message={errors.resolution_hours} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="priority_id">{t('slas.apply_to_priority_label')}</Label>
                        <Select value={data.priority_id} onValueChange={(value) => setData('priority_id', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('slas.all_priorities')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('slas.all_priorities')}</SelectItem>
                                {priorities.map((priority) => (
                                    <SelectItem key={priority.id} value={priority.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: priority.color }}
                                            />
                                            {priority.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.priority_id} />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="business_hours_only"
                            checked={data.business_hours_only}
                            onCheckedChange={(checked) => setData('business_hours_only', checked === true)}
                        />
                        <Label htmlFor="business_hours_only" className="font-normal">
                            {t('slas.business_hours_only_label')}
                        </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_default"
                            checked={data.is_default}
                            onCheckedChange={(checked) => setData('is_default', checked === true)}
                        />
                        <Label htmlFor="is_default" className="font-normal">
                            {t('slas.is_default_label')}
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {sla ? t('common.save_changes') : t('slas.create_title')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
