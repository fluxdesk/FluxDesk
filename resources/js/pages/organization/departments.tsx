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
import { Building2, Pencil, Plus, Trash2, Mail, Ticket, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
    departments: Department[];
}

export default function Departments({ departments: initialDepartments }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [departments, setDepartments] = useState(initialDepartments);
    const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sync local state when Inertia refreshes page data
    useEffect(() => {
        setDepartments(initialDepartments);
    }, [initialDepartments]);

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
                    {/* Info Card */}
                    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
                        <CardContent className="py-4">
                            <div className="flex gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-blue-900 dark:text-blue-100">
                                        Afdelingen voor ticketrouting
                                    </p>
                                    <p className="text-blue-700 dark:text-blue-300">
                                        Elk e-mailkanaal is gekoppeld aan een afdeling. Tickets worden automatisch toegewezen aan de afdeling van het e-mailkanaal.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Departments Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Building2 className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Afdelingen</CardTitle>
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
                                    <DepartmentFormDialog onClose={() => setIsCreateOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {departments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Building2 className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">Geen afdelingen</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Voeg een afdeling toe om tickets te organiseren.
                                    </p>
                                </div>
                            ) : (
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
                            )}
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
                className="h-5 w-5 rounded-full ring-2 ring-background shadow-sm"
                style={{ backgroundColor: department.color }}
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{department.name}</span>
                    {department.is_default && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Standaard
                        </span>
                    )}
                </div>
                {department.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{department.description}</p>
                )}
                <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="flex items-center gap-1.5 cursor-default">
                                <Ticket className="h-3.5 w-3.5" />
                                <span>{department.tickets_count ?? 0}</span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>Tickets in deze afdeling</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="flex items-center gap-1.5 cursor-default">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{department.email_channels_count ?? 0}</span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>Gekoppelde e-mailkanalen</TooltipContent>
                    </Tooltip>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <Dialog open={isEditing} onOpenChange={(open) => (open ? onEdit() : onEditClose())}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DepartmentFormDialog department={department} onClose={onEditClose} />
                </Dialog>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={onDelete}
                                disabled={!canDelete}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </span>
                    </TooltipTrigger>
                    {!canDelete && (
                        <TooltipContent>
                            {department.is_default
                                ? 'Standaardafdeling kan niet verwijderd worden'
                                : 'Afdeling is nog in gebruik'}
                        </TooltipContent>
                    )}
                </Tooltip>
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
        <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{department ? 'Afdeling bewerken' : 'Afdeling toevoegen'}</DialogTitle>
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
                            autoFocus
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">
                            Beschrijving <span className="text-muted-foreground font-normal">(optioneel)</span>
                        </Label>
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

                    <label
                        htmlFor="is_default"
                        className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                    >
                        <Checkbox
                            id="is_default"
                            checked={data.is_default}
                            onCheckedChange={(checked) => setData('is_default', checked === true)}
                            className="mt-0.5"
                        />
                        <div className="space-y-1">
                            <span className="font-medium">Standaardafdeling</span>
                            <p className="text-xs text-muted-foreground">
                                Nieuwe tickets worden automatisch aan deze afdeling toegewezen
                            </p>
                        </div>
                    </label>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="submit" disabled={processing || !data.name.trim()}>
                        {department ? 'Opslaan' : 'Toevoegen'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
