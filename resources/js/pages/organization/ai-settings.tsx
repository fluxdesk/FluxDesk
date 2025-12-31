import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { update } from '@/routes/organization/ai-settings';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle, Bot, FileText, Info, MessageSquare, Shield, Sparkles, Wand2, Zap } from 'lucide-react';
import * as React from 'react';

interface AIProvider {
    identifier: string;
    name: string;
    is_active: boolean;
    models: Array<{ id: string; name: string; context_window?: number }>;
}

interface Language {
    code: string;
    name: string;
}

interface UsageStats {
    total_requests: number;
    total_tokens: number;
    total_cost: number;
}

interface Props {
    settings: {
        default_provider: string | null;
        default_model: string | null;
        default_language: string;
        detect_ticket_language: boolean;
        match_ticket_language: boolean;
        system_instructions: string | null;
        company_context: string | null;
        auto_replies_enabled: boolean;
        suggested_replies_enabled: boolean;
        reply_refactor_enabled: boolean;
        auto_reply_delay_minutes: number;
        auto_reply_business_hours_only: boolean;
        // Privacy settings
        include_customer_name: boolean;
        include_agent_name: boolean;
        include_ticket_subject: boolean;
        include_message_history: boolean;
        include_department_name: boolean;
        message_history_limit: number;
        // Disclosure settings
        disclosure_enabled: boolean;
        disclosure_in_email: boolean;
        disclosure_in_portal: boolean;
        disclosure_text: string | null;
    };
    providers: AIProvider[];
    usage: UsageStats;
    usageByAction: Record<string, { count: number; tokens: number; cost: number }>;
    languages: Language[];
}

function PrivacyToggle({
    label,
    description,
    checked,
    onChange,
    sensitive,
    children,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    sensitive?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-2">
                <span className="text-sm">{label}</span>
                {sensitive && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="flex h-4 w-4 items-center justify-center">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>Persoonsgegeven (AVG/GDPR)</TooltipContent>
                    </Tooltip>
                )}
                {description && (
                    <span className="text-xs text-muted-foreground">({description})</span>
                )}
            </div>
            <div className="flex items-center gap-3">
                {children}
                <Switch checked={checked} onCheckedChange={onChange} />
            </div>
        </div>
    );
}

