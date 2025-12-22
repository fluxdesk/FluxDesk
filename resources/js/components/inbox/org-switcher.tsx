import * as React from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { Check, Plus, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import type { SharedData } from '@/types';

interface OrgSwitcherProps {
    isCollapsed: boolean;
}

export function OrgSwitcher({ isCollapsed }: OrgSwitcherProps) {
    const { organization, organizations } = usePage<SharedData>().props;
    const [isCreateOrgOpen, setIsCreateOrgOpen] = React.useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            'flex items-center gap-2 [&>span]:line-clamp-1 [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-1 [&>span]:truncate',
                            isCollapsed &&
                                'flex h-9 w-9 shrink-0 items-center justify-center p-0 [&>span]:w-auto [&>svg]:hidden',
                        )}
                        aria-label="Select organization"
                    >
                        <span>
                            {organization?.settings?.logo_path ? (
                                <img
                                    src={`/storage/${organization.settings.logo_path}`}
                                    alt={organization?.name || ''}
                                    className="h-5 w-5 shrink-0 rounded object-cover"
                                />
                            ) : (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                                    {organization?.name?.charAt(0).toUpperCase() || 'O'}
                                </span>
                            )}
                            <span className={cn('ml-2', isCollapsed && 'hidden')}>
                                {organization?.name || 'Organization'}
                            </span>
                        </span>
                        <ChevronsUpDown className={cn('ml-auto h-4 w-4 shrink-0 opacity-50', isCollapsed && 'hidden')} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        Switch organization
                    </DropdownMenuLabel>
                    {organizations.map((org) => (
                        <DropdownMenuItem
                            key={org.id}
                            onClick={() => {
                                if (org.id !== organization?.id) {
                                    router.post(`/organizations/${org.slug}/switch`);
                                }
                            }}
                            className="gap-2 py-2"
                        >
                            {org.settings?.logo_path ? (
                                <img
                                    src={`/storage/${org.settings.logo_path}`}
                                    alt={org.name}
                                    className="h-5 w-5 shrink-0 rounded object-cover"
                                />
                            ) : (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium">
                                    {org.name.charAt(0).toUpperCase()}
                                </span>
                            )}
                            <span className="flex-1 truncate">{org.name}</span>
                            {org.id === organization?.id && <Check className="h-4 w-4 text-primary" />}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsCreateOrgOpen(true)} className="gap-2 py-2">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-dashed">
                            <Plus className="h-3 w-3" />
                        </div>
                        <span>Create organization</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <CreateOrgDialog open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen} />
        </>
    );
}

function CreateOrgDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/organizations', {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create Organization</DialogTitle>
                        <DialogDescription>Create a new organization for a separate team or project.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="org-name">Organization Name</Label>
                            <Input
                                id="org-name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Acme Inc."
                                autoFocus
                            />
                            <InputError message={errors.name} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing || !data.name.trim()}>
                            {processing ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
