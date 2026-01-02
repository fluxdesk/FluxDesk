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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { store, update, destroy, test, logs, autoReply, configure } from '@/routes/organization/messaging-channels';
import { redirect as oauthRedirect } from '@/routes/organization/messaging-channels/oauth';
import { type Department, type MessagingChannel, type MessagingProviderOption, type AutoReplyVariable } from '@/types';
import { Head, useForm, router, Link } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ExternalLink,
    FileText,
    MessageCircle,
    MoreVertical,
    Pencil,
    Plus,
    Settings,
    Trash2,
    XCircle,
    MessageSquare,
    Instagram,
    Facebook,
    Phone,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelative } from '@/lib/date';

interface Props {
    channels: MessagingChannel[];
    providers: MessagingProviderOption[];
    departments: Department[];
    autoReplyVariables: AutoReplyVariable[];
}

const providerIcons: Record<string, React.ElementType> = {
    instagram: Instagram,
    facebook_messenger: Facebook,
    whatsapp: Phone,
    wechat: MessageSquare,
    livechat: MessageCircle,
};

export default function MessagingChannels({ channels, providers, departments, autoReplyVariables }: Props) {
    const { t } = useTranslation('organization');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingChannel, setEditingChannel] = useState<MessagingChannel | null>(null);
    const [autoReplyChannel, setAutoReplyChannel] = useState<MessagingChannel | null>(null);
    const [deletingChannel, setDeletingChannel] = useState<MessagingChannel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!deletingChannel) return;
        setIsDeleting(true);
        router.delete(destroy(deletingChannel.id).url, {
            onSuccess: () => {
                toast.success(t('messaging_channels.deleted'));
                setDeletingChannel(null);
            },
            onError: () => toast.error(t('messaging_channels.delete_failed')),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AppLayout>
            <Head title={t('messaging_channels.page_title')} />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <MessageCircle className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{t('messaging_channels.title')}</CardTitle>
                                        <CardDescription>
                                            {t('messaging_channels.description')}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('messaging_channels.add')}
                                        </Button>
                                    </DialogTrigger>
                                    <MessagingChannelFormDialog
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
                                    <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">{t('messaging_channels.empty_title')}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {t('messaging_channels.empty_description')}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {channels.map((channel) => (
                                        <MessagingChannelItem
                                            key={channel.id}
                                            channel={channel}
                                            providers={providers}
                                            departments={departments}
                                            autoReplyVariables={autoReplyVariables}
                                            isEditing={editingChannel?.id === channel.id}
                                            isEditingAutoReply={autoReplyChannel?.id === channel.id}
                                            onEdit={() => setEditingChannel(channel)}
                                            onEditClose={() => setEditingChannel(null)}
                                            onEditAutoReply={() => setAutoReplyChannel(channel)}
                                            onEditAutoReplyClose={() => setAutoReplyChannel(null)}
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
                    title={t('messaging_channels.delete_title')}
                    description={t('messaging_channels.delete_description', { name: deletingChannel?.name })}
                    confirmLabel={t('common.delete')}
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function MessagingChannelItem({
    channel,
    providers,
    departments,
    autoReplyVariables,
    isEditing,
    isEditingAutoReply,
    onEdit,
    onEditClose,
    onEditAutoReply,
    onEditAutoReplyClose,
    onDelete,
}: {
    channel: MessagingChannel;
    providers: MessagingProviderOption[];
    departments: Department[];
    autoReplyVariables: AutoReplyVariable[];
    isEditing: boolean;
    isEditingAutoReply: boolean;
    onEdit: () => void;
    onEditClose: () => void;
    onEditAutoReply: () => void;
    onEditAutoReplyClose: () => void;
    onDelete: () => void;
}) {
    const { t } = useTranslation('organization');
    const [isTesting, setIsTesting] = useState(false);

    const handleTestConnection = () => {
        setIsTesting(true);
        router.post(
            test(channel.id).url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success(t('messaging_channels.connection_tested')),
                onError: () => toast.error(t('messaging_channels.connection_test_failed')),
                onFinish: () => setIsTesting(false),
            },
        );
    };

    const handleReconnect = () => {
        window.location.href = oauthRedirect(channel.id).url;
    };

    const providerLabel = providers.find((p) => p.value === channel.provider)?.label || channel.provider;
    const ProviderIcon = providerIcons[channel.provider] || MessageCircle;

    const getStatusBadge = () => {
        if (channel.is_active) {
            return (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {t('messaging_channels.status.active')}
                </Badge>
            );
        }
        if (channel.external_id) {
            return (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
                    <Settings className="mr-1 h-3 w-3" />
                    {t('messaging_channels.status.needs_configuration')}
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                <AlertCircle className="mr-1 h-3 w-3" />
                {t('messaging_channels.status.awaiting_connection')}
            </Badge>
        );
    };

    return (
        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ProviderIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{channel.name}</span>
                        {channel.is_default && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                                {t('messaging_channels.badges.default')}
                            </Badge>
                        )}
                        {channel.auto_reply_enabled && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                                {t('messaging_channels.badges.auto_reply')}
                            </Badge>
                        )}
                        {getStatusBadge()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <span className="truncate">
                            {channel.external_username
                                ? `@${channel.external_username}`
                                : channel.external_name || t('messaging_channels.not_connected')}
                        </span>
                        <span className="shrink-0">•</span>
                        <span className="shrink-0">{providerLabel}</span>
                        {channel.department && (
                            <>
                                <span className="shrink-0">•</span>
                                <span className="shrink-0">{channel.department.name}</span>
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
                                    {t('messaging_channels.actions.edit')}
                                </DropdownMenuItem>
                            </DialogTrigger>
                            <MessagingChannelFormDialog
                                channel={channel}
                                providers={providers}
                                departments={departments}
                                onClose={onEditClose}
                            />
                        </Dialog>

                        {channel.external_id && (
                            <DropdownMenuItem asChild>
                                <Link href={configure(channel.id).url}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    {t('messaging_channels.actions.configure')}
                                </Link>
                            </DropdownMenuItem>
                        )}

                        <Dialog open={isEditingAutoReply} onOpenChange={(open) => (open ? onEditAutoReply() : onEditAutoReplyClose())}>
                            <DialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    {t('messaging_channels.actions.auto_reply')}
                                </DropdownMenuItem>
                            </DialogTrigger>
                            <AutoReplyDialog
                                channel={channel}
                                variables={autoReplyVariables}
                                onClose={onEditAutoReplyClose}
                            />
                        </Dialog>

                        {channel.is_active && (
                            <DropdownMenuItem onClick={handleTestConnection} disabled={isTesting}>
                                <Check className="mr-2 h-4 w-4" />
                                {t('messaging_channels.actions.test_connection')}
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuItem asChild>
                            <Link href={logs(channel.id).url}>
                                <FileText className="mr-2 h-4 w-4" />
                                {t('messaging_channels.actions.logs')}
                            </Link>
                        </DropdownMenuItem>

                        {!channel.is_active && !channel.external_id && (
                            <DropdownMenuItem onClick={handleReconnect}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                {t('messaging_channels.actions.reconnect')}
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={onDelete}
                            disabled={channel.is_default}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('messaging_channels.actions.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

function MessagingChannelFormDialog({
    channel,
    providers,
    departments,
    onClose,
}: {
    channel?: MessagingChannel;
    providers: MessagingProviderOption[];
    departments: Department[];
    onClose: () => void;
}) {
    const { t } = useTranslation('organization');

    const defaultProvider = channel?.provider
        || providers.find((p) => p.available)?.value
        || 'instagram';

    const defaultDepartmentId = channel?.department_id?.toString()
        || departments[0]?.id?.toString()
        || '';

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: channel?.name || '',
        provider: defaultProvider,
        department_id: defaultDepartmentId,
        is_default: channel?.is_default || false,
        is_active: channel?.is_active ?? true,
    });

    const selectedProviderAvailable = providers.find((p) => p.value === data.provider)?.available ?? true;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (channel) {
            patch(update(channel.id).url, {
                onSuccess: () => {
                    toast.success(t('messaging_channels.form.updated'));
                    reset();
                    onClose();
                },
                onError: () => toast.error(t('messaging_channels.form.update_failed')),
            });
        } else {
            post(store().url, {
                onSuccess: () => {
                    toast.success(t('messaging_channels.form.created'));
                    reset();
                    onClose();
                },
                onError: () => toast.error(t('messaging_channels.form.create_failed')),
            });
        }
    }

    return (
        <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>
                        {channel ? t('messaging_channels.form.edit_title') : t('messaging_channels.form.create_title')}
                    </DialogTitle>
                    <DialogDescription>
                        {channel
                            ? t('messaging_channels.form.edit_description')
                            : t('messaging_channels.form.create_description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('messaging_channels.form.name_label')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('messaging_channels.form.name_placeholder')}
                            autoFocus
                        />
                        <InputError message={errors.name} />
                    </div>

                    {!channel && (
                        <div className="grid gap-2">
                            <Label htmlFor="provider">{t('messaging_channels.form.provider_label')}</Label>
                            <Select
                                value={data.provider}
                                onValueChange={(value) => setData('provider', value as typeof data.provider)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('messaging_channels.form.provider_placeholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {providers.map((provider) => (
                                        <SelectItem
                                            key={provider.value}
                                            value={provider.value}
                                            disabled={!provider.available}
                                        >
                                            <span className={!provider.available ? 'text-muted-foreground' : ''}>
                                                {provider.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!selectedProviderAvailable && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    {providers.find((p) => p.value === data.provider)?.hint}
                                </p>
                            )}
                            <InputError message={errors.provider} />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="department">{t('messaging_channels.form.department_label')}</Label>
                        <Select
                            value={data.department_id}
                            onValueChange={(value) => setData('department_id', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('messaging_channels.form.department_placeholder')} />
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
                            {t('messaging_channels.form.department_help')}
                        </p>
                        <InputError message={errors.department_id} />
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
                            <span className="font-medium">{t('messaging_channels.form.is_default')}</span>
                            <p className="text-xs text-muted-foreground">
                                {t('messaging_channels.form.is_default_description')}
                            </p>
                        </div>
                    </label>

                    {channel && (
                        <label
                            htmlFor="is_active"
                            className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                        >
                            <Checkbox
                                id="is_active"
                                checked={data.is_active}
                                onCheckedChange={(checked) => setData('is_active', checked === true)}
                                className="mt-0.5"
                            />
                            <div className="space-y-1">
                                <span className="font-medium">{t('messaging_channels.form.is_active')}</span>
                                <p className="text-xs text-muted-foreground">
                                    {t('messaging_channels.form.is_active_description')}
                                </p>
                            </div>
                        </label>
                    )}
                </div>

                <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !data.name.trim() || (!channel && !selectedProviderAvailable)}
                    >
                        {channel ? t('common.save') : t('messaging_channels.add')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

function AutoReplyDialog({
    channel,
    variables,
    onClose,
}: {
    channel: MessagingChannel;
    variables: AutoReplyVariable[];
    onClose: () => void;
}) {
    const { t } = useTranslation('organization');

    const { data, setData, patch, processing, errors } = useForm({
        auto_reply_enabled: channel.auto_reply_enabled,
        auto_reply_message: channel.auto_reply_message || '',
        auto_reply_business_hours_only: channel.auto_reply_business_hours_only,
        auto_reply_delay_seconds: channel.auto_reply_delay_seconds,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(autoReply(channel.id).url, {
            onSuccess: () => {
                toast.success(t('messaging_channels.auto_reply.saved'));
                onClose();
            },
            onError: () => toast.error(t('messaging_channels.auto_reply.save_failed')),
        });
    }

    const insertVariable = (variable: string) => {
        setData('auto_reply_message', data.auto_reply_message + `{{${variable}}}`);
    };

    return (
        <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{t('messaging_channels.auto_reply.title')}</DialogTitle>
                    <DialogDescription>
                        {t('messaging_channels.auto_reply.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="auto_reply_enabled">{t('messaging_channels.auto_reply.enable')}</Label>
                        <Switch
                            id="auto_reply_enabled"
                            checked={data.auto_reply_enabled}
                            onCheckedChange={(checked) => setData('auto_reply_enabled', checked)}
                        />
                    </div>

                    {data.auto_reply_enabled && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="auto_reply_message">{t('messaging_channels.auto_reply.message_label')}</Label>
                                <Textarea
                                    id="auto_reply_message"
                                    value={data.auto_reply_message}
                                    onChange={(e) => setData('auto_reply_message', e.target.value)}
                                    placeholder={t('messaging_channels.auto_reply.message_placeholder')}
                                    rows={4}
                                />
                                <InputError message={errors.auto_reply_message} />
                            </div>

                            <div className="grid gap-2">
                                <Label>{t('messaging_channels.auto_reply.variables_label')}</Label>
                                <div className="flex flex-wrap gap-2">
                                    {variables.map((v) => (
                                        <button
                                            key={v.variable}
                                            type="button"
                                            onClick={() => insertVariable(v.variable)}
                                            className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium transition-colors hover:bg-muted/80"
                                            title={v.example}
                                        >
                                            {`{{${v.variable}}}`}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t('messaging_channels.auto_reply.variables_help')}
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="auto_reply_delay_seconds">{t('messaging_channels.auto_reply.delay_label')}</Label>
                                <Input
                                    id="auto_reply_delay_seconds"
                                    type="number"
                                    min={0}
                                    max={3600}
                                    value={data.auto_reply_delay_seconds}
                                    onChange={(e) => setData('auto_reply_delay_seconds', parseInt(e.target.value) || 0)}
                                    className="max-w-[150px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('messaging_channels.auto_reply.delay_help')}
                                </p>
                                <InputError message={errors.auto_reply_delay_seconds} />
                            </div>

                            <label
                                htmlFor="auto_reply_business_hours_only"
                                className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                            >
                                <Checkbox
                                    id="auto_reply_business_hours_only"
                                    checked={data.auto_reply_business_hours_only}
                                    onCheckedChange={(checked) => setData('auto_reply_business_hours_only', checked === true)}
                                    className="mt-0.5"
                                />
                                <div className="space-y-1">
                                    <span className="font-medium">{t('messaging_channels.auto_reply.business_hours_only')}</span>
                                    <p className="text-xs text-muted-foreground">
                                        {t('messaging_channels.auto_reply.business_hours_only_description')}
                                    </p>
                                </div>
                            </label>
                        </>
                    )}
                </div>

                <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
