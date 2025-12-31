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
import { useTranslation } from 'react-i18next';

interface Props {
    statuses: Status[];
}

export default function Statuses({ statuses: initialStatuses }: Props) {
    const { t } = useTranslation('organization');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState<Status | null>(null);
    const [statuses, setStatuses] = useState(initialStatuses);
    const [deletingStatus, setDeletingStatus] = useState<Status | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setStatuses(initialStatuses);
    }, [initialStatuses]);

    const handleDelete = () => {
        if (!deletingStatus) return;
        setIsDeleting(true);
        router.delete(destroy(deletingStatus.id).url, {
            onSuccess: () => {
                toast.success(t('statuses.deleted'));
                setStatuses((prev) => prev.filter((s) => s.id !== deletingStatus.id));
                setDeletingStatus(null);
            },
            onError: () => toast.error(t('statuses.delete_failed')),
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
                onSuccess: () => toast.success(t('statuses.reordered')),
            },
        );
    };

    return (
        <AppLayout>
            <Head title={t('statuses.page_title')} />

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
                                        <CardTitle className="text-lg">{t('statuses.title')}</CardTitle>
                                        <CardDescription>
                                            {t('common.drag_to_reorder')}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('statuses.add')}
                                        </Button>
                                    </DialogTrigger>
                                    <StatusFormDialog t={t} onClose={() => setIsCreateOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {statuses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <CircleDot className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">{t('statuses.empty_title')}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {t('statuses.empty_description')}
                                    </p>
                                </div>
                            ) : (
                                <SortableList
                                    items={statuses}
                                    onReorder={handleReorder}
                                    renderItem={(status) => (
                                        <StatusItem
                                            t={t}
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
                    title={t('statuses.delete_title')}
                    description={t('statuses.delete_description', { name: deletingStatus?.name })}
                    confirmLabel={t('common.delete')}
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function StatusItem({
    t,
    status,
    isEditing,
    onEdit,
    onEditClose,
    onDelete,
}: {
    t: (key: string, options?: Record<string, unknown>) => string;
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
                            {t('common.default')}
                        </span>
                    )}
                    {status.is_closed && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {t('statuses.closed_badge')}
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
                    <StatusFormDialog t={t} status={status} onClose={onEditClose} />
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
                            {t('statuses.cannot_delete_default')}
                        </TooltipContent>
                    )}
                </Tooltip>
            </div>
        </>
    );
}

function StatusFormDialog({
    t,
    status,
    onClose,
}: {
    t: (key: string, options?: Record<string, unknown>) => string;
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
                    toast.success(t('statuses.updated'));
                    reset();
                    onClose();
                },
                onError: () => toast.error(t('statuses.update_failed')),
            });
        } else {
            post(store().url, {
                onSuccess: () => {
                    toast.success(t('statuses.created'));
                    reset();
                    onClose();
                },
                onError: () => toast.error(t('statuses.create_failed')),
            });
        }
    }

    return (
        <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{status ? t('statuses.edit_title') : t('statuses.create_title')}</DialogTitle>
                    <DialogDescription>
                        {status ? t('statuses.edit_description') : t('statuses.create_description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('common.name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('statuses.name_placeholder')}
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
                            <span className="font-medium">{t('statuses.is_default')}</span>
                            <p className="text-xs text-muted-foreground">
                                {t('statuses.is_default_description')}
                            </p>
                        </div>
                    </label>

                    <label
                        htmlFor="is_closed"
                        className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                    >
                        <Checkbox
                            id="is_closed"
                            checked={data.is_closed}
                            onCheckedChange={(checked) => setData('is_closed', checked === true)}
                            className="mt-0.5"
                        />
                        <div className="space-y-1">
                            <span className="font-medium">{t('statuses.is_closed')}</span>
                            <p className="text-xs text-muted-foreground">
                                {t('statuses.is_closed_description')}
                            </p>
                        </div>
                    </label>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={processing || !data.name.trim()}>
                        {status ? t('common.save') : t('common.add')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
