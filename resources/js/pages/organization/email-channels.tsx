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
import { type EmailChannel, type EmailProviderOption } from '@/types';
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
    systemEmailChannelId: number | null;
    systemEmailsEnabled: boolean;
}

export default function EmailChannels({ channels, providers, systemEmailChannelId, systemEmailsEnabled: initialSystemEmailsEnabled }: Props) {
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
                    <Card className={!isSystemEmailsEnabled ? 'border-amber-500 bg-amber-50/50 dark:border-amber-600 dark:bg-amber-950/20' : ''}>
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${!isSystemEmailsEnabled ? 'bg-amber-500/20' : 'bg-muted'}`}>
                                        {!isSystemEmailsEnabled ? (
                                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        ) : (
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Alle uitgaande e-mails</p>
                                        <p className="text-xs text-muted-foreground">
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

                    {/* System Email Card - Compact inline design */}
                    <Card>
                        <CardContent className="py-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                        <Send className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Systeem e-mails</p>
                                        <p className="text-xs text-muted-foreground">Uitnodigingen & notificaties</p>
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

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">E-mailaccounts</CardTitle>
                                    <CardDescription>
                                        Koppel e-mailaccounts om automatisch tickets aan te maken uit inkomende e-mails.
                                    </CardDescription>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Account toevoegen
                                        </Button>
                                    </DialogTrigger>
                                    <EmailChannelFormDialog
                                        providers={providers}
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
                                <div className="space-y-4">
                                    {channels.map((channel) => (
                                        <EmailChannelItem
                                            key={channel.id}
                                            channel={channel}
                                            providers={providers}
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
    isEditing,
    onEdit,
    onEditClose,
    onDelete,
}: {
    channel: EmailChannel;
    providers: EmailProviderOption[];
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

    return (
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{channel.name}</span>
                        {channel.is_default && (
                            <Badge variant="secondary" className="text-xs">
                                Standaard
                            </Badge>
                        )}
                        {channel.is_active ? (
                            <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Actief
                            </Badge>
                        ) : channel.email_address && !channel.fetch_folder ? (
                            <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs">
                                <Settings className="mr-1 h-3 w-3" />
                                Configuratie nodig
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">
                                <AlertCircle className="mr-1 h-3 w-3" />
                                Wacht op koppeling
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{channel.email_address || 'Niet gekoppeld'}</span>
                        <span>•</span>
                        <span>{providerLabel}</span>
                        {channel.last_sync_at && (
                            <>
                                <span>•</span>
                                <span>
                                    Laatste sync:{' '}
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
                            <XCircle className="h-3 w-3" />
                            <span>{channel.last_sync_error}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {channel.is_active && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncNow}
                        disabled={isSyncing}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sync nu
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
                            className="text-destructive"
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
    onClose,
}: {
    channel?: EmailChannel;
    providers: EmailProviderOption[];
    onClose: () => void;
}) {
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: channel?.name || '',
        provider: channel?.provider || 'microsoft365',
        is_default: channel?.is_default || false,
        is_active: channel?.is_active ?? true,
        auto_reply_enabled: channel?.auto_reply_enabled || false,
    });

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
        <DialogContent className="sm:max-w-[425px]">
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
                                        <SelectItem key={provider.value} value={provider.value}>
                                            {provider.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.provider} />
                        </div>
                    )}

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_default"
                            checked={data.is_default}
                            onCheckedChange={(checked) => setData('is_default', checked === true)}
                        />
                        <Label htmlFor="is_default" className="font-normal">
                            Instellen als standaard e-mailaccount
                        </Label>
                    </div>

                    {channel && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_active"
                                checked={data.is_active}
                                onCheckedChange={(checked) => setData('is_active', checked === true)}
                            />
                            <Label htmlFor="is_active" className="font-normal">
                                Account is actief
                            </Label>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {channel ? 'Wijzigingen opslaan' : 'Account toevoegen'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
