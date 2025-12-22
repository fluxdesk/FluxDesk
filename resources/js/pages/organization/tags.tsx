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

interface Props {
    tags: Tag[];
}

export default function Tags({ tags }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!deletingTag) return;
        setIsDeleting(true);
        router.delete(destroy(deletingTag.id).url, {
            onSuccess: () => {
                toast.success('Tag verwijderd');
                setDeletingTag(null);
            },
            onError: () => toast.error('Tag verwijderen mislukt'),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AppLayout>
            <Head title="Tags" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Tags</CardTitle>
                                    <CardDescription>
                                        Maak tags om je tickets te categoriseren
                                    </CardDescription>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Tag toevoegen
                                        </Button>
                                    </DialogTrigger>
                                    <TagFormDialog onClose={() => setIsCreateOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {tags.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-8 text-center">
                                    <p className="text-muted-foreground">
                                        Nog geen tags aangemaakt. Klik op "Tag toevoegen" om je eerste tag te maken.
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
                                                    <TagFormDialog tag={tag} onClose={() => setEditingTag(null)} />
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
                    title="Tag verwijderen"
                    description={`Weet je zeker dat je de tag "${deletingTag?.name}" wilt verwijderen? De tag wordt van alle tickets verwijderd.`}
                    confirmLabel="Verwijderen"
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function TagFormDialog({
    tag,
    onClose,
}: {
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
                    toast.success('Tag bijgewerkt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('Tag bijwerken mislukt'),
            });
        } else {
            post(store().url, {
                onSuccess: () => {
                    toast.success('Tag aangemaakt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('Tag aanmaken mislukt'),
            });
        }
    }

    return (
        <DialogContent>
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{tag ? 'Tag bewerken' : 'Tag aanmaken'}</DialogTitle>
                    <DialogDescription>
                        {tag ? 'Werk de tagdetails bij.' : 'Voeg een nieuwe tag toe om tickets te categoriseren.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Naam</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="bijv. Bug, Feature, Vraag"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Kleur</Label>
                        <ColorPicker value={data.color} onChange={(color) => setData('color', color)} />
                        <InputError message={errors.color} />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {tag ? 'Wijzigingen opslaan' : 'Tag aanmaken'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
