import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { update } from '@/routes/organization/ai-settings';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle, Bot, ChevronDown, FileText, MessageSquare, Shield, Sparkles, Wand2, Zap } from 'lucide-react';
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

function FeatureCard({
    icon: Icon,
    title,
    description,
    enabled,
    onToggle,
    children,
    badge,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    enabled: boolean;
    onToggle: (checked: boolean) => void;
    children?: React.ReactNode;
    badge?: string;
}) {
    const [isOpen, setIsOpen] = React.useState(enabled);

    React.useEffect(() => {
        if (enabled) setIsOpen(true);
    }, [enabled]);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="rounded-lg border bg-card">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
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
                    <div className="flex items-center gap-2">
                        <Switch checked={enabled} onCheckedChange={onToggle} />
                        {children && (
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </Button>
                            </CollapsibleTrigger>
                        )}
                    </div>
                </div>
                {children && (
                    <CollapsibleContent>
                        <div className="border-t px-4 py-3 bg-muted/30">
                            {children}
                        </div>
                    </CollapsibleContent>
                )}
            </div>
        </Collapsible>
    );
}

function SettingsSection({
    icon: Icon,
    title,
    description,
    children,
    defaultOpen = true,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="space-y-4">
                <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">{title}</h3>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                </CollapsibleTrigger>
                {description && !isOpen && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <CollapsibleContent>
                    <div className="space-y-4">
                        {description && (
                            <p className="text-sm text-muted-foreground">{description}</p>
                        )}
                        {children}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
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
        // Privacy settings
        include_customer_name: settings.include_customer_name ?? true,
        include_agent_name: settings.include_agent_name ?? true,
        include_ticket_subject: settings.include_ticket_subject ?? true,
        include_message_history: settings.include_message_history ?? true,
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
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Provider Configuration */}
                                <SettingsSection icon={Zap} title="Provider configuratie">
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

                                    <div className="flex flex-wrap gap-4 pt-2">
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
                                </SettingsSection>

                                <Separator />

                                {/* AI Features */}
                                <SettingsSection icon={Sparkles} title="AI Functies" description="Schakel individuele AI-functies in of uit">
                                    <div className="space-y-3">
                                        <FeatureCard
                                            icon={MessageSquare}
                                            title="Suggesties"
                                            description="Genereer automatisch antwoordsuggesties"
                                            enabled={data.suggested_replies_enabled}
                                            onToggle={(checked) => setData('suggested_replies_enabled', checked)}
                                        />

                                        <FeatureCard
                                            icon={Wand2}
                                            title="Tekst verbeteren"
                                            description="Verbeter en herformuleer geschreven antwoorden"
                                            enabled={data.reply_refactor_enabled}
                                            onToggle={(checked) => setData('reply_refactor_enabled', checked)}
                                        />

                                        <FeatureCard
                                            icon={Zap}
                                            title="Automatische antwoorden"
                                            description="Stuur automatisch AI-antwoorden naar nieuwe tickets"
                                            enabled={data.auto_replies_enabled}
                                            onToggle={(checked) => setData('auto_replies_enabled', checked)}
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
                                                        disabled={!data.auto_replies_enabled}
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Wacht dit aantal minuten voordat een automatisch antwoord wordt verzonden
                                                    </p>
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <Switch
                                                        checked={data.auto_reply_business_hours_only}
                                                        onCheckedChange={(checked) => setData('auto_reply_business_hours_only', checked)}
                                                        disabled={!data.auto_replies_enabled}
                                                    />
                                                    <span className="text-sm">Alleen tijdens kantooruren</span>
                                                </label>
                                            </div>
                                        </FeatureCard>
                                    </div>
                                </SettingsSection>

                                <Separator />

                                {/* Custom Instructions */}
                                <SettingsSection icon={FileText} title="Aangepaste instructies" defaultOpen={false}>
                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="company_context">Bedrijfscontext</Label>
                                            <Textarea
                                                id="company_context"
                                                value={data.company_context}
                                                onChange={(e) => setData('company_context', e.target.value)}
                                                placeholder="Beschrijf je bedrijf, producten of diensten zodat de AI relevantere antwoorden kan genereren..."
                                                rows={3}
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
                                                rows={3}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Specifieke instructies voor de AI bij het genereren van antwoorden
                                            </p>
                                            <InputError message={errors.system_instructions} />
                                        </div>
                                    </div>
                                </SettingsSection>

                                <Separator />

                                {/* Privacy & Compliance */}
                                <SettingsSection
                                    icon={Shield}
                                    title="Privacy & Gegevensbescherming"
                                    description="Bepaal welke gegevens naar de AI-provider worden verzonden (GDPR/AI-Act)"
                                    defaultOpen={false}
                                >
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Gegevens in AI-prompts
                                            </h4>

                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <label className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                                                    <span className="text-sm">Klantnaam</span>
                                                    <Switch
                                                        checked={data.include_customer_name}
                                                        onCheckedChange={(checked) => setData('include_customer_name', checked)}
                                                    />
                                                </label>

                                                <label className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                                                    <span className="text-sm">Medewerkersnaam</span>
                                                    <Switch
                                                        checked={data.include_agent_name}
                                                        onCheckedChange={(checked) => setData('include_agent_name', checked)}
                                                    />
                                                </label>

                                                <label className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                                                    <span className="text-sm">Ticket onderwerp</span>
                                                    <Switch
                                                        checked={data.include_ticket_subject}
                                                        onCheckedChange={(checked) => setData('include_ticket_subject', checked)}
                                                    />
                                                </label>

                                                <label className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                                                    <span className="text-sm">Afdelingsnaam</span>
                                                    <Switch
                                                        checked={data.include_department_name}
                                                        onCheckedChange={(checked) => setData('include_department_name', checked)}
                                                    />
                                                </label>
                                            </div>

                                            <label className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                                                <div className="space-y-0.5">
                                                    <span className="text-sm font-medium">Berichtgeschiedenis</span>
                                                    <p className="text-xs text-muted-foreground">
                                                        Eerdere berichten meesturen naar AI
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={data.include_message_history}
                                                    onCheckedChange={(checked) => setData('include_message_history', checked)}
                                                />
                                            </label>

                                            {data.include_message_history && (
                                                <div className="grid gap-2 pl-4 border-l-2 border-muted ml-3">
                                                    <Label htmlFor="message_history_limit">Max. berichten</Label>
                                                    <Input
                                                        id="message_history_limit"
                                                        type="number"
                                                        min={1}
                                                        max={20}
                                                        value={data.message_history_limit}
                                                        onChange={(e) =>
                                                            setData('message_history_limit', parseInt(e.target.value) || 10)
                                                        }
                                                        className="max-w-[100px]"
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Aantal berichten dat naar AI wordt gestuurd (1-20)
                                                    </p>
                                                    <InputError message={errors.message_history_limit} />
                                                </div>
                                            )}
                                        </div>

                                        <Separator />

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                AI-melding aan klanten
                                            </h4>

                                            <label className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                                                <div className="space-y-0.5">
                                                    <span className="text-sm font-medium">AI-melding inschakelen</span>
                                                    <p className="text-xs text-muted-foreground">
                                                        Toon klanten wanneer AI is gebruikt
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={data.disclosure_enabled}
                                                    onCheckedChange={(checked) => setData('disclosure_enabled', checked)}
                                                />
                                            </label>

                                            {data.disclosure_enabled && (
                                                <div className="space-y-3 pl-4 border-l-2 border-muted ml-3">
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
                                                        <Label htmlFor="disclosure_text">Aangepaste meldingstekst</Label>
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
                                </SettingsSection>

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
