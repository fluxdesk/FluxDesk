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
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { store, test, toggle, destroy } from '@/routes/organization/integrations';
import { Head, useForm, router } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Copy,
    Eye,
    EyeOff,
    ExternalLink,
    Info,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plug,
    RefreshCw,
    Settings,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface CredentialField {
    name: string;
    label: string;
    type: 'text' | 'password';
    required: boolean;
    default?: string;
    hint?: string;
}

interface ConfiguredIntegration {
    id: number;
    is_active: boolean;
    is_verified: boolean;
    verified_at: string | null;
    is_configured: boolean;
}

interface Integration {
    identifier: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    auth_type: 'oauth' | 'api_key';
    is_oauth: boolean;
    credential_fields: CredentialField[];
    configured: ConfiguredIntegration | null;
}

const CATEGORY_ORDER = ['email', 'messaging', 'ai', 'general'];

interface Props {
    integrations: Integration[];
}

export default function Integrations({ integrations }: Props) {
    const { t } = useTranslation('organization');
    const [configuringIntegration, setConfiguringIntegration] = useState<Integration | null>(null);
    const [deletingIntegration, setDeletingIntegration] = useState<Integration | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Group integrations by category and sort within each group
    const groupedIntegrations = integrations.reduce<Record<string, Integration[]>>((acc, integration) => {
        const category = integration.category || 'general';
        if (!acc[category]) acc[category] = [];
        acc[category].push(integration);
        return acc;
    }, {});

    // Sort integrations within each category: active first, then verified, then configured
    Object.keys(groupedIntegrations).forEach((category) => {
        groupedIntegrations[category].sort((a, b) => {
            const getScore = (i: Integration) => {
                if (i.configured?.is_active && i.configured?.is_verified) return 4;
                if (i.configured?.is_verified) return 3;
                if (i.configured?.is_configured) return 2;
                if (i.configured) return 1;
                return 0;
            };
            return getScore(b) - getScore(a);
        });
    });

    // Get categories in defined order
    const sortedCategories = CATEGORY_ORDER.filter((cat) => groupedIntegrations[cat]?.length > 0);

    const handleDelete = () => {
        if (!deletingIntegration?.configured) return;
        setIsDeleting(true);
        router.delete(destroy(deletingIntegration.configured.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('integrations.deleted'));
                setDeletingIntegration(null);
            },
            onError: () => toast.error(t('integrations.delete_failed')),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AppLayout>
            <Head title={t('integrations.page_title')} />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Plug className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{t('integrations.title')}</CardTitle>
                                    <CardDescription>
                                        {t('integrations.description')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {integrations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Plug className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">{t('integrations.empty_title')}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {t('integrations.empty_description')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {sortedCategories.map((category) => (
                                        <div key={category}>
                                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                                                {t(`integrations.categories.${category}`)}
                                            </h3>
                                            <div className="divide-y rounded-lg border">
                                                {groupedIntegrations[category].map((integration) => (
                                                    <IntegrationItem
                                                        key={integration.identifier}
                                                        integration={integration}
                                                        onConfigure={() => setConfiguringIntegration(integration)}
                                                        onDelete={() => setDeletingIntegration(integration)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {configuringIntegration && (
                    <IntegrationConfigDialog
                        integration={configuringIntegration}
                        open={!!configuringIntegration}
                        onClose={() => setConfiguringIntegration(null)}
                    />
                )}

                <ConfirmationDialog
                    open={!!deletingIntegration}
                    onOpenChange={(open) => !open && setDeletingIntegration(null)}
                    title={t('integrations.delete_title')}
                    description={t('integrations.delete_description', { name: deletingIntegration?.name })}
                    confirmLabel={t('common.delete')}
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            </OrganizationLayout>
        </AppLayout>
    );
}

function IntegrationItem({
    integration,
    onConfigure,
    onDelete,
}: {
    integration: Integration;
    onConfigure: () => void;
    onDelete: () => void;
}) {
    const { t } = useTranslation('organization');
    const [isToggling, setIsToggling] = useState(false);

    const handleToggle = () => {
        if (!integration.configured) return;
        setIsToggling(true);
        router.post(
            toggle(integration.configured.id).url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    const message = integration.configured?.is_active
                        ? t('integrations.deactivated')
                        : t('integrations.activated');
                    toast.success(message);
                },
                onError: () => toast.error(t('integrations.toggle_failed')),
                onFinish: () => setIsToggling(false),
            },
        );
    };

    const getStatusBadge = () => {
        if (!integration.configured) {
            return null;
        }

        if (integration.configured.is_active && integration.configured.is_verified) {
            return (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {t('integrations.status.active')}
                </Badge>
            );
        }

        if (integration.configured.is_verified) {
            return (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {t('integrations.status.inactive')}
                </Badge>
            );
        }

        if (integration.configured.is_configured) {
            return (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {t('integrations.status.needs_test')}
                </Badge>
            );
        }

        return (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                <AlertCircle className="mr-1 h-3 w-3" />
                {t('integrations.status.incomplete')}
            </Badge>
        );
    };

    const getIcon = () => {
        switch (integration.icon) {
            case 'microsoft':
                return <MicrosoftIcon className="h-5 w-5" />;
            case 'google':
                return <GoogleIcon className="h-5 w-5" />;
            case 'openai':
                return <OpenAIIcon className="h-5 w-5" />;
            case 'meta':
                return <MetaIcon className="h-5 w-5" />;
            case 'claude':
                return <ClaudeIcon className="h-5 w-5" />;
            default:
                return <Plug className="h-5 w-5 text-muted-foreground" />;
        }
    };

    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    {getIcon()}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{integration.name}</span>
                        {getStatusBadge()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {integration.description}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-4">
                {integration.configured?.is_verified && (
                    <div className="flex items-center gap-2">
                        <Label
                            htmlFor={`toggle-${integration.identifier}`}
                            className="text-sm text-muted-foreground cursor-pointer"
                        >
                            {integration.configured.is_active ? t('integrations.toggle.on') : t('integrations.toggle.off')}
                        </Label>
                        <Switch
                            id={`toggle-${integration.identifier}`}
                            checked={integration.configured.is_active}
                            onCheckedChange={handleToggle}
                            disabled={isToggling}
                        />
                    </div>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{t('integrations.actions')}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {integration.configured ? (
                            <>
                                <DropdownMenuItem onClick={onConfigure}>
                                    <Pencil className="h-4 w-4" />
                                    {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                                    <Trash2 className="h-4 w-4" />
                                    {t('common.delete')}
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <DropdownMenuItem onClick={onConfigure}>
                                <Settings className="h-4 w-4" />
                                {t('integrations.configure')}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

function IntegrationConfigDialog({
    integration,
    open,
    onClose,
}: {
    integration: Integration;
    open: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation('organization');
    const initialData: Record<string, string> = { integration: integration.identifier };
    integration.credential_fields.forEach((field) => {
        initialData[field.name] = field.default || '';
    });

    const { data, setData, post, processing, errors, reset } = useForm(initialData);
    const [isTesting, setIsTesting] = useState(false);
    const [testPassed, setTestPassed] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);
    const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
    const [showMoreInfo, setShowMoreInfo] = useState(false);

    // Check if any required field has a value entered
    const hasRequiredFieldsFilled = integration.credential_fields
        .filter((f) => f.required)
        .every((f) => data[f.name]?.trim());

    // For existing integrations that are already verified, allow saving
    const isAlreadyVerified = integration.configured?.is_verified ?? false;

    // Can save if: test passed OR already verified (editing existing)
    const canSave = testPassed || isAlreadyVerified;

    const toggleFieldVisibility = (fieldName: string) => {
        setVisibleFields((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };

    const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setData('webhook_verify_token', token);
        if (testPassed) setTestPassed(false);
        if (testError) setTestError(null);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success(t('integrations.dialog.copied'));
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestError(null);
        setTestPassed(false);

        // First save the credentials
        post(store().url, {
            preserveScroll: true,
            onSuccess: (page) => {
                // After saving, get the integration ID and test it
                const updatedIntegration = (page.props as Props).integrations.find(
                    (i) => i.identifier === integration.identifier
                );

                if (updatedIntegration?.configured) {
                    router.post(
                        test(updatedIntegration.configured.id).url,
                        {},
                        {
                            preserveScroll: true,
                            onSuccess: () => {
                                setTestPassed(true);
                                toast.success(t('integrations.test_success'));
                            },
                            onError: (errors) => {
                                setTestError(
                                    typeof errors === 'object' && 'message' in errors
                                        ? String(errors.message)
                                        : t('integrations.test_failed')
                                );
                                toast.error(t('integrations.test_failed'));
                            },
                            onFinish: () => setIsTesting(false),
                        },
                    );
                } else {
                    setIsTesting(false);
                    setTestError(t('integrations.not_found_after_save'));
                }
            },
            onError: () => {
                setIsTesting(false);
                toast.error(t('integrations.credentials_save_failed'));
            },
        });
    };

    const handleSave = () => {
        post(store().url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('integrations.saved'));
                reset();
                onClose();
            },
            onError: () => toast.error(t('integrations.save_failed')),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {integration.icon === 'microsoft' && <MicrosoftIcon className="h-5 w-5" />}
                        {integration.icon === 'google' && <GoogleIcon className="h-5 w-5" />}
                        {integration.icon === 'openai' && <OpenAIIcon className="h-5 w-5" />}
                        {integration.icon === 'meta' && <MetaIcon className="h-5 w-5" />}
                        {integration.icon === 'claude' && <ClaudeIcon className="h-5 w-5" />}
                        {integration.name} {integration.configured ? t('integrations.dialog.edit_suffix') : t('integrations.dialog.configure_suffix')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('integrations.dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {integration.credential_fields.map((field) => (
                        <div key={field.name} className="grid gap-2">
                            <Label htmlFor={field.name}>
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        id={field.name}
                                        type={field.type === 'password' && !visibleFields[field.name] ? 'password' : 'text'}
                                        value={data[field.name] || ''}
                                        onChange={(e) => {
                                            setData(field.name, e.target.value);
                                            if (testPassed) setTestPassed(false);
                                            if (testError) setTestError(null);
                                        }}
                                        placeholder={
                                            integration.configured && field.type === 'password'
                                                ? '••••••••••••'
                                                : field.hint || ''
                                        }
                                        className="pr-20"
                                    />
                                    {field.type === 'password' && (
                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                                            {data[field.name] && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => copyToClipboard(data[field.name])}
                                                    title={t('integrations.dialog.copy')}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => toggleFieldVisibility(field.name)}
                                                title={visibleFields[field.name] ? t('integrations.dialog.hide') : t('integrations.dialog.show')}
                                            >
                                                {visibleFields[field.name] ? (
                                                    <EyeOff className="h-3.5 w-3.5" />
                                                ) : (
                                                    <Eye className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {field.name === 'webhook_verify_token' && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={generateToken}
                                        title={t('integrations.dialog.generate')}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            {field.hint && (
                                <p className="text-xs text-muted-foreground">{field.hint}</p>
                            )}
                            <InputError message={errors[field.name]} />
                        </div>
                    ))}

                    {/* More information section for Meta */}
                    {integration.identifier === 'meta' && (
                        <div className="rounded-lg border">
                            <button
                                type="button"
                                onClick={() => setShowMoreInfo(!showMoreInfo)}
                                className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                            >
                                <span className="flex items-center gap-2 text-sm font-medium">
                                    <Info className="h-4 w-4" />
                                    {t('integrations.meta.more_info_title')}
                                </span>
                                {showMoreInfo ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </button>
                            {showMoreInfo && (
                                <div className="border-t p-3 space-y-3 text-sm">
                                    <p className="text-muted-foreground">
                                        {t('integrations.meta.setup_intro')}
                                    </p>
                                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                        <li>{t('integrations.meta.step_1')}</li>
                                        <li>{t('integrations.meta.step_2')}</li>
                                        <li>{t('integrations.meta.step_3')}</li>
                                        <li>{t('integrations.meta.step_4')}</li>
                                        <li>{t('integrations.meta.step_5')}</li>
                                    </ol>
                                    <div className="pt-2">
                                        <p className="font-medium mb-1">{t('integrations.meta.permissions_title')}</p>
                                        <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                                            <li>instagram_basic</li>
                                            <li>instagram_manage_messages</li>
                                            <li>pages_show_list</li>
                                            <li>pages_messaging</li>
                                            <li>pages_read_engagement</li>
                                            <li>pages_manage_metadata</li>
                                            <li>business_management</li>
                                        </ul>
                                    </div>
                                    <a
                                        href="https://developers.facebook.com/apps/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                    >
                                        {t('integrations.meta.open_developer_console')}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Test status feedback */}
                    {(testPassed || testError) && (
                        <div
                            className={`rounded-lg border p-3 ${
                                testPassed
                                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                            }`}
                        >
                            <div className="flex items-center gap-2 text-sm">
                                {testPassed ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span className="text-green-700 dark:text-green-400">
                                            {t('integrations.dialog.test_passed')}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                        <span className="text-red-700 dark:text-red-400">
                                            {testError || t('integrations.test_failed')}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Info about test requirement for new integrations */}
                    {!integration.configured && !testPassed && !testError && (
                        <p className="text-xs text-muted-foreground">
                            {t('integrations.dialog.test_first')}
                        </p>
                    )}
                </div>

                <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={isTesting || processing || !hasRequiredFieldsFilled}
                    >
                        {isTesting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="mr-2 h-4 w-4" />
                        )}
                        {t('integrations.test_connection')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={processing || !canSave}
                    >
                        {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MicrosoftIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
        </svg>
    );
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

function OpenAIIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681v6.737zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"
                fill="currentColor"
            />
        </svg>
    );
}

function MetaIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a4.65 4.65 0 0 0 1.09 2.053c.502.555 1.123.918 1.848 1.018.377.052.756.052 1.131 0 1.08-.15 2.04-.756 2.88-1.62.49-.503.93-1.093 1.32-1.753.33.551.704 1.049 1.118 1.482.87.91 1.917 1.579 3.136 1.837.354.075.72.113 1.085.113 1.091 0 2.052-.388 2.828-1.058.824-.711 1.418-1.717 1.732-2.939.22-.856.322-1.809.322-2.831 0-1.947-.423-4.028-1.273-5.933-.908-2.035-2.387-3.76-4.533-3.76-1.108 0-2.078.446-2.896 1.183-.46.414-.86.9-1.197 1.44a6.748 6.748 0 0 0-.972-1.227C7.976 4.39 7.37 4.03 6.915 4.03Zm.603 2.268c.255.088.54.308.857.66.41.456.79 1.065 1.122 1.792.283.619.495 1.216.636 1.764.18.704.268 1.393.268 2.005 0 .792-.074 1.492-.227 2.03-.102.355-.238.63-.397.81a.766.766 0 0 1-.325.217c-.123.04-.27.04-.399 0a.766.766 0 0 1-.325-.216c-.159-.181-.295-.456-.397-.811-.153-.538-.227-1.238-.227-2.03 0-.893.115-1.884.348-2.88.235-.996.605-2.017 1.066-2.941.02-.04.04-.078.06-.117-.013-.005-.027-.01-.04-.016-.21-.088-.431-.17-.664-.24l-.168-.05a2.49 2.49 0 0 0-.187-.04.912.912 0 0 0-.108-.009c-.112 0-.209.032-.301.102a1.055 1.055 0 0 0-.265.346c-.236.434-.426.98-.569 1.566-.153.627-.23 1.306-.23 1.986 0 .754.08 1.486.244 2.155.168.687.427 1.287.77 1.746.348.467.782.795 1.286.933.19.052.386.08.586.08h.077c.2 0 .395-.028.586-.08.503-.138.938-.466 1.286-.933.342-.459.602-1.059.77-1.746.163-.67.243-1.401.243-2.155 0-.754-.08-1.486-.243-2.155-.168-.687-.428-1.287-.77-1.746-.348-.467-.783-.795-1.286-.933a2.07 2.07 0 0 0-.586-.08h-.077c-.2 0-.396.028-.586.08-.504.138-.938.466-1.286.933a4.848 4.848 0 0 0-.458.754 8.9 8.9 0 0 0-.312-.692 4.848 4.848 0 0 0-.458-.754c-.348-.467-.782-.795-1.286-.933a2.07 2.07 0 0 0-.586-.08h-.077c-.2 0-.395.028-.586.08-.503.138-.938.466-1.286.933-.342.459-.602 1.059-.77 1.746-.163.67-.243 1.401-.243 2.155 0 .754.08 1.486.243 2.155.168.687.428 1.287.77 1.746.348.467.783.795 1.286.933.19.052.386.08.586.08h.077c.2 0 .396-.028.586-.08.504-.138.938-.466 1.286-.933.143-.19.27-.404.38-.64.11.236.237.45.38.64.348.467.782.795 1.286.933.19.052.386.08.586.08h.077c.2 0 .395-.028.586-.08.503-.138.938-.466 1.286-.933.342-.459.602-1.059.77-1.746.163-.67.244-1.401.244-2.155 0-.68-.077-1.359-.23-1.986-.143-.586-.333-1.132-.569-1.566a1.055 1.055 0 0 0-.265-.346.515.515 0 0 0-.301-.102.912.912 0 0 0-.108.01 2.49 2.49 0 0 0-.187.039l-.168.05c-.233.07-.454.152-.664.24-.013.006-.027.011-.04.016.02.039.04.077.06.117.461.924.831 1.945 1.066 2.941.233.996.348 1.987.348 2.88 0 .792-.074 1.492-.227 2.03-.102.355-.238.63-.397.81a.766.766 0 0 1-.325.217c-.123.04-.27.04-.399 0a.766.766 0 0 1-.325-.216c-.159-.181-.295-.456-.397-.811-.153-.538-.227-1.238-.227-2.03 0-.612.088-1.301.268-2.005.14-.548.353-1.145.636-1.764.332-.727.712-1.336 1.122-1.792.317-.352.602-.572.857-.66Z"
                fill="#0081FB"
            />
        </svg>
    );
}

function ClaudeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79.222-3.166 1.618-.34.136-.371.577.09.34.086.112zm8.837-.127l-.174.238.06.147.202.155 5.327-1.465.467-.348-.019-.39-.124-.203-.393-.134zm-1.058-5.92l.06-.38-.238-.22h-.24l-1.164.553-.845.567-.202.15.127.4h.205l1.405-.458.892-.611zm5.06 1.283l-.318-.254-.53.096-4.174 2.417-.063.298.156.19h.124l4.452-2.134.348-.239.006-.374zm-5.246.515l.063-.34-.158-.214-.264-.083-3.652 1.478-.333.25v.264l.077.214.31.065 4.02-1.571-.063-.063zm-.47 1.922l.133-.463-.158-.209-.278-.07-1.553.705-1.063.732-.128.144.088.403h.13l1.683-.61 1.146-.632zm-2.074-.503l.164-.417-.177-.227-.347-.05-3.47 1.498-.393.329-.019.347.158.258.297.019 3.787-1.758zm1.164 2.316l.065-.323-.18-.167-.28-.038-1.266.516-.94.627-.108.235.112.335.196.072 1.41-.567.99-.69zm6.246.758l.145-.36-.297-.264-.277.032-3.265 1.32-.436.392-.013.386.177.233.31.02zm-5.334-.573l.102-.38-.316-.247-.267.063-3.02 1.555-.404.392.006.367.202.232.316-.026 3.38-1.956zm1.885 2.17l.063-.33-.195-.172-.26-.006-1.62.62-.932.603-.102.219.14.373.207.032 1.696-.68 1.003-.66zm6.043-.502l.228-.373-.297-.251-.31.025-3.265 1.32-.435.392-.013.385.177.233.31.02zm-10.91 1.36l-.31.367.038.233.177.12 3.39-.943.404-.335-.013-.297-.107-.164-.341-.077-3.178 1.058-.06.039zm5.232-.477l.076-.348-.202-.196-.303-.013-2.12.857-.474.36.032.366.177.234.23-.013 2.583-1.247zm1.732 1.772l.095-.303-.258-.22-.252.045-1.607.643-.442.34-.006.335.177.202.278.006 2.015-.806v-.242zm-8.698.252l-.341.323.012.278.151.17 3.363-.657.404-.36-.038-.297-.164-.158-.3-.02-3.087.72zm4.617-.013l.108-.297-.214-.202-.303.02-2.152.584-.348.27.006.316.177.214.36-.007 2.366-.898zm1.866 1.409l.09-.278-.202-.18-.24.025-1.467.423-.556.462.05.36.202.187.278-.006 1.845-.993zm6.588.502l.247-.328-.29-.258-.258.02-3.254 1.313-.423.373v.367l.189.24.335.006zm-11.2.56l-.361.316v.233l.145.17 3.165-.493.498-.443-.083-.296-.163-.152-.297.013-2.905.653zm4.656-.253l.088-.277-.227-.189-.278.026-2.165.48-.418.36.019.272.177.196.341-.006zm1.809 1.127l.082-.259-.202-.157-.221.032-1.303.335-.594.527.095.347.209.158.252-.025 1.682-.958zm6.632.655l.228-.348-.277-.226-.278.044-3.21 1.371-.417.4.006.355.183.228.335-.007zm-11.168.406l-.322.285.012.272.145.132 2.778-.335.591-.523-.063-.278-.144-.125-.309.013-2.688.559zm4.476-.379l.139-.303-.278-.18-.23.055-1.984.405-.435.384.025.303.17.172.372-.032 2.221-.804zm1.828 1.159l.095-.28-.228-.151-.196.038-1.404.402-.511.473.063.341.202.159.27-.032 1.709-.95zm-9.38.39l-.284.277.038.246.152.12 2.436-.177.643-.618-.082-.27-.126-.113-.315.019-2.463.516zm4.22-.455l.108-.284-.258-.164-.246.057-1.683.342-.479.423.032.284.158.17.31-.018 2.058-.81zm1.886 1.063l.07-.28-.228-.151-.183.05-1.354.411-.47.412.044.316.182.159.277-.032 1.663-.884zm-7.147.398l-.271.233.032.258.126.1 2.112-.068.687-.656-.089-.24-.113-.1-.29.012zm3.82-.4l.126-.266-.265-.164-.214.07-1.626.328-.436.374.019.29.158.17.27-.013zm1.94 1.051l.063-.278-.234-.157-.183.057-1.29.424-.443.38.032.297.183.158.258-.032zm-5.207.297l-.245.221.013.258.132.088 1.81.063.623-.598-.082-.234-.12-.094-.284.02zm3.534-.462l.088-.259-.234-.157-.209.063-1.29.297-.498.43.044.277.177.158.258-.038zm2.02 1.069l.055-.265-.234-.152-.183.063-1.253.423-.43.36.019.29.183.158.252-.044zm-4.98.222l-.202.221-.006.239.139.095 1.543.17.661-.636-.095-.227-.113-.095-.277.013-1.65.22zm3.288-.56l.101-.246-.265-.158-.19.076-1.17.284-.466.38.025.277.17.152.252-.038 1.543-.727zm2.172 1.127l.032-.26-.234-.144-.177.069-1.222.436-.417.348.013.278.17.158.259-.038zm-5.315.195l-.277.234.032.26.164.063 1.632.082.616-.566-.057-.246-.152-.132-.265.007-1.693.297zm3.472-.64l.127-.24-.252-.145-.196.082-1.133.292-.423.335.019.258.164.145.259-.032 1.435-.695zm2.235 1.221l.044-.265-.24-.133-.183.075-1.191.447-.398.335.006.265.165.15.258-.031zm-5.631.137l-.278.23.032.257.17.063 1.663.007.573-.535-.057-.233-.151-.12-.27.02-1.682.31zm3.68-.72l.12-.226-.265-.138-.183.087-1.12.303-.386.304.012.245.158.139.259-.032 1.405-.683zm2.241 1.252l.051-.258-.24-.126-.176.075-1.178.458-.386.323.006.258.157.145.259-.038zm-6.043.093l-.296.233.05.264.19.044 1.759-.095.51-.498-.057-.227-.17-.12-.283.027-1.703.372zm4-.793l.095-.202-.252-.132-.183.088-1.032.272-.392.304.013.24.151.138.259-.031 1.341-.677zm2.254 1.302l.057-.252-.24-.12-.17.08-1.166.466-.38.316.007.259.15.138.26-.038 1.481-.849z"
                fill="#D97757"
            />
        </svg>
    );
}
