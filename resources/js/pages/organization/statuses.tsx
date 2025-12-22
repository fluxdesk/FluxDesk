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
import { SortableList } from '@/components/common/sortable-list';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { store, update, destroy } from '@/routes/organization/statuses';
import { type Status } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { ColorPicker } from '@/components/common/color-picker';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    statuses: Status[];
}

export default function Statuses({ statuses: initialStatuses }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState<Status | null>(null);
    const [statuses, setStatuses] = useState(initialStatuses);
    const [deletingStatus, setDeletingStatus] = useState<Status | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!deletingStatus) return;
        setIsDeleting(true);
        router.delete(destroy(deletingStatus.id).url, {
            onSuccess: () => {
                toast.success('Status verwijderd');
                setStatuses((prev) => prev.filter((s) => s.id !== deletingStatus.id));
                setDeletingStatus(null);
            },
            onError: () => toast.error('Status verwijderen mislukt'),
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleReorder = (newStatuses: Status[]) => {
        setStatuses(newStatuses);
        router.post(
            '/organization/statuses/reorder',
            { ids: newStatuses.map((s) => s.id) },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => toast.success('Statusvolgorde bijgewerkt'),
            },
        );
    };

    return (
        <AppLayout>
            <Head title="Statussen" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Statussen</CardTitle>
                                    <CardDescription>
                                        Configureer ticketstatussen. Sleep om te herschikken.
                                    </CardDescription>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Status toevoegen
                                        </Button>
                                    </DialogTrigger>
                                    <StatusFormDialog onClose={() => setIsCreateOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <SortableList
                                items={statuses}
                                onReorder={handleReorder}
                                renderItem={(status) => (
                                    <StatusItem
                                        status={status}
                                        isEditing={editingStatus?.id === status.id}
                                        onEdit={() => setEditingStatus(status)}
                                        onEditClose={() => setEditingStatus(null)}
                                        onDelete={() => setDeletingStatus(status)}
                                    />
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationDialog
                    open={!!deletingStatus}
                    onOpenChange={(open) => !open && setDeletingStatus(null)}
                    title="Status verwijderen"
                    description={`Weet je zeker dat je de status "${deletingStatus?.name}" wilt verwijderen? Tickets met deze status worden teruggezet naar de standaardstatus.`}
                    confirmLabel="Verwijderen"
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function StatusItem({
    status,
    isEditing,
    onEdit,
    onEditClose,
    onDelete,
}: {
    status: Status;
    isEditing: boolean;
    onEdit: () => void;
    onEditClose: () => void;
    onDelete: () => void;
}) {
    return (
        <>
            <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: status.color }}
            />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{status.name}</span>
                    {status.is_default && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                            Standaard
                        </span>
                    )}
                    {status.is_closed && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            Gesloten
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Dialog open={isEditing} onOpenChange={(open) => (open ? onEdit() : onEditClose())}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <StatusFormDialog status={status} onClose={onEditClose} />
                </Dialog>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onDelete}
                    disabled={status.is_default}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </>
    );
}

function StatusFormDialog({
    status,
    onClose,
}: {
    status?: Status;
    onClose: () => void;
}) {
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: status?.name || '',
        color: status?.color || '#3b82f6',
        is_default: status?.is_default || false,
        is_closed: status?.is_closed || false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (status) {
            patch(update(status.id).url, {
                onSuccess: () => {
                    toast.success('Status bijgewerkt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('Status bijwerken mislukt'),
            });
        } else {
            post(store().url, {
                onSuccess: () => {
                    toast.success('Status aangemaakt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('Status aanmaken mislukt'),
            });
        }
    }

    return (
        <DialogContent>
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{status ? 'Status bewerken' : 'Status aanmaken'}</DialogTitle>
                    <DialogDescription>
                        {status ? 'Werk de statusdetails bij.' : 'Voeg een nieuwe statusoptie toe voor tickets.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Naam</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="bijv. Open, In behandeling, Gesloten"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Kleur</Label>
                        <ColorPicker value={data.color} onChange={(color) => setData('color', color)} />
                        <InputError message={errors.color} />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_default"
                            checked={data.is_default}
                            onCheckedChange={(checked) => setData('is_default', checked === true)}
                        />
                        <Label htmlFor="is_default" className="font-normal">
                            Instellen als standaardstatus voor nieuwe tickets
                        </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_closed"
                            checked={data.is_closed}
                            onCheckedChange={(checked) => setData('is_closed', checked === true)}
                        />
                        <Label htmlFor="is_closed" className="font-normal">
                            Markeert ticket als gesloten/opgelost
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {status ? 'Wijzigingen opslaan' : 'Status aanmaken'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
