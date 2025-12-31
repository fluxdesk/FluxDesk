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
import { Flag, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

interface Props {
    priorities: Priority[];
}

export default function Priorities({ priorities: initialPriorities }: Props) {
    const { t } = useTranslation('organization');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
    const [priorities, setPriorities] = useState(initialPriorities);
    const [deletingPriority, setDeletingPriority] = useState<Priority | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setPriorities(initialPriorities);
    }, [initialPriorities]);

    const handleDelete = () => {
        if (!deletingPriority) return;
        setIsDeleting(true);
        router.delete(destroy(deletingPriority.id).url, {
            onSuccess: () => {
                toast.success(t('priorities.deleted'));
                setPriorities((prev) => prev.filter((p) => p.id !== deletingPriority.id));
                setDeletingPriority(null);
            },
            onError: () => toast.error(t('priorities.delete_failed')),
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
                onSuccess: () => toast.success(t('priorities.reordered')),
            },
        );
    };

    return (
        <AppLayout>
            <Head title={t('priorities.page_title')} />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Flag className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{t('priorities.title')}</CardTitle>
                                        <CardDescription>
                                            {t('common.drag_to_reorder')}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('priorities.add')}
                                        </Button>
                                    </DialogTrigger>
                                    <PriorityFormDialog t={t} onClose={() => setIsCreateOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {priorities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Flag className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">{t('priorities.empty_title')}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {t('priorities.empty_description')}
                                    </p>
                                </div>
                            ) : (
                                <SortableList
                                    items={priorities}
                                    onReorder={handleReorder}
                                    renderItem={(priority) => (
                                        <PriorityItem
                                            t={t}
                                            priority={priority}
                                            isEditing={editingPriority?.id === priority.id}
                                            onEdit={() => setEditingPriority(priority)}
                                            onEditClose={() => setEditingPriority(null)}
                                            onDelete={() => setDeletingPriority(priority)}
                                        />
                                    )}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationDialog
                    open={!!deletingPriority}
                    onOpenChange={(open) => !open && setDeletingPriority(null)}
                    title={t('priorities.delete_title')}
                    description={t('priorities.delete_description', { name: deletingPriority?.name })}
                    confirmLabel={t('common.delete')}
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function PriorityItem({
    t,
    priority,
    isEditing,
    onEdit,
    onEditClose,
    onDelete,
}: {
    t: (key: string, options?: Record<string, unknown>) => string;
    priority: Priority;
    isEditing: boolean;
    onEdit: () => void;
    onEditClose: () => void;
    onDelete: () => void;
}) {
    return (
        <>
            <div
                className="h-5 w-5 rounded-full ring-2 ring-background shadow-sm"
                style={{ backgroundColor: priority.color }}
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{priority.name}</span>
                    {priority.is_default && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {t('common.default')}
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
                    <PriorityFormDialog t={t} priority={priority} onClose={onEditClose} />
                </Dialog>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={onDelete}
                                disabled={priority.is_default}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </span>
                    </TooltipTrigger>
                    {priority.is_default && (
                        <TooltipContent>
                            {t('priorities.cannot_delete_default')}
                        </TooltipContent>
                    )}
                </Tooltip>
            </div>
        </>
    );
}

function PriorityFormDialog({
    t,
    priority,
    onClose,
}: {
    t: (key: string, options?: Record<string, unknown>) => string;
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
                    toast.success(t('priorities.updated'));
                    reset();
                    onClose();
                },
                onError: () => toast.error(t('priorities.update_failed')),
            });
        } else {
            post(store().url, {
                onSuccess: () => {
                    toast.success(t('priorities.created'));
                    reset();
                    onClose();
                },
                onError: () => toast.error(t('priorities.create_failed')),
            });
        }
    }

    return (
        <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{priority ? t('priorities.edit_title') : t('priorities.create_title')}</DialogTitle>
                    <DialogDescription>
                        {priority ? t('priorities.edit_description') : t('priorities.create_description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('common.name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('priorities.name_placeholder')}
                            autoFocus
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label>{t('common.color')}</Label>
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
                            <span className="font-medium">{t('priorities.is_default')}</span>
                            <p className="text-xs text-muted-foreground">
                                {t('priorities.is_default_description')}
                            </p>
                        </div>
                    </label>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={processing || !data.name.trim()}>
                        {priority ? t('common.save') : t('common.add')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
