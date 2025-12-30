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
    Loader2,
    MoreHorizontal,
    Pencil,
    Plug,
    Settings,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
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

const CATEGORY_LABELS: Record<string, string> = {
    email: 'E-mail',
    ai: 'AI',
    general: 'Overig',
};

const CATEGORY_ORDER = ['email', 'ai', 'general'];

interface Props {
    integrations: Integration[];
}

export default function Integrations({ integrations }: Props) {
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
                toast.success('Integratie verwijderd');
                setDeletingIntegration(null);
            },
            onError: () => toast.error('Integratie verwijderen mislukt'),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AppLayout>
            <Head title="Integraties" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Plug className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Integraties</CardTitle>
                                    <CardDescription>
                                        Verbind externe diensten met je organisatie
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {integrations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Plug className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">Geen integraties beschikbaar</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Er zijn nog geen integraties geregistreerd in het systeem.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {sortedCategories.map((category) => (
                                        <div key={category}>
                                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                                                {CATEGORY_LABELS[category] || category}
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
                    title="Integratie verwijderen"
                    description={`Weet je zeker dat je de ${deletingIntegration?.name} integratie wilt verwijderen? De opgeslagen credentials worden permanent verwijderd.`}
                    confirmLabel="Verwijderen"
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
                        ? 'Integratie gedeactiveerd'
                        : 'Integratie geactiveerd';
                    toast.success(message);
                },
                onError: () => toast.error('Status wijzigen mislukt'),
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
                    Actief
                </Badge>
            );
        }

        if (integration.configured.is_verified) {
            return (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Inactief
                </Badge>
            );
        }

        if (integration.configured.is_configured) {
            return (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Test nodig
                </Badge>
            );
        }

        return (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                <AlertCircle className="mr-1 h-3 w-3" />
                Onvolledig
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
                            {integration.configured.is_active ? 'Aan' : 'Uit'}
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
                            <span className="sr-only">Acties</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {integration.configured ? (
                            <>
                                <DropdownMenuItem onClick={onConfigure}>
                                    <Pencil className="h-4 w-4" />
                                    Bewerken
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                                    <Trash2 className="h-4 w-4" />
                                    Verwijderen
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <DropdownMenuItem onClick={onConfigure}>
                                <Settings className="h-4 w-4" />
                                Configureren
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
    const initialData: Record<string, string> = { integration: integration.identifier };
    integration.credential_fields.forEach((field) => {
        initialData[field.name] = field.default || '';
    });

    const { data, setData, post, processing, errors, reset } = useForm(initialData);
    const [isTesting, setIsTesting] = useState(false);
    const [testPassed, setTestPassed] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);

    // Check if any required field has a value entered
    const hasRequiredFieldsFilled = integration.credential_fields
        .filter((f) => f.required)
        .every((f) => data[f.name]?.trim());

    // For existing integrations that are already verified, allow saving
    const isAlreadyVerified = integration.configured?.is_verified ?? false;

    // Can save if: test passed OR already verified (editing existing)
    const canSave = testPassed || isAlreadyVerified;

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
                                toast.success('Verbinding succesvol getest! Je kunt nu opslaan.');
                            },
                            onError: (errors) => {
                                setTestError(
                                    typeof errors === 'object' && 'message' in errors
                                        ? String(errors.message)
                                        : 'Verbindingstest mislukt'
                                );
                                toast.error('Verbindingstest mislukt');
                            },
                            onFinish: () => setIsTesting(false),
                        },
                    );
                } else {
                    setIsTesting(false);
                    setTestError('Kon integratie niet vinden na opslaan');
                }
            },
            onError: () => {
                setIsTesting(false);
                toast.error('Credentials opslaan mislukt');
            },
        });
    };

    const handleSave = () => {
        post(store().url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Integratie opgeslagen');
                reset();
                onClose();
            },
            onError: () => toast.error('Opslaan mislukt'),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {integration.icon === 'microsoft' && <MicrosoftIcon className="h-5 w-5" />}
                        {integration.icon === 'google' && <GoogleIcon className="h-5 w-5" />}
                        {integration.icon === 'openai' && <OpenAIIcon className="h-5 w-5" />}
                        {integration.name} {integration.configured ? 'bewerken' : 'configureren'}
                    </DialogTitle>
                    <DialogDescription>
                        Vul de credentials in en test de verbinding om de integratie te activeren.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {integration.credential_fields.map((field) => (
                        <div key={field.name} className="grid gap-2">
                            <Label htmlFor={field.name}>
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            <Input
                                id={field.name}
                                type={field.type}
                                value={data[field.name] || ''}
                                onChange={(e) => {
                                    setData(field.name, e.target.value);
                                    // Reset test state when credentials change
                                    if (testPassed) setTestPassed(false);
                                    if (testError) setTestError(null);
                                }}
                                placeholder={
                                    integration.configured && field.type === 'password'
                                        ? '••••••••••••'
                                        : field.hint || ''
                                }
                            />
                            {field.hint && (
                                <p className="text-xs text-muted-foreground">{field.hint}</p>
                            )}
                            <InputError message={errors[field.name]} />
                        </div>
                    ))}

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
                                            Verbinding succesvol! Je kunt nu opslaan.
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                        <span className="text-red-700 dark:text-red-400">
                                            {testError || 'Verbindingstest mislukt'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Info about test requirement for new integrations */}
                    {!integration.configured && !testPassed && !testError && (
                        <p className="text-xs text-muted-foreground">
                            Test eerst de verbinding voordat je de integratie kunt opslaan.
                        </p>
                    )}
                </div>

                <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Annuleren
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
                        Test verbinding
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={processing || !canSave}
                    >
                        {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Opslaan
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
