import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { store, update, destroy } from '@/routes/organization/tags';
import { type Tag } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { ColorPicker } from '@/components/common/color-picker';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Props {
    tags: Tag[];
}

export default function Tags({ tags }: Props) {
    const { t } = useTranslation('organization');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!deletingTag) return;
        setIsDeleting(true);
        router.delete(destroy(deletingTag.id).url, {
            onSuccess: () => {
                toast.success(t('tags.deleted'));
                setDeletingTag(null);
            },
            onError: () => toast.error(t('tags.delete_failed')),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AppLayout>
            <Head title={t('tags.page_title')} />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">{t('tags.title')}</CardTitle>
                                    <CardDescription>
                                        {t('tags.description')}
                                    </CardDescription>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('tags.add')}
                                        </Button>
                                    </DialogTrigger>
                                    <TagFormDialog t={t} onClose={() => setIsCreateOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {tags.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-8 text-center">
                                    <p className="text-muted-foreground">
                                        {t('tags.empty')}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <div
                                            key={tag.id}
                                            className="group flex items-center gap-2 rounded-full border bg-card px-3 py-1.5"
                                        >
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="text-sm font-medium">{tag.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Dialog
                                                    open={editingTag?.id === tag.id}
                                                    onOpenChange={(open) => setEditingTag(open ? tag : null)}
                                                >
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <TagFormDialog t={t} tag={tag} onClose={() => setEditingTag(null)} />
                                                </Dialog>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => setDeletingTag(tag)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationDialog
                    open={!!deletingTag}
                    onOpenChange={(open) => !open && setDeletingTag(null)}
                    title={t('tags.delete_title')}
                    description={t('tags.delete_description', { name: deletingTag?.name })}
                    confirmLabel={t('common.delete')}
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function TagFormDialog({
    t,
    tag,
    onClose,
}: {
    t: (key: string, options?: Record<string, unknown>) => string;
    tag?: Tag;
    onClose: () => void;
}) {
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: tag?.name || '',
        color: tag?.color || '#6366f1',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (tag) {
            patch(update(tag.id).url, {
                onSuccess: () => {
                    toast.success(t('tags.updated'));
                    reset();
                    onClose();
                },
                onError: () => toast.error(t('tags.update_failed')),
            });
        } else {
            post(store().url, {
                onSuccess: () => {
                    toast.success(t('tags.created'));
                    reset();
                    onClose();
                },
                onError: () => toast.error(t('tags.create_failed')),
            });
        }
    }

    return (
        <DialogContent>
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{tag ? t('tags.edit_title') : t('tags.create_title')}</DialogTitle>
                    <DialogDescription>
                        {tag ? t('tags.edit_description') : t('tags.create_description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('common.name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('tags.name_placeholder')}
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label>{t('common.color')}</Label>
                        <ColorPicker value={data.color} onChange={(color) => setData('color', color)} />
                        <InputError message={errors.color} />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {tag ? t('common.save_changes') : t('tags.create_title')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
