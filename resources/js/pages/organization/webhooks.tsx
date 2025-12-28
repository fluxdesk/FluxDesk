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
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import {
    store,
    update,
    destroy,
    toggle,
    test,
    regenerateSecret,
    secret as getSecret,
    deliveries as getDeliveries,
} from '@/routes/organization/webhooks';
import { Webhook, WebhookEventOption, WebhookDelivery, WebhookFormatOption, WebhookFormatType } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Head, useForm, router } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    Copy,
    Eye,
    EyeOff,
    History,
    Key,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    Send,
    Trash2,
    Webhook as WebhookIcon,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Props {
    webhooks: Webhook[];
    availableEvents: WebhookEventOption[];
    availableFormats: WebhookFormatOption[];
}

export default function Webhooks({ webhooks, availableEvents, availableFormats }: Props) {
    const [creatingWebhook, setCreatingWebhook] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
    const [deletingWebhook, setDeletingWebhook] = useState<Webhook | null>(null);
    const [viewingSecret, setViewingSecret] = useState<Webhook | null>(null);
    const [viewingDeliveries, setViewingDeliveries] = useState<Webhook | null>(null);
    const [regeneratingSecret, setRegeneratingSecret] = useState<Webhook | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!deletingWebhook) return;
        setIsDeleting(true);
        router.delete(destroy(deletingWebhook.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Webhook verwijderd');
                setDeletingWebhook(null);
            },
            onError: () => toast.error('Webhook verwijderen mislukt'),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AppLayout>
            <Head title="Webhooks" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <WebhookIcon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Webhooks</CardTitle>
                                        <CardDescription>
                                            Ontvang HTTP-notificaties voor ticket- en berichtgebeurtenissen
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button onClick={() => setCreatingWebhook(true)}>
                                    <Plus className="h-4 w-4" />
                                    Webhook toevoegen
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {webhooks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <WebhookIcon className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">Geen webhooks</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Voeg een webhook toe om notificaties te ontvangen wanneer tickets worden aangemaakt of bijgewerkt.
                                    </p>
                                    <Button className="mt-4" onClick={() => setCreatingWebhook(true)}>
                                        <Plus className="h-4 w-4" />
                                        Webhook toevoegen
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {webhooks.map((webhook) => (
                                        <WebhookItem
                                            key={webhook.id}
                                            webhook={webhook}
                                            onEdit={() => setEditingWebhook(webhook)}
                                            onDelete={() => setDeletingWebhook(webhook)}
                                            onViewSecret={() => setViewingSecret(webhook)}
                                            onViewDeliveries={() => setViewingDeliveries(webhook)}
                                            onRegenerateSecret={() => setRegeneratingSecret(webhook)}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Create Dialog */}
                <WebhookFormDialog
                    open={creatingWebhook}
                    onClose={() => setCreatingWebhook(false)}
                    availableEvents={availableEvents}
                    availableFormats={availableFormats}
                />

                {/* Edit Dialog */}
                {editingWebhook && (
                    <WebhookFormDialog
                        open={!!editingWebhook}
                        onClose={() => setEditingWebhook(null)}
                        webhook={editingWebhook}
                        availableEvents={availableEvents}
                        availableFormats={availableFormats}
                    />
                )}

                {/* Secret Dialog */}
                {viewingSecret && (
                    <SecretDialog
                        webhook={viewingSecret}
                        open={!!viewingSecret}
                        onClose={() => setViewingSecret(null)}
                        onRegenerate={() => {
                            setViewingSecret(null);
                            setRegeneratingSecret(viewingSecret);
                        }}
                    />
                )}

                {/* Deliveries Dialog */}
                {viewingDeliveries && (
                    <DeliveriesDialog
                        webhook={viewingDeliveries}
                        open={!!viewingDeliveries}
                        onClose={() => setViewingDeliveries(null)}
                    />
                )}

                {/* Delete Confirmation */}
                <ConfirmationDialog
                    open={!!deletingWebhook}
                    onOpenChange={(open) => !open && setDeletingWebhook(null)}
                    title="Webhook verwijderen"
                    description={`Weet je zeker dat je de webhook "${deletingWebhook?.name}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
                    confirmLabel="Verwijderen"
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />

                {/* Regenerate Secret Confirmation */}
                <ConfirmationDialog
                    open={!!regeneratingSecret}
                    onOpenChange={(open) => !open && setRegeneratingSecret(null)}
                    title="Nieuwe secret genereren"
                    description="Weet je zeker dat je een nieuwe signing secret wilt genereren? Je moet de nieuwe secret bijwerken in je systeem dat de webhooks ontvangt."
                    confirmLabel="Genereren"
                    onConfirm={() => {
                        if (!regeneratingSecret) return;
                        router.post(regenerateSecret(regeneratingSecret.id).url, {}, {
                            preserveScroll: true,
                            onSuccess: () => {
                                toast.success('Nieuwe signing secret gegenereerd');
                                setRegeneratingSecret(null);
                            },
                            onError: () => toast.error('Secret genereren mislukt'),
                        });
                    }}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function WebhookItem({
    webhook,
    onEdit,
    onDelete,
    onViewSecret,
    onViewDeliveries,
    onRegenerateSecret,
}: {
    webhook: Webhook;
    onEdit: () => void;
    onDelete: () => void;
    onViewSecret: () => void;
    onViewDeliveries: () => void;
    onRegenerateSecret: () => void;
}) {
    const [isToggling, setIsToggling] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const handleToggle = () => {
        setIsToggling(true);
        router.post(
            toggle(webhook.id).url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    const message = webhook.is_active
                        ? 'Webhook gedeactiveerd'
                        : 'Webhook geactiveerd';
                    toast.success(message);
                },
                onError: () => toast.error('Status wijzigen mislukt'),
                onFinish: () => setIsToggling(false),
            },
        );
    };

    const handleTest = () => {
        setIsTesting(true);
        router.post(
            test(webhook.id).url,
            {},
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const flash = (page.props as { flash?: { success?: string; error?: string } }).flash;
                    if (flash?.success) {
                        toast.success(flash.success);
                    } else if (flash?.error) {
                        toast.error(flash.error);
                    }
                },
                onError: () => toast.error('Test verzenden mislukt'),
                onFinish: () => setIsTesting(false),
            },
        );
    };

    const getStatusBadge = () => {
        if (webhook.was_auto_disabled) {
            return (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                    <XCircle className="mr-1 h-3 w-3" />
                    Uitgeschakeld (fouten)
                </Badge>
            );
        }

        if (webhook.is_active) {
            return (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Actief
                </Badge>
            );
        }

        return (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                <AlertCircle className="mr-1 h-3 w-3" />
                Inactief
            </Badge>
        );
    };

    const truncateUrl = (url: string, maxLength = 50) => {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    };

    return (
        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <WebhookIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{webhook.name}</span>
                        {getStatusBadge()}
                        <Badge variant="secondary" className="text-xs">
                            {webhook.events.length} {webhook.events.length === 1 ? 'event' : 'events'}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate" title={webhook.url}>
                        {truncateUrl(webhook.url)}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {webhook.last_triggered_at && (
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Laatst: {formatDistanceToNow(new Date(webhook.last_triggered_at), { addSuffix: true, locale: nl })}
                            </span>
                        )}
                        {webhook.failure_count > 0 && !webhook.was_auto_disabled && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <AlertCircle className="h-3 w-3" />
                                {webhook.failure_count} mislukte pogingen
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-4">
                <div className="flex items-center gap-2">
                    <Label
                        htmlFor={`toggle-${webhook.id}`}
                        className="text-sm text-muted-foreground cursor-pointer"
                    >
                        {webhook.is_active ? 'Aan' : 'Uit'}
                    </Label>
                    <Switch
                        id={`toggle-${webhook.id}`}
                        checked={webhook.is_active}
                        onCheckedChange={handleToggle}
                        disabled={isToggling}
                    />
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acties</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEdit}>
                            <Pencil className="h-4 w-4" />
                            Bewerken
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleTest} disabled={isTesting}>
                            {isTesting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            Test verzenden
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onViewDeliveries}>
                            <History className="h-4 w-4" />
                            Leveringsgeschiedenis
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onViewSecret}>
                            <Key className="h-4 w-4" />
                            Signing secret
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onRegenerateSecret}>
                            <RefreshCw className="h-4 w-4" />
                            Secret vernieuwen
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                            Verwijderen
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

function WebhookFormDialog({
    open,
    onClose,
    webhook,
    availableEvents,
    availableFormats,
}: {
    open: boolean;
    onClose: () => void;
    webhook?: Webhook;
    availableEvents: WebhookEventOption[];
    availableFormats: WebhookFormatOption[];
}) {
    const isEditing = !!webhook;
    const [eventsOpen, setEventsOpen] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: webhook?.name || '',
        url: webhook?.url || '',
        events: webhook?.events || [] as string[],
        format: webhook?.format || 'standard' as WebhookFormatType,
        description: webhook?.description || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditing) {
            patch(update(webhook.id).url, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Webhook bijgewerkt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('Bijwerken mislukt'),
            });
        } else {
            post(store().url, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Webhook aangemaakt');
                    reset();
                    onClose();
                },
                onError: () => toast.error('Aanmaken mislukt'),
            });
        }
    };

    const handleTest = () => {
        if (!webhook) return;
        setIsTesting(true);
        router.post(
            test(webhook.id).url,
            {},
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const flash = (page.props as { flash?: { success?: string; error?: string } }).flash;
                    if (flash?.success) {
                        toast.success(flash.success);
                    } else if (flash?.error) {
                        toast.error(flash.error);
                    }
                },
                onError: () => toast.error('Test verzenden mislukt'),
                onFinish: () => setIsTesting(false),
            },
        );
    };

    const toggleEvent = (eventValue: string) => {
        setData('events',
            data.events.includes(eventValue)
                ? data.events.filter(e => e !== eventValue)
                : [...data.events, eventValue]
        );
    };

    const getSelectedEventsLabel = () => {
        if (data.events.length === 0) return 'Selecteer events...';
        if (data.events.length === 1) {
            const event = availableEvents.find(e => e.value === data.events[0]);
            return event?.label || '1 event';
        }
        if (data.events.length === availableEvents.length) return 'Alle events';
        return `${data.events.length} events geselecteerd`;
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <WebhookIcon className="h-5 w-5" />
                        {isEditing ? 'Webhook bewerken' : 'Webhook toevoegen'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Wijzig de webhook instellingen.'
                            : 'Voeg een nieuwe webhook toe om notificaties te ontvangen.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Naam</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Mijn webhook"
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="url">URL</Label>
                            <Input
                                id="url"
                                type="url"
                                value={data.url}
                                onChange={(e) => setData('url', e.target.value)}
                                placeholder="https://example.com/webhook"
                            />
                            <InputError message={errors.url} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Events</Label>
                            <Popover open={eventsOpen} onOpenChange={setEventsOpen} modal={false}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={eventsOpen}
                                        className="w-full justify-between font-normal"
                                    >
                                        <span className={data.events.length === 0 ? 'text-muted-foreground' : ''}>
                                            {getSelectedEventsLabel()}
                                        </span>
                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[--radix-popover-trigger-width] p-1"
                                    align="start"
                                    onWheel={(e) => e.stopPropagation()}
                                >
                                    <div className="max-h-60 overflow-y-auto overscroll-contain">
                                        {availableEvents.map((event) => (
                                            <div
                                                key={event.value}
                                                className="flex items-start gap-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent"
                                                onClick={() => toggleEvent(event.value)}
                                            >
                                                <Checkbox
                                                    checked={data.events.includes(event.value)}
                                                    className="mt-0.5"
                                                />
                                                <div className="grid gap-0.5">
                                                    <span className="text-sm font-medium leading-none">
                                                        {event.label}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {event.description}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <InputError message={errors.events} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="format">Formaat</Label>
                            <Select
                                value={data.format}
                                onValueChange={(value) => setData('format', value as WebhookFormatType)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecteer formaat..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableFormats.map((format) => (
                                        <SelectItem key={format.value} value={format.value}>
                                            {format.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {availableFormats.find(f => f.value === data.format)?.description}
                            </p>
                            <InputError message={errors.format} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Beschrijving (optioneel)</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Een korte beschrijving van deze webhook..."
                                rows={2}
                            />
                            <InputError message={errors.description} />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        {isEditing && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleTest}
                                disabled={isTesting}
                                className="sm:mr-auto"
                            >
                                {isTesting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Test verzenden
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose}>
                            Annuleren
                        </Button>
                        <Button type="submit" disabled={processing || data.events.length === 0}>
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {isEditing ? 'Opslaan' : 'Toevoegen'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SecretDialog({
    webhook,
    open,
    onClose,
    onRegenerate,
}: {
    webhook: Webhook;
    open: boolean;
    onClose: () => void;
    onRegenerate: () => void;
}) {
    const [secret, setSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchSecret = async () => {
        setLoading(true);
        try {
            const response = await fetch(getSecret(webhook.id).url);
            const data = await response.json();
            setSecret(data.secret);
            setRevealed(true);
        } catch {
            toast.error('Secret ophalen mislukt');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (secret) {
            navigator.clipboard.writeText(secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Secret gekopieerd');
        }
    };

    const handleClose = () => {
        setSecret(null);
        setRevealed(false);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Signing Secret
                    </DialogTitle>
                    <DialogDescription>
                        Gebruik deze secret om webhook payloads te verifiëren. De signature wordt meegestuurd in de <code className="text-xs bg-muted px-1 rounded">X-Webhook-Signature</code> header.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-lg border bg-muted/50 p-3 font-mono text-sm break-all">
                            {revealed && secret ? secret : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                        </div>
                        {revealed && secret ? (
                            <Button variant="outline" size="icon" onClick={copyToClipboard}>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        ) : (
                            <Button variant="outline" size="icon" onClick={fetchSecret} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                    {revealed && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => { setRevealed(false); setSecret(null); }}
                        >
                            <EyeOff className="h-4 w-4" />
                            Verbergen
                        </Button>
                    )}
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" onClick={handleClose}>
                        Sluiten
                    </Button>
                    <Button type="button" variant="destructive" onClick={onRegenerate}>
                        <RefreshCw className="h-4 w-4" />
                        Nieuwe secret genereren
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeliveriesDialog({
    webhook,
    open,
    onClose,
}: {
    webhook: Webhook;
    open: boolean;
    onClose: () => void;
}) {
    const [deliveries, setDeliveries] = useState<WebhookDelivery[]>(webhook.recent_deliveries || []);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetchDeliveries = async () => {
        setLoading(true);
        try {
            const response = await fetch(getDeliveries(webhook.id).url);
            const data = await response.json();
            setDeliveries(data.deliveries);
        } catch {
            toast.error('Leveringen ophalen mislukt');
        } finally {
            setLoading(false);
        }
    };

    const getEventLabel = (eventType: string) => {
        const labels: Record<string, string> = {
            'ticket.created': 'Nieuw ticket',
            'ticket.status_changed': 'Status gewijzigd',
            'ticket.priority_changed': 'Prioriteit gewijzigd',
            'ticket.assigned': 'Toegewezen',
            'ticket.sla_changed': 'SLA gewijzigd',
            'message.created': 'Nieuw bericht',
            'message.reply_received': 'Klantreactie',
            'test': 'Test',
        };
        return labels[eventType] || eventType;
    };

    const toggleExpanded = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Leveringsgeschiedenis
                    </DialogTitle>
                    <DialogDescription>
                        De laatste 50 webhook leveringen voor "{webhook.name}".
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex justify-end mb-4">
                        <Button variant="outline" size="sm" onClick={fetchDeliveries} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Verversen
                        </Button>
                    </div>

                    {deliveries.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nog geen leveringen
                        </div>
                    ) : (
                        <div className="max-h-96 overflow-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Event</th>
                                        <th className="px-3 py-2 text-left font-medium">Status</th>
                                        <th className="px-3 py-2 text-left font-medium">Duur</th>
                                        <th className="px-3 py-2 text-left font-medium">Tijd</th>
                                        <th className="px-3 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {deliveries.map((delivery) => (
                                        <>
                                            <tr
                                                key={delivery.id}
                                                className="hover:bg-muted/50 cursor-pointer"
                                                onClick={() => toggleExpanded(delivery.id)}
                                            >
                                                <td className="px-3 py-2">
                                                    {getEventLabel(delivery.event_type)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {delivery.success ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            {delivery.response_status}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                                            <XCircle className="h-3.5 w-3.5" />
                                                            {delivery.response_status || 'Fout'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {delivery.duration_ms ? `${delivery.duration_ms}ms` : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true, locale: nl })}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === delivery.id ? 'rotate-180' : ''}`} />
                                                </td>
                                            </tr>
                                            {expandedId === delivery.id && (
                                                <tr key={`${delivery.id}-details`}>
                                                    <td colSpan={5} className="px-3 py-3 bg-muted/30">
                                                        <div className="space-y-2">
                                                            {delivery.error && (
                                                                <div>
                                                                    <span className="text-xs font-medium text-muted-foreground">Fout:</span>
                                                                    <pre className="mt-1 text-xs bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 p-2 rounded overflow-auto max-h-24">
                                                                        {delivery.error}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                            {delivery.response_body && (
                                                                <div>
                                                                    <span className="text-xs font-medium text-muted-foreground">Response:</span>
                                                                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap break-all">
                                                                        {delivery.response_body}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                            {!delivery.error && !delivery.response_body && (
                                                                <span className="text-xs text-muted-foreground">Geen response details beschikbaar</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Sluiten
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
