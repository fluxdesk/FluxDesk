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
import { CircleDot, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
    statuses: Status[];
}

export default function Statuses({ statuses: initialStatuses }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState<Status | null>(null);
    const [statuses, setStatuses] = useState(initialStatuses);
    const [deletingStatus, setDeletingStatus] = useState<Status | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sync local state when Inertia refreshes page data
    useEffect(() => {
        setStatuses(initialStatuses);
    }, [initialStatuses]);

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
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <CircleDot className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Statussen</CardTitle>
                                        <CardDescription>
                                            Sleep om te herschikken
                                        </CardDescription>
                                    </div>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Toevoegen
                                        </Button>
                                    </DialogTrigger>
                                    <StatusFormDialog onClose={() => setIsCreateOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {statuses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <CircleDot className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">Geen statussen</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Voeg een status toe om tickets te organiseren.
                                    </p>
                                </div>
                            ) : (
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
                            )}
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
                className="h-5 w-5 rounded-full ring-2 ring-background shadow-sm"
                style={{ backgroundColor: status.color }}
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{status.name}</span>
                    {status.is_default && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Standaard
                        </span>
                    )}
                    {status.is_closed && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Gesloten
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <Dialog open={isEditing} onOpenChange={(open) => (open ? onEdit() : onEditClose())}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <StatusFormDialog status={status} onClose={onEditClose} />
                </Dialog>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={onDelete}
                                disabled={status.is_default}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </span>
                    </TooltipTrigger>
                    {status.is_default && (
                        <TooltipContent>
                            Standaardstatus kan niet verwijderd worden
                        </TooltipContent>
                    )}
                </Tooltip>
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
        <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{status ? 'Status bewerken' : 'Status toevoegen'}</DialogTitle>
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
                            autoFocus
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Kleur</Label>
                        <ColorPicker value={data.color} onChange={(color) => setData('color', color)} />
                        <InputError message={errors.color} />
                    </div>

                    <div className="flex items-start space-x-3 rounded-lg border p-3">
                        <Checkbox
                            id="is_default"
                            checked={data.is_default}
                            onCheckedChange={(checked) => setData('is_default', checked === true)}
                            className="mt-0.5"
                        />
                        <div className="space-y-1">
                            <Label htmlFor="is_default" className="font-medium cursor-pointer">
                                Standaardstatus
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Nieuwe tickets krijgen automatisch deze status
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3 rounded-lg border p-3">
                        <Checkbox
                            id="is_closed"
                            checked={data.is_closed}
                            onCheckedChange={(checked) => setData('is_closed', checked === true)}
                            className="mt-0.5"
                        />
                        <div className="space-y-1">
                            <Label htmlFor="is_closed" className="font-medium cursor-pointer">
                                Gesloten status
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Markeert ticket als afgehandeld
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="submit" disabled={processing || !data.name.trim()}>
                        {status ? 'Opslaan' : 'Toevoegen'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
