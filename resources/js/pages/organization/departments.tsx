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
import { Textarea } from '@/components/ui/textarea';
import { SortableList } from '@/components/common/sortable-list';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { store, update, destroy } from '@/routes/organization/departments';
import { type Department } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { ColorPicker } from '@/components/common/color-picker';
import { Pencil, Plus, Trash2, Mail, Ticket } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    departments: Department[];
}

export default function Departments({ departments: initialDepartments }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [departments, setDepartments] = useState(initialDepartments);
    const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!deletingDepartment) return;
        setIsDeleting(true);
        router.delete(destroy(deletingDepartment.id).url, {
            onSuccess: () => {
                toast.success('Afdeling verwijderd');
                setDepartments((prev) => prev.filter((d) => d.id !== deletingDepartment.id));
                setDeletingDepartment(null);
            },
            onError: () => toast.error('Afdeling verwijderen mislukt'),
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleReorder = (newDepartments: Department[]) => {
        setDepartments(newDepartments);
        router.post(
            '/organization/departments/reorder',
            { ids: newDepartments.map((d) => d.id) },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => toast.success('Afdelingsvolgorde bijgewerkt'),
            },
        );
    };

    return (
        <AppLayout>
            <Head title="Afdelingen" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Afdelingen</CardTitle>
                                    <CardDescription>
                                        Configureer afdelingen voor ticketrouting en e-mailkanalen. Sleep om te herschikken.
                                    </CardDescription>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Afdeling toevoegen
                                        </Button>
                                    </DialogTrigger>
                                    <DepartmentFormDialog onClose={() => setIsCreateOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <SortableList
                                items={departments}
                                onReorder={handleReorder}
                                renderItem={(department) => (
                                    <DepartmentItem
                                        department={department}
                                        isEditing={editingDepartment?.id === department.id}
                                        onEdit={() => setEditingDepartment(department)}
                                        onEditClose={() => setEditingDepartment(null)}
                                        onDelete={() => setDeletingDepartment(department)}
                                    />
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationDialog
                    open={!!deletingDepartment}
                    onOpenChange={(open) => !open && setDeletingDepartment(null)}
                    title="Afdeling verwijderen"
                    description={`Weet je zeker dat je de afdeling "${deletingDepartment?.name}" wilt verwijderen? Afdelingen met tickets of e-mailkanalen kunnen niet worden verwijderd.`}
                    confirmLabel="Verwijderen"
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function DepartmentItem({
    department,
    isEditing,
    onEdit,
    onEditClose,
    onDelete,
}: {
    department: Department;
    isEditing: boolean;
    onEdit: () => void;
    onEditClose: () => void;
    onDelete: () => void;
}) {
    const hasTickets = (department.tickets_count ?? 0) > 0;
    const hasEmailChannels = (department.email_channels_count ?? 0) > 0;
    const canDelete = !department.is_default && !hasTickets && !hasEmailChannels;

    return (
        <>
            <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: department.color }}
            />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{department.name}</span>
                    {department.is_default && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                            Standaard
                        </span>
                    )}
                </div>
                {department.description && (
                    <p className="text-sm text-muted-foreground">{department.description}</p>
                )}
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Ticket className="h-3 w-3" />
                        {department.tickets_count ?? 0} tickets
                    </span>
                    <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {department.email_channels_count ?? 0} e-mailkanalen
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Dialog open={isEditing} onOpenChange={(open) => (open ? onEdit() : onEditClose())}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DepartmentFormDialog department={department} onClose={onEditClose} />
                </Dialog>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onDelete}
                    disabled={!canDelete}
                    title={!canDelete ? 'Kan niet verwijderen: afdeling is in gebruik' : undefined}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </>
    );
}

function DepartmentFormDialog({
    department,
    onClose,
}: {
    department?: Department;
    onClose: () => void;
}) {
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: department?.name || '',
        description: department?.description || '',
        color: department?.color || '#6b7280',
        is_default: department?.is_default || false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (department) {
            patch(update(department.id).url, {
                onSuccess: () => {
                    toast.success('Afdeling bijgewerkt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('Afdeling bijwerken mislukt'),
            });
        } else {
            post(store().url, {
                onSuccess: () => {
                    toast.success('Afdeling aangemaakt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('Afdeling aanmaken mislukt'),
            });
        }
    }

    return (
        <DialogContent>
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{department ? 'Afdeling bewerken' : 'Afdeling aanmaken'}</DialogTitle>
                    <DialogDescription>
                        {department ? 'Werk de afdelingsdetails bij.' : 'Voeg een nieuwe afdeling toe voor ticketrouting.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Naam</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="bijv. Support, Verkoop, Facturatie"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Beschrijving (optioneel)</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Korte beschrijving van de afdeling"
                            rows={2}
                        />
                        <InputError message={errors.description} />
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
                            Instellen als standaardafdeling voor nieuwe tickets
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {department ? 'Wijzigingen opslaan' : 'Afdeling aanmaken'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
