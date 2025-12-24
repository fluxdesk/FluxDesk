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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { Switch } from '@/components/ui/switch';
import { store, update, destroy, test, sync, configure, logs, systemEmail, systemEmailsEnabled } from '@/routes/organization/email-channels';
import { redirect as oauthRedirect } from '@/routes/organization/email-channels/oauth';
import { type Department, type EmailChannel, type EmailProviderOption } from '@/types';
import { Head, useForm, router, Link } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    Check,
    CheckCircle2,
    ExternalLink,
    FileText,
    Mail,
    MoreVertical,
    Pencil,
    Plus,
    RefreshCw,
    Send,
    Settings,
    Trash2,
    XCircle,
    Inbox,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Props {
    channels: EmailChannel[];
    providers: EmailProviderOption[];
    departments: Department[];
    systemEmailChannelId: number | null;
    systemEmailsEnabled: boolean;
}

export default function EmailChannels({ channels, providers, departments, systemEmailChannelId, systemEmailsEnabled: initialSystemEmailsEnabled }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingChannel, setEditingChannel] = useState<EmailChannel | null>(null);
    const [deletingChannel, setDeletingChannel] = useState<EmailChannel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedSystemChannel, setSelectedSystemChannel] = useState(
        systemEmailChannelId?.toString() || 'default'
    );
    const [isSavingSystemEmail, setIsSavingSystemEmail] = useState(false);
    const [isSystemEmailsEnabled, setIsSystemEmailsEnabled] = useState(initialSystemEmailsEnabled);

    const handleDelete = () => {
        if (!deletingChannel) return;
        setIsDeleting(true);
        router.delete(destroy(deletingChannel.id).url, {
            onSuccess: () => {
                toast.success('E-mailaccount verwijderd');
                setDeletingChannel(null);
            },
            onError: () => toast.error('E-mailaccount verwijderen mislukt'),
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleSaveSystemEmail = () => {
        setIsSavingSystemEmail(true);
        router.patch(
            systemEmail().url,
            { system_email_channel_id: selectedSystemChannel },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Systeeme-mail instellingen opgeslagen'),
                onError: () => toast.error('Opslaan mislukt'),
                onFinish: () => setIsSavingSystemEmail(false),
            }
        );
    };

    const handleToggleSystemEmails = () => {
        const newValue = !isSystemEmailsEnabled;
        setIsSystemEmailsEnabled(newValue);
        router.patch(
            systemEmailsEnabled().url,
            { system_emails_enabled: newValue },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(newValue
                    ? 'Systeem e-mails ingeschakeld'
                    : 'Systeem e-mails uitgeschakeld'),
                onError: () => {
                    setIsSystemEmailsEnabled(!newValue);
                    toast.error('Instelling bijwerken mislukt');
                },
            }
        );
    };

    // Get active channels with OAuth for the system email dropdown
    const activeOAuthChannels = channels.filter(
        (c) => c.is_active && c.email_address && c.provider !== 'smtp'
    );

    return (
        <AppLayout>
            <Head title="E-mailaccounts" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    {/* System Emails Toggle - Migration Mode */}
                    <Card className={!isSystemEmailsEnabled ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20' : ''}>
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${!isSystemEmailsEnabled ? 'bg-amber-500/20' : 'bg-muted'}`}>
                                        {!isSystemEmailsEnabled ? (
                                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        ) : (
                                            <Mail className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">Alle uitgaande e-mails</p>
                                        <p className="text-sm text-muted-foreground">
                                            {!isSystemEmailsEnabled
                                                ? 'Uitgeschakeld - er worden geen e-mails verzonden'
                                                : 'Schakel uit tijdens migratie om duplicaten te voorkomen'}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={isSystemEmailsEnabled}
                                    onCheckedChange={handleToggleSystemEmails}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Email Card */}
                    <Card>
                        <CardContent className="py-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Send className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Systeem e-mails</p>
                                        <p className="text-sm text-muted-foreground">Uitnodigingen & notificaties</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-1 sm:justify-end">
                                    <Select
                                        value={selectedSystemChannel}
                                        onValueChange={setSelectedSystemChannel}
                                    >
                                        <SelectTrigger className="w-full sm:w-[280px]">
                                            <SelectValue placeholder="Selecteer verzendaccount" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">
                                                Standaard mailserver (.env)
                                            </SelectItem>
                                            {activeOAuthChannels.map((channel) => (
                                                <SelectItem key={channel.id} value={channel.id.toString()}>
                                                    {channel.name} {channel.email_address && `(${channel.email_address})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveSystemEmail}
                                        disabled={isSavingSystemEmail}
                                    >
                                        Opslaan
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Email Accounts Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Inbox className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">E-mailaccounts</CardTitle>
                                        <CardDescription>
                                            E-mails worden automatisch omgezet naar tickets
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
                                    <EmailChannelFormDialog
                                        providers={providers}
                                        departments={departments}
                                        onClose={() => setIsCreateOpen(false)}
                                    />
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {channels.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Mail className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">Geen e-mailaccounts</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Voeg een e-mailaccount toe om e-mails automatisch om te zetten in tickets.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {channels.map((channel) => (
                                        <EmailChannelItem
                                            key={channel.id}
                                            channel={channel}
                                            providers={providers}
                                            departments={departments}
                                            isEditing={editingChannel?.id === channel.id}
                                            onEdit={() => setEditingChannel(channel)}
                                            onEditClose={() => setEditingChannel(null)}
                                            onDelete={() => setDeletingChannel(channel)}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationDialog
                    open={!!deletingChannel}
                    onOpenChange={(open) => !open && setDeletingChannel(null)}
                    title="E-mailaccount verwijderen"
                    description={`Weet je zeker dat je "${deletingChannel?.name}" wilt verwijderen? Bestaande tickets blijven behouden maar nieuwe e-mails worden niet meer verwerkt.`}
                    confirmLabel="Verwijderen"
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function EmailChannelItem({
    channel,
    providers,
    departments,
    isEditing,
    onEdit,
    onEditClose,
    onDelete,
}: {
    channel: EmailChannel;
    providers: EmailProviderOption[];
    departments: Department[];
    isEditing: boolean;
    onEdit: () => void;
    onEditClose: () => void;
    onDelete: () => void;
}) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const handleTestConnection = () => {
        setIsTesting(true);
        router.post(
            test(channel.id).url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Verbinding getest'),
                onError: () => toast.error('Verbindingstest mislukt'),
                onFinish: () => setIsTesting(false),
            },
        );
    };

    const handleSyncNow = () => {
        setIsSyncing(true);
        router.post(
            sync(channel.id).url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Synchronisatie gestart'),
                onError: () => toast.error('Synchronisatie starten mislukt'),
                onFinish: () => setIsSyncing(false),
            },
        );
    };

    const handleReconnect = () => {
        window.location.href = oauthRedirect(channel.id).url;
    };

    const providerLabel = providers.find((p) => p.value === channel.provider)?.label || channel.provider;

    const getStatusBadge = () => {
        if (channel.is_active) {
            return (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Actief
                </Badge>
            );
        }
        if (channel.email_address && !channel.fetch_folder) {
            return (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
                    <Settings className="mr-1 h-3 w-3" />
                    Configuratie nodig
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                <AlertCircle className="mr-1 h-3 w-3" />
                Wacht op koppeling
            </Badge>
        );
    };

    return (
        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{channel.name}</span>
                        {channel.is_default && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                                Standaard
                            </Badge>
                        )}
                        {getStatusBadge()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <span className="truncate">{channel.email_address || 'Niet gekoppeld'}</span>
                        <span className="shrink-0">•</span>
                        <span className="shrink-0">{providerLabel}</span>
                        {channel.last_sync_at && (
                            <>
                                <span className="shrink-0">•</span>
                                <span className="shrink-0">
                                    Sync{' '}
                                    {formatDistanceToNow(new Date(channel.last_sync_at), {
                                        addSuffix: true,
                                        locale: nl,
                                    })}
                                </span>
                            </>
                        )}
                    </div>
                    {channel.last_sync_error && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                            <XCircle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{channel.last_sync_error}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-4">
                {channel.is_active && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncNow}
                        disabled={isSyncing}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sync
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <Dialog open={isEditing} onOpenChange={(open) => (open ? onEdit() : onEditClose())}>
                            <DialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Bewerken
                                </DropdownMenuItem>
                            </DialogTrigger>
                            <EmailChannelFormDialog
                                channel={channel}
                                providers={providers}
                                departments={departments}
                                onClose={onEditClose}
                            />
                        </Dialog>

                        {channel.email_address && (
                            <DropdownMenuItem asChild>
                                <Link href={configure(channel.id).url}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Configureren
                                </Link>
                            </DropdownMenuItem>
                        )}

                        {channel.is_active && (
                            <DropdownMenuItem onClick={handleTestConnection} disabled={isTesting}>
                                <Check className="mr-2 h-4 w-4" />
                                Test verbinding
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuItem asChild>
                            <Link href={logs(channel.id).url}>
                                <FileText className="mr-2 h-4 w-4" />
                                Logs
                            </Link>
                        </DropdownMenuItem>

                        {!channel.is_active && channel.provider !== 'smtp' && !channel.email_address && (
                            <DropdownMenuItem onClick={handleReconnect}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Opnieuw verbinden
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={onDelete}
                            disabled={channel.is_default}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Verwijderen
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

function EmailChannelFormDialog({
    channel,
    providers,
    departments,
    onClose,
}: {
    channel?: EmailChannel;
    providers: EmailProviderOption[];
    departments: Department[];
    onClose: () => void;
}) {
    // Default to first available provider, or microsoft365 if editing
    const defaultProvider = channel?.provider
        || providers.find((p) => p.available)?.value
        || 'microsoft365';

    // Default to the first department if creating
    const defaultDepartmentId = channel?.department_id?.toString()
        || departments[0]?.id?.toString()
        || '';

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: channel?.name || '',
        provider: defaultProvider,
        department_id: defaultDepartmentId,
        is_default: channel?.is_default || false,
        is_active: channel?.is_active ?? true,
        auto_reply_enabled: channel?.auto_reply_enabled || false,
    });

    // Check if the currently selected provider is available
    const selectedProviderAvailable = providers.find((p) => p.value === data.provider)?.available ?? true;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (channel) {
            patch(update(channel.id).url, {
                onSuccess: () => {
                    toast.success('E-mailaccount bijgewerkt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('E-mailaccount bijwerken mislukt'),
            });
        } else {
            post(store().url, {
                onSuccess: () => {
                    toast.success('E-mailaccount aangemaakt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('E-mailaccount aanmaken mislukt'),
            });
        }
    }

    return (
        <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>
                        {channel ? 'E-mailaccount bewerken' : 'E-mailaccount toevoegen'}
                    </DialogTitle>
                    <DialogDescription>
                        {channel
                            ? 'Werk de instellingen van het e-mailaccount bij.'
                            : 'Voeg een nieuw e-mailaccount toe om e-mails te ontvangen.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Naam</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="bijv. Support, Sales, Info"
                            autoFocus
                        />
                        <InputError message={errors.name} />
                    </div>

                    {!channel && (
                        <div className="grid gap-2">
                            <Label htmlFor="provider">Provider</Label>
                            <Select
                                value={data.provider}
                                onValueChange={(value) => setData('provider', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecteer een provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    {providers.map((provider) => (
                                        <SelectItem
                                            key={provider.value}
                                            value={provider.value}
                                            disabled={!provider.available}
                                        >
                                            <div className="flex flex-col">
                                                <span>{provider.label}</span>
                                                {!provider.available && provider.hint && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {provider.hint}
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.provider} />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="department">Afdeling</Label>
                        <Select
                            value={data.department_id}
                            onValueChange={(value) => setData('department_id', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecteer een afdeling" />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.map((department) => (
                                    <SelectItem key={department.id} value={department.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: department.color }}
                                            />
                                            {department.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Tickets uit dit e-mailaccount worden aan deze afdeling toegewezen
                        </p>
                        <InputError message={errors.department_id} />
                    </div>

                    <label
                        htmlFor="is_default"
                        className="flex items-start space-x-3 rounded-lg border border-border/50 p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                    >
                        <Checkbox
                            id="is_default"
                            checked={data.is_default}
                            onCheckedChange={(checked) => setData('is_default', checked === true)}
                            className="mt-0.5"
                        />
                        <div className="space-y-1">
                            <span className="font-medium">Standaard e-mailaccount</span>
                            <p className="text-xs text-muted-foreground">
                                Wordt gebruikt voor nieuwe tickets zonder specifiek e-mailkanaal
                            </p>
                        </div>
                    </label>

                    {channel && (
                        <label
                            htmlFor="is_active"
                            className="flex items-start space-x-3 rounded-lg border border-border/50 p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                        >
                            <Checkbox
                                id="is_active"
                                checked={data.is_active}
                                onCheckedChange={(checked) => setData('is_active', checked === true)}
                                className="mt-0.5"
                            />
                            <div className="space-y-1">
                                <span className="font-medium">Account is actief</span>
                                <p className="text-xs text-muted-foreground">
                                    Deactiveer om tijdelijk geen e-mails te ontvangen
                                </p>
                            </div>
                        </label>
                    )}
                </div>

                <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !data.name.trim() || (!channel && !selectedProviderAvailable)}
                    >
                        {channel ? 'Opslaan' : 'Toevoegen'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
