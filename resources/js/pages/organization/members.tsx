import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { store as storeInvitation, destroy as destroyInvitation, resend as resendInvitation } from '@/routes/organization/invitations';
import { update, destroy } from '@/routes/organization/members';
import { type OrganizationMember, type RoleOption } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { Clock, Mail, Pencil, RefreshCw, Trash2, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useInitials } from '@/hooks/use-initials';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface PendingInvitation {
    id: number;
    email: string;
    role: 'admin' | 'agent';
    expires_at: string;
    inviter: {
        name: string;
    };
}

interface Props {
    members: OrganizationMember[];
    pendingInvitations: PendingInvitation[];
    roles: RoleOption[];
}

export default function Members({ members, pendingInvitations, roles }: Props) {
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
    const [deletingMember, setDeletingMember] = useState<OrganizationMember | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!deletingMember) return;
        setIsDeleting(true);
        router.delete(destroy(deletingMember.id).url, {
            onSuccess: () => {
                toast.success('Lid verwijderd');
                setDeletingMember(null);
            },
            onError: () => toast.error('Lid verwijderen mislukt'),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AppLayout>
            <Head title="Teamleden" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    {/* Pending Invitations */}
                    {pendingInvitations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Openstaande uitnodigingen</CardTitle>
                                <CardDescription>
                                    Uitnodigingen die nog niet zijn geaccepteerd
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {pendingInvitations.map((invitation) => (
                                        <InvitationRow key={invitation.id} invitation={invitation} />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Current Members */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Teamleden</CardTitle>
                                    <CardDescription>
                                        Beheer wie toegang heeft tot deze organisatie
                                    </CardDescription>
                                </div>
                                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Uitnodigen
                                        </Button>
                                    </DialogTrigger>
                                    <InviteMemberDialog roles={roles} onClose={() => setIsInviteOpen(false)} />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {members.map((member) => (
                                    <MemberRow
                                        key={member.id}
                                        member={member}
                                        roles={roles}
                                        isEditing={editingMember?.id === member.id}
                                        onEdit={() => setEditingMember(member)}
                                        onClose={() => setEditingMember(null)}
                                        onDelete={() => setDeletingMember(member)}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationDialog
                    open={!!deletingMember}
                    onOpenChange={(open) => !open && setDeletingMember(null)}
                    title="Teamlid verwijderen"
                    description={`Weet je zeker dat je ${deletingMember?.name} uit deze organisatie wilt verwijderen?`}
                    confirmLabel="Verwijderen"
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function InvitationRow({ invitation }: { invitation: PendingInvitation }) {
    const [isRevoking, setIsRevoking] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const handleRevoke = () => {
        setIsRevoking(true);
        router.delete(destroyInvitation(invitation.id).url, {
            onSuccess: () => toast.success('Uitnodiging ingetrokken'),
            onError: () => toast.error('Uitnodiging intrekken mislukt'),
            onFinish: () => setIsRevoking(false),
        });
    };

    const handleResend = () => {
        setIsResending(true);
        router.post(resendInvitation(invitation.id).url, {}, {
            onSuccess: () => toast.success('Uitnodiging opnieuw verzonden'),
            onError: () => toast.error('Uitnodiging opnieuw verzenden mislukt'),
            onFinish: () => setIsResending(false),
        });
    };

    const expiresAt = new Date(invitation.expires_at);
    const expiresIn = formatDistanceToNow(expiresAt, { addSuffix: true, locale: nl });

    return (
        <div className="flex items-center gap-4 rounded-lg border bg-amber-50/50 p-4 dark:bg-amber-950/20">
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                <Mail className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
                <div className="font-medium">{invitation.email}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-3" />
                    Verloopt {expiresIn}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-background">
                    {invitation.role === 'admin' ? 'Beheerder' : 'Medewerker'}
                </Badge>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleResend}
                        disabled={isResending}
                        title="Opnieuw verzenden"
                    >
                        <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={handleRevoke}
                        disabled={isRevoking}
                        title="Intrekken"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function MemberRow({
    member,
    roles,
    isEditing,
    onEdit,
    onClose,
    onDelete,
}: {
    member: OrganizationMember;
    roles: RoleOption[];
    isEditing: boolean;
    onEdit: () => void;
    onClose: () => void;
    onDelete: () => void;
}) {
    const getInitials = useInitials();

    return (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
            <Avatar className="h-10 w-10">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="font-medium">{member.name}</div>
                <div className="text-sm text-muted-foreground">{member.email}</div>
            </div>
            <div className="flex items-center gap-4">
                <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.pivot.role === 'admin'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                    }`}
                >
                    {member.pivot.role === 'admin' ? 'Beheerder' : 'Medewerker'}
                </span>
                <div className="flex items-center gap-1">
                    <Dialog open={isEditing} onOpenChange={(open) => (open ? onEdit() : onClose())}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <EditMemberDialog member={member} roles={roles} onClose={onClose} />
                    </Dialog>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function InviteMemberDialog({
    roles,
    onClose,
}: {
    roles: RoleOption[];
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        role: 'agent',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeInvitation().url, {
            onSuccess: () => {
                toast.success('Uitnodiging verzonden');
                reset();
                onClose();
            },
            onError: () => toast.error('Uitnodiging verzenden mislukt'),
        });
    }

    return (
        <DialogContent>
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>Teamlid uitnodigen</DialogTitle>
                    <DialogDescription>
                        Stuur een uitnodiging naar een nieuw teamlid. Ze ontvangen een e-mail om lid te worden.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">E-mailadres</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="collega@voorbeeld.nl"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="role">Rol</Label>
                        <Select value={data.role} onValueChange={(value) => setData('role', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecteer een rol" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.value === 'admin' ? 'Beheerder' : 'Medewerker'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.role} />
                        <p className="text-xs text-muted-foreground">
                            Beheerders kunnen organisatie-instellingen en leden beheren. Medewerkers kunnen alleen tickets afhandelen.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="submit" disabled={processing}>
                        Uitnodiging verzenden
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

function EditMemberDialog({
    member,
    roles,
    onClose,
}: {
    member: OrganizationMember;
    roles: RoleOption[];
    onClose: () => void;
}) {
    const { data, setData, patch, processing, errors } = useForm({
        role: member.pivot.role,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(update(member.id).url, {
            onSuccess: () => {
                toast.success('Rol bijgewerkt');
                onClose();
            },
            onError: () => toast.error('Rol bijwerken mislukt'),
        });
    }

    return (
        <DialogContent>
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>Rol bewerken</DialogTitle>
                    <DialogDescription>Wijzig de rol voor {member.name}.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="role">Rol</Label>
                        <Select value={data.role} onValueChange={(value) => setData('role', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecteer een rol" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.value === 'admin' ? 'Beheerder' : 'Medewerker'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.role} />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="submit" disabled={processing}>
                        Wijzigingen opslaan
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
