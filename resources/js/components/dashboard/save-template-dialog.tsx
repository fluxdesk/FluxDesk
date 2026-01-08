import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface SaveTemplateDialogProps {
    open: boolean;
    onClose: () => void;
}

export function SaveTemplateDialog({ open, onClose }: SaveTemplateDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        if (!name.trim()) return;

        setIsSaving(true);
        router.post(
            '/dashboard/templates',
            { name: name.trim(), description: description.trim() || null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    setName('');
                    setDescription('');
                    onClose();
                },
                onError: () => {
                    setIsSaving(false);
                },
            }
        );
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setName('');
            setDescription('');
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Save as Template</DialogTitle>
                    <DialogDescription>
                        Save your current dashboard layout as a reusable template
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input
                            id="template-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Dashboard Template"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="template-description">
                            Description <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Textarea
                            id="template-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this template is for..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                        {isSaving && <Spinner className="mr-2 h-4 w-4" />}
                        Save Template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
