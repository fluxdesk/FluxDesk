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
import { toast } from 'sonner';

interface Props {
    slas: Sla[];
    priorities: Priority[];
    slaSettings: SlaSettings;
}

const REMINDER_PRESETS = [
    { value: 15, label: '15 minuten' },
    { value: 30, label: '30 minuten' },
    { value: 60, label: '1 uur' },
    { value: 120, label: '2 uur' },
    { value: 240, label: '4 uur' },
    { value: 480, label: '8 uur' },
    { value: 1440, label: '24 uur' },
];

function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} uur`;
    return `${Math.floor(minutes / 1440)} dag(en)`;
}

export default function Slas({ slas, priorities, slaSettings }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingSla, setEditingSla] = useState<Sla | null>(null);
    const [deletingSla, setDeletingSla] = useState<Sla | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const settingsForm = useForm({
        share_sla_times_with_contacts: slaSettings.share_sla_times_with_contacts,
        share_average_reply_time: slaSettings.share_average_reply_time,
        sla_reminder_intervals: slaSettings.sla_reminder_intervals ?? [],
    });

    const handleSettingsSubmit = () => {
        settingsForm.patch(updateSettings().url, {
            onSuccess: () => toast.success('SLA instellingen opgeslagen'),
            onError: () => toast.error('Instellingen opslaan mislukt'),
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
                toast.success('SLA verwijderd');
                setDeletingSla(null);
            },
            onError: () => toast.error('SLA verwijderen mislukt'),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AppLayout>
            <Head title="SLA's" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    {/* SLA Settings Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <CardTitle className="text-lg">SLA Instellingen</CardTitle>
                                    <CardDescription>
                                        Configureer SLA-communicatie naar klanten en herinneringen voor medewerkers
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Sharing settings */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Deel SLA-tijden met contacten</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Toon verwachte reactie- en oplostijden in bevestigingsmails naar klanten
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
                                        <Label>Deel gemiddelde reactietijd</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Toon de gemiddelde reactietijd (per prioriteit) in bevestigingsmails
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
                                    <Label>SLA-herinneringen</Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Stuur medewerkers herinneringen wanneer een SLA-deadline nadert
                                </p>

                                {/* Current intervals */}
                                {settingsForm.data.sla_reminder_intervals.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {settingsForm.data.sla_reminder_intervals.map((minutes) => (
                                            <div
                                                key={minutes}
                                                className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
                                            >
                                                <span>{formatMinutes(minutes)} voor deadline</span>
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
                                            {preset.label}
                                        </Button>
                                    ))}
                                </div>

                                {settingsForm.data.sla_reminder_intervals.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic">
                                        Geen herinneringen ingesteld. Klik op een interval om herinneringen in te schakelen.
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end border-t pt-4">
                                <Button
                                    onClick={handleSettingsSubmit}
                                    disabled={settingsForm.processing}
                                >
                                    Instellingen opslaan
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SLA List Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Service Level Agreements</CardTitle>
                                    <CardDescription>
                                        Configureer reactie- en oplostijddoelen
                                    </CardDescription>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            SLA toevoegen
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
                                                        Standaard
                                                    </span>
                                                )}
                                                {sla.is_system && (
                                                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                                        Systeem
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
                                                <p className="text-muted-foreground">Eerste reactie</p>
                                                <p className="font-medium">
                                                    {sla.first_response_hours ? `${sla.first_response_hours} uur` : 'Niet ingesteld'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Oplossing</p>
                                                <p className="font-medium">
                                                    {sla.resolution_hours ? `${sla.resolution_hours} uur` : 'Niet ingesteld'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                            {sla.business_hours_only && <span>Alleen kantooruren</span>}
                                            {sla.priority && (
                                                <span className="flex items-center gap-1">
                                                    <div
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: sla.priority.color }}
                                                    />
                                                    {sla.priority.name} prioriteit
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
                    title="SLA verwijderen"
                    description={`Weet je zeker dat je "${deletingSla?.name}" wilt verwijderen? Tickets met deze SLA worden teruggezet naar de standaard SLA.`}
                    confirmLabel="Verwijderen"
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
        const payload = {
            ...data,
            first_response_hours: parseInt(data.first_response_hours) || null,
            resolution_hours: parseInt(data.resolution_hours) || null,
            priority_id: data.priority_id && data.priority_id !== 'all' ? parseInt(data.priority_id) : null,
        };

        if (sla) {
            patch(update(sla.id).url, {
                data: payload,
                onSuccess: () => {
                    toast.success('SLA bijgewerkt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('SLA bijwerken mislukt'),
            });
        } else {
            post(store().url, {
                data: payload,
                onSuccess: () => {
                    toast.success('SLA aangemaakt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('SLA aanmaken mislukt'),
            });
        }
    }

    return (
        <DialogContent>
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{sla ? 'SLA bewerken' : 'SLA aanmaken'}</DialogTitle>
                    <DialogDescription>
                        {sla ? 'Werk de SLA-configuratie bij.' : 'Definieer reactie- en oplostijddoelen.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Naam</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="bijv. Standaard, Premium, Enterprise"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="first_response_hours">Eerste reactie (uren)</Label>
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
                            <Label htmlFor="resolution_hours">Oplossing (uren)</Label>
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
                        <Label htmlFor="priority_id">Toepassen op prioriteit</Label>
                        <Select value={data.priority_id} onValueChange={(value) => setData('priority_id', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Alle prioriteiten" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle prioriteiten</SelectItem>
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
                            Alleen kantooruren tellen
                        </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_default"
                            checked={data.is_default}
                            onCheckedChange={(checked) => setData('is_default', checked === true)}
                        />
                        <Label htmlFor="is_default" className="font-normal">
                            Instellen als standaard SLA voor nieuwe tickets
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {sla ? 'Wijzigingen opslaan' : 'SLA aanmaken'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