function FeatureToggle({
    icon: Icon,
    title,
    description,
    checked,
    onChange,
    badge,
    children,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    badge?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${checked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{title}</span>
                            {badge && (
                                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {badge}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>
                <Switch checked={checked} onCheckedChange={onChange} />
            </div>
            {children && checked && (
                <div className="border-t px-4 py-3 bg-muted/30">
                    {children}
                </div>
            )}
        </div>
    );
}

export default function AISettingsPage({ settings, providers, usage, languages }: Props) {
    const activeProviders = providers.filter((p) => p.is_active);
    const hasActiveProvider = activeProviders.length > 0;

    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        default_provider: settings.default_provider || '',
        default_model: settings.default_model || '',
        default_language: settings.default_language || 'nl',
        detect_ticket_language: settings.detect_ticket_language ?? true,
        match_ticket_language: settings.match_ticket_language ?? true,
        system_instructions: settings.system_instructions || '',
        company_context: settings.company_context || '',
        auto_replies_enabled: settings.auto_replies_enabled ?? false,
        suggested_replies_enabled: settings.suggested_replies_enabled ?? true,
        reply_refactor_enabled: settings.reply_refactor_enabled ?? true,
        auto_reply_delay_minutes: settings.auto_reply_delay_minutes || 5,
        auto_reply_business_hours_only: settings.auto_reply_business_hours_only ?? true,
        // Privacy settings (GDPR-compliant defaults - personal data off)
        include_customer_name: settings.include_customer_name ?? false,
        include_agent_name: settings.include_agent_name ?? true,
        include_ticket_subject: settings.include_ticket_subject ?? false,
        include_message_history: settings.include_message_history ?? false,
        include_department_name: settings.include_department_name ?? true,
        message_history_limit: settings.message_history_limit ?? 10,
        // Disclosure settings
        disclosure_enabled: settings.disclosure_enabled ?? false,
        disclosure_in_email: settings.disclosure_in_email ?? true,
        disclosure_in_portal: settings.disclosure_in_portal ?? true,
        disclosure_text: settings.disclosure_text || '',
    });

    const selectedProvider = providers.find((p) => p.identifier === data.default_provider);
    const availableModels = selectedProvider?.models || [];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(update().url, { preserveScroll: true });
    }

    function handleProviderChange(value: string) {
        setData((prev) => ({
            ...prev,
            default_provider: value,
            default_model: '',
        }));
    }

    return (
        <AppLayout>
            <Head title="AI Instellingen" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    {!hasActiveProvider && (
                        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                            <CardContent className="flex items-start gap-3 pt-6">
                                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-amber-900 dark:text-amber-100">
                                        Geen AI provider geconfigureerd
                                    </p>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                        Configureer eerst een AI integratie (zoals OpenAI of Claude) op de{' '}
                                        <Link
                                            href="/organization/integrations"
                                            className="underline hover:no-underline"
                                        >
                                            Integraties
                                        </Link>{' '}
                                        pagina.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Bot className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">AI Instellingen</CardTitle>
                                    <CardDescription>
                                        Configureer AI-functies voor suggesties en automatische antwoorden
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <Tabs defaultValue="features" className="w-full">
                                    <TabsList className="mb-6">
                                        <TabsTrigger value="features" className="gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Functies
                                        </TabsTrigger>
                                        <TabsTrigger value="instructions" className="gap-1.5">
                                            <FileText className="h-3.5 w-3.5" />
                                            Instructies
                                        </TabsTrigger>
                                        <TabsTrigger value="privacy" className="gap-1.5">
                                            <Shield className="h-3.5 w-3.5" />
                                            Privacy
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Features Tab */}
                                    <TabsContent value="features" className="space-y-6">
                                        {/* Provider Configuration */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-medium">Provider</h3>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="default_provider">AI Provider</Label>
                                                    <Select
                                                        value={data.default_provider}
                                                        onValueChange={handleProviderChange}
                                                        disabled={!hasActiveProvider}
                                                    >
                                                        <SelectTrigger id="default_provider">
                                                            <SelectValue placeholder="Selecteer provider" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {activeProviders.map((provider) => (
                                                                <SelectItem
                                                                    key={provider.identifier}
                                                                    value={provider.identifier}
                                                                >
                                                                    {provider.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <InputError message={errors.default_provider} />
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="default_model">Model</Label>
                                                    <Select
                                                        value={data.default_model}
                                                        onValueChange={(value) => setData('default_model', value)}
                                                        disabled={!data.default_provider}
                                                    >
                                                        <SelectTrigger id="default_model">
                                                            <SelectValue placeholder="Selecteer model" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableModels.map((model) => (
                                                                <SelectItem key={model.id} value={model.id}>
                                                                    {model.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <InputError message={errors.default_model} />
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="default_language">Standaard taal</Label>
                                                <Select
                                                    value={data.default_language}
                                                    onValueChange={(value) => setData('default_language', value)}
                                                >
                                                    <SelectTrigger id="default_language" className="max-w-xs">
                                                        <SelectValue placeholder="Selecteer taal" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {languages.map((lang) => (
                                                            <SelectItem key={lang.code} value={lang.code}>
                                                                {lang.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <InputError message={errors.default_language} />
                                            </div>

                                            <div className="flex flex-wrap gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <Switch
                                                        checked={data.detect_ticket_language}
                                                        onCheckedChange={(checked) => setData('detect_ticket_language', checked)}
                                                    />
                                                    <span className="text-sm">Detecteer tickettaal</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <Switch
                                                        checked={data.match_ticket_language}
                                                        onCheckedChange={(checked) => setData('match_ticket_language', checked)}
                                                    />
                                                    <span className="text-sm">Match tickettaal</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* AI Features */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-medium">AI Functies</h3>

                                            <FeatureToggle
                                                icon={MessageSquare}
                                                title="Suggesties"
                                                description="Genereer automatisch antwoordsuggesties"
                                                checked={data.suggested_replies_enabled}
                                                onChange={(checked) => setData('suggested_replies_enabled', checked)}
                                            />

                                            <FeatureToggle
                                                icon={Wand2}
                                                title="Tekst verbeteren"
                                                description="Verbeter en herformuleer geschreven antwoorden"
                                                checked={data.reply_refactor_enabled}
                                                onChange={(checked) => setData('reply_refactor_enabled', checked)}
                                            />

                                            <FeatureToggle
                                                icon={Zap}
                                                title="Automatische antwoorden"
                                                description="Stuur automatisch AI-antwoorden naar nieuwe tickets"
                                                checked={data.auto_replies_enabled}
                                                onChange={(checked) => setData('auto_replies_enabled', checked)}
                                                badge="Binnenkort"
                                            >
                                                <div className="space-y-3">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="auto_reply_delay">Wachttijd (minuten)</Label>
                                                        <Input
                                                            id="auto_reply_delay"
                                                            type="number"
                                                            min={1}
                                                            max={60}
                                                            value={data.auto_reply_delay_minutes}
                                                            onChange={(e) => setData('auto_reply_delay_minutes', parseInt(e.target.value) || 5)}
                                                            className="max-w-[100px]"
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            Wacht dit aantal minuten voordat een automatisch antwoord wordt verzonden
                                                        </p>
                                                    </div>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <Switch
                                                            checked={data.auto_reply_business_hours_only}
                                                            onCheckedChange={(checked) => setData('auto_reply_business_hours_only', checked)}
                                                        />
                                                        <span className="text-sm">Alleen tijdens kantooruren</span>
                                                    </label>
                                                </div>
                                            </FeatureToggle>
                                        </div>
                                    </TabsContent>

                                    {/* Instructions Tab */}
                                    <TabsContent value="instructions" className="space-y-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="company_context">Bedrijfscontext</Label>
                                            <Textarea
                                                id="company_context"
                                                value={data.company_context}
                                                onChange={(e) => setData('company_context', e.target.value)}
                                                placeholder="Beschrijf je bedrijf, producten of diensten zodat de AI relevantere antwoorden kan genereren..."
                                                rows={4}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Geef context over je bedrijf voor betere AI-antwoorden
                                            </p>
                                            <InputError message={errors.company_context} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="system_instructions">Instructies</Label>
                                            <Textarea
                                                id="system_instructions"
                                                value={data.system_instructions}
                                                onChange={(e) => setData('system_instructions', e.target.value)}
                                                placeholder="Bijv: Gebruik geen emdashes (—), wees beknopt, vermijd jargon..."
                                                rows={4}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Specifieke instructies voor de AI bij het genereren van antwoorden
                                            </p>
                                            <InputError message={errors.system_instructions} />
                                        </div>
                                    </TabsContent>

                                    {/* Privacy Tab */}
                                    <TabsContent value="privacy" className="space-y-6">
                                        {/* Data Sharing */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-medium">Gegevens delen</h3>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-4 w-4 text-amber-500 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-xs">
                                                        Ingeschakelde gegevens worden naar de externe AI-provider verzonden.
                                                        Onder de AVG/GDPR is dit een verwerking van persoonsgegevens.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Bepaal welke gegevens naar de AI-provider worden verzonden
                                            </p>

                                            <div className="divide-y rounded-lg border">
                                                <PrivacyToggle
                                                    label="Klantnaam"
                                                    checked={data.include_customer_name}
                                                    onChange={(checked) => setData('include_customer_name', checked)}
                                                    sensitive
                                                />
                                                <PrivacyToggle
                                                    label="Medewerkersnaam"
                                                    checked={data.include_agent_name}
                                                    onChange={(checked) => setData('include_agent_name', checked)}
                                                />
                                                <PrivacyToggle
                                                    label="Ticket onderwerp"
                                                    checked={data.include_ticket_subject}
                                                    onChange={(checked) => setData('include_ticket_subject', checked)}
                                                    sensitive
                                                />
                                                <PrivacyToggle
                                                    label="Afdelingsnaam"
                                                    checked={data.include_department_name}
                                                    onChange={(checked) => setData('include_department_name', checked)}
                                                />
                                                <PrivacyToggle
                                                    label="Berichtgeschiedenis"
                                                    description="eerdere berichten"
                                                    checked={data.include_message_history}
                                                    onChange={(checked) => setData('include_message_history', checked)}
                                                    sensitive
                                                >
                                                    {data.include_message_history && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">max</span>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={20}
                                                                value={data.message_history_limit}
                                                                onChange={(e) =>
                                                                    setData('message_history_limit', parseInt(e.target.value) || 10)
                                                                }
                                                                className="h-7 w-14 text-center"
                                                            />
                                                        </div>
                                                    )}
                                                </PrivacyToggle>
                                            </div>
                                        </div>

                                        {/* AI Disclosure */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-medium">AI-melding aan klanten</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Toon klanten wanneer AI is gebruikt bij het opstellen van antwoorden
                                            </p>

                                            <div className="rounded-lg border p-4 space-y-4">
                                                <label className="flex items-center justify-between cursor-pointer">
                                                    <span className="text-sm font-medium">AI-melding inschakelen</span>
                                                    <Switch
                                                        checked={data.disclosure_enabled}
                                                        onCheckedChange={(checked) => setData('disclosure_enabled', checked)}
                                                    />
                                                </label>

                                                {data.disclosure_enabled && (
                                                    <div className="space-y-4 pt-2 border-t">
                                                        <div className="flex flex-wrap gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <Switch
                                                                    checked={data.disclosure_in_email}
                                                                    onCheckedChange={(checked) => setData('disclosure_in_email', checked)}
                                                                />
                                                                <span className="text-sm">In e-mail</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <Switch
                                                                    checked={data.disclosure_in_portal}
                                                                    onCheckedChange={(checked) => setData('disclosure_in_portal', checked)}
                                                                />
                                                                <span className="text-sm">In klantenportaal</span>
                                                            </label>
                                                        </div>

                                                        <div className="grid gap-2">
                                                            <Label htmlFor="disclosure_text">Aangepaste tekst</Label>
                                                            <Textarea
                                                                id="disclosure_text"
                                                                value={data.disclosure_text}
                                                                onChange={(e) => setData('disclosure_text', e.target.value)}
                                                                placeholder="Dit antwoord is opgesteld met behulp van AI-technologie."
                                                                rows={2}
                                                            />
                                                            <p className="text-xs text-muted-foreground">
                                                                Laat leeg voor standaardtekst
                                                            </p>
                                                            <InputError message={errors.disclosure_text} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <div className="flex items-center gap-4 pt-2">
                                    <Button type="submit" disabled={processing}>
                                        Opslaan
                                    </Button>
                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-muted-foreground">Opgeslagen</p>
                                    </Transition>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {usage.total_requests > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Gebruik deze maand</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="text-center p-4 rounded-lg bg-muted/50">
                                        <p className="text-2xl font-bold">{usage.total_requests}</p>
                                        <p className="text-sm text-muted-foreground">Verzoeken</p>
                                    </div>
                                    <div className="text-center p-4 rounded-lg bg-muted/50">
                                        <p className="text-2xl font-bold">
                                            {(usage.total_tokens / 1000).toFixed(1)}k
                                        </p>
                                        <p className="text-sm text-muted-foreground">Tokens</p>
                                    </div>
                                    <div className="text-center p-4 rounded-lg bg-muted/50">
                                        <p className="text-2xl font-bold">
                                            ${usage.total_cost.toFixed(2)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Geschatte kosten</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </OrganizationLayout>
        </AppLayout>
    );
}
