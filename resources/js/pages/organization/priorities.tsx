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
import { store, update, destroy } from '@/routes/organization/priorities';
import { type Priority } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { ColorPicker } from '@/components/common/color-picker';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    priorities: Priority[];
}

export default function Priorities({ priorities: initialPriorities }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
    const [priorities, setPriorities] = useState(initialPriorities);
    const [deletingPriority, setDeletingPriority] = useState<Priority | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!deletingPriority) return;
        setIsDeleting(true);
        router.delete(destroy(deletingPriority.id).url, {
            onSuccess: () => {
                toast.success('Prioriteit verwijderd');
                setPriorities((prev) => prev.filter((p) => p.id !== deletingPriority.id));
                setDeletingPriority(null);
            },
            onError: () => toast.error('Prioriteit verwijderen mislukt'),
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleReorder = (newPriorities: Priority[]) => {
        setPriorities(newPriorities);
        router.post(
            '/organization/priorities/reorder',
            { ids: newPriorities.map((p) => p.id) },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => toast.success('Prioriteitsvolgorde bijgewerkt'),
            },
        );
    };

    return (
        <AppLayout>
            <Head title="Prioriteiten" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Prioriteiten</CardTitle>
                                    <CardDescription>
                                        Configureer prioriteitsniveaus. Sleep om te herschikken.
                                    </CardDescription>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Prioriteit toevoegen
                                        </Button>
                                    </DialogTrigger>
                                    <PriorityFormDialog onClose={() => setIsCreateOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <SortableList
                                items={priorities}
                                onReorder={handleReorder}
                                renderItem={(priority) => (
                                    <PriorityItem
                                        priority={priority}
                                        isEditing={editingPriority?.id === priority.id}
                                        onEdit={() => setEditingPriority(priority)}
                                        onEditClose={() => setEditingPriority(null)}
                                        onDelete={() => setDeletingPriority(priority)}
                                    />
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationDialog
                    open={!!deletingPriority}
                    onOpenChange={(open) => !open && setDeletingPriority(null)}
                    title="Prioriteit verwijderen"
                    description={`Weet je zeker dat je de prioriteit "${deletingPriority?.name}" wilt verwijderen? Tickets met deze prioriteit worden teruggezet naar de standaardprioriteit.`}
                    confirmLabel="Verwijderen"
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function PriorityItem({
    priority,
    isEditing,
    onEdit,
    onEditClose,
    onDelete,
}: {
    priority: Priority;
    isEditing: boolean;
    onEdit: () => void;
    onEditClose: () => void;
    onDelete: () => void;
}) {
    return (
        <>
            <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: priority.color }}
            />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{priority.name}</span>
                    {priority.is_default && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                            Standaard
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
                    <PriorityFormDialog priority={priority} onClose={onEditClose} />
                </Dialog>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onDelete}
                    disabled={priority.is_default}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </>
    );
}

function PriorityFormDialog({
    priority,
    onClose,
}: {
    priority?: Priority;
    onClose: () => void;
}) {
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: priority?.name || '',
        color: priority?.color || '#f59e0b',
        is_default: priority?.is_default || false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (priority) {
            patch(update(priority.id).url, {
                onSuccess: () => {
                    toast.success('Prioriteit bijgewerkt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('Prioriteit bijwerken mislukt'),
            });
        } else {
            post(store().url, {
                onSuccess: () => {
                    toast.success('Prioriteit aangemaakt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('Prioriteit aanmaken mislukt'),
            });
        }
    }

    return (
        <DialogContent>
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{priority ? 'Prioriteit bewerken' : 'Prioriteit aanmaken'}</DialogTitle>
                    <DialogDescription>
                        {priority ? 'Werk de prioriteitsdetails bij.' : 'Voeg een nieuw prioriteitsniveau toe voor tickets.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Naam</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="bijv. Laag, Normaal, Hoog, Urgent"
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
                            Instellen als standaardprioriteit voor nieuwe tickets
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {priority ? 'Wijzigingen opslaan' : 'Prioriteit aanmaken'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
