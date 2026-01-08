import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { DashboardTemplate } from '@/types/dashboard';
import { router } from '@inertiajs/react';
import { Briefcase, Eye, LayoutGrid, Trash2, User, Zap } from 'lucide-react';
import { useState } from 'react';

interface TemplateGalleryDialogProps {
    open: boolean;
    onClose: () => void;
    templates: DashboardTemplate[];
}

const roleIcons: Record<string, typeof Briefcase> = {
    manager: Briefcase,
    agent: User,
};

export function TemplateGalleryDialog({
    open,
    onClose,
    templates,
}: TemplateGalleryDialogProps) {
    const [applying, setApplying] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);

    const presets = templates.filter((t) => t.is_preset);
    const custom = templates.filter((t) => !t.is_preset);

    const handleApply = (template: DashboardTemplate) => {
        setApplying(template.id);
        router.post(`/dashboard/templates/${template.id}/apply`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setApplying(null);
                onClose();
            },
            onError: () => {
                setApplying(null);
            },
        });
    };

    const handleDelete = (template: DashboardTemplate) => {
        if (template.is_preset) return;

        setDeleting(template.id);
        router.delete(`/dashboard/templates/${template.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleting(null);
            },
            onError: () => {
                setDeleting(null);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Dashboard Templates</DialogTitle>
                    <DialogDescription>
                        Apply a template to instantly configure your dashboard layout
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-6">
                        {presets.length > 0 && (
                            <div>
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Zap className="h-4 w-4" />
                                    Preset Templates
                                </h3>
                                <div className="grid gap-3">
                                    {presets.map((template) => {
                                        const RoleIcon = template.role_hint
                                            ? roleIcons[template.role_hint]
                                            : LayoutGrid;
                                        const isApplying = applying === template.id;

                                        return (
                                            <div
                                                key={template.id}
                                                className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                                            >
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                    <RoleIcon className="h-6 w-6 text-primary" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">
                                                            {template.name}
                                                        </span>
                                                        {template.role_hint && (
                                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                                                                {template.role_hint}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                        {template.description}
                                                    </p>
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        {template.widgets.length} widgets
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleApply(template)}
                                                    disabled={isApplying || applying !== null}
                                                >
                                                    {isApplying ? (
                                                        <Spinner className="mr-2 h-4 w-4" />
                                                    ) : (
                                                        <Eye className="mr-2 h-4 w-4" />
                                                    )}
                                                    Apply
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {custom.length > 0 && (
                            <div>
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <LayoutGrid className="h-4 w-4" />
                                    Custom Templates
                                </h3>
                                <div className="grid gap-3">
                                    {custom.map((template) => {
                                        const isApplying = applying === template.id;
                                        const isDeleting = deleting === template.id;

                                        return (
                                            <div
                                                key={template.id}
                                                className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                                            >
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                    <LayoutGrid className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium">{template.name}</div>
                                                    {template.description && (
                                                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                            {template.description}
                                                        </p>
                                                    )}
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        {template.widgets.length} widgets
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(template)}
                                                        disabled={isDeleting || deleting !== null}
                                                    >
                                                        {isDeleting ? (
                                                            <Spinner className="h-4 w-4" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleApply(template)}
                                                        disabled={isApplying || applying !== null}
                                                    >
                                                        {isApplying ? (
                                                            <Spinner className="mr-2 h-4 w-4" />
                                                        ) : (
                                                            <Eye className="mr-2 h-4 w-4" />
                                                        )}
                                                        Apply
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {presets.length === 0 && custom.length === 0 && (
                            <div className="py-8 text-center text-muted-foreground">
                                <LayoutGrid className="mx-auto mb-2 h-8 w-8" />
                                <p className="text-sm">No templates available</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
