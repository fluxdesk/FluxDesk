import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AlertCircle, Bot, Shield, Sparkles, Zap } from 'lucide-react';

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
                                        Configureer eerst een AI integratie (zoals OpenAI) op de{' '}
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
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Zap className="h-4 w-4" />
                                        Provider configuratie
                                    </h3>

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

                                    <div className="space-y-3 pt-2">
                                        <label
                                            htmlFor="detect_ticket_language"
                                            className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <Switch
                                                id="detect_ticket_language"
                                                checked={data.detect_ticket_language}
                                                onCheckedChange={(checked) =>
                                                    setData('detect_ticket_language', checked)
                                                }
                                                className="mt-0.5"
                                            />
                                            <div className="space-y-1">
                                                <span className="font-medium">Detecteer tickettaal</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Herken automatisch de taal van binnenkomende tickets
                                                </p>
                                            </div>
                                        </label>

                                        <label
                                            htmlFor="match_ticket_language"
                                            className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <Switch
                                                id="match_ticket_language"
                                                checked={data.match_ticket_language}
                                                onCheckedChange={(checked) =>
                                                    setData('match_ticket_language', checked)
                                                }
                                                className="mt-0.5"
                                            />
                                            <div className="space-y-1">
                                                <span className="font-medium">Match tickettaal</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Genereer suggesties in dezelfde taal als het ticket
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        AI Functies
                                    </h3>

                                    <div className="space-y-3">
                                        <label
                                            htmlFor="suggested_replies_enabled"
                                            className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <Switch
                                                id="suggested_replies_enabled"
                                                checked={data.suggested_replies_enabled}
                                                onCheckedChange={(checked) =>
                                                    setData('suggested_replies_enabled', checked)
                                                }
                                                className="mt-0.5"
                                            />
                                            <div className="space-y-1">
                                                <span className="font-medium">Suggesties</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Genereer automatisch antwoordsuggesties op basis van het ticket
                                                </p>
                                            </div>
                                        </label>

                                        <label
                                            htmlFor="reply_refactor_enabled"
                                            className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <Switch
                                                id="reply_refactor_enabled"
                                                checked={data.reply_refactor_enabled}
                                                onCheckedChange={(checked) =>
                                                    setData('reply_refactor_enabled', checked)
                                                }
                                                className="mt-0.5"
                                            />
                                            <div className="space-y-1">
                                                <span className="font-medium">Tekst verbeteren</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Verbeter en herformuleer geschreven antwoorden met AI
                                                </p>
                                            </div>
                                        </label>

                                        <label
                                            htmlFor="auto_replies_enabled"
                                            className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <Switch
                                                id="auto_replies_enabled"
                                                checked={data.auto_replies_enabled}
                                                onCheckedChange={(checked) =>
                                                    setData('auto_replies_enabled', checked)
                                                }
                                                className="mt-0.5"
                                            />
                                            <div className="space-y-1">
                                                <span className="font-medium">
                                                    Automatische antwoorden{' '}
                                                    <span className="text-xs text-muted-foreground">(binnenkort)</span>
                                                </span>
                                                <p className="text-xs text-muted-foreground">
                                                    Stuur automatisch AI-gegenereerde antwoorden naar nieuwe tickets
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">Aangepaste instructies</h3>

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

                                {/* Privacy & Compliance Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        Privacy & Gegevensbescherming
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Bepaal welke gegevens naar de AI-provider worden verzonden (GDPR/AI-Act)
                                    </p>

                                    <div className="space-y-3">
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Gegevens in AI-prompts
                                        </h4>

                                        <label
                                            htmlFor="include_customer_name"
                                            className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <div className="space-y-0.5">
                                                <span className="font-medium text-sm">Klantnaam</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Naam van de klant meesturen naar AI
                                                </p>
                                            </div>
                                            <Switch
                                                id="include_customer_name"
                                                checked={data.include_customer_name}
                                                onCheckedChange={(checked) =>
                                                    setData('include_customer_name', checked)
                                                }
                                            />
                                        </label>

                                        <label
                                            htmlFor="include_agent_name"
                                            className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <div className="space-y-0.5">
                                                <span className="font-medium text-sm">Medewerkersnaam</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Naam van de medewerker meesturen naar AI
                                                </p>
                                            </div>
                                            <Switch
                                                id="include_agent_name"
                                                checked={data.include_agent_name}
                                                onCheckedChange={(checked) =>
                                                    setData('include_agent_name', checked)
                                                }
                                            />
                                        </label>

                                        <label
                                            htmlFor="include_ticket_subject"
                                            className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <div className="space-y-0.5">
                                                <span className="font-medium text-sm">Ticket onderwerp</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Onderwerp van het ticket meesturen naar AI
                                                </p>
                                            </div>
                                            <Switch
                                                id="include_ticket_subject"
                                                checked={data.include_ticket_subject}
                                                onCheckedChange={(checked) =>
                                                    setData('include_ticket_subject', checked)
                                                }
                                            />
                                        </label>

                                        <label
                                            htmlFor="include_department_name"
                                            className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <div className="space-y-0.5">
                                                <span className="font-medium text-sm">Afdelingsnaam</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Naam van de afdeling meesturen naar AI
                                                </p>
                                            </div>
                                            <Switch
                                                id="include_department_name"
                                                checked={data.include_department_name}
                                                onCheckedChange={(checked) =>
                                                    setData('include_department_name', checked)
                                                }
                                            />
                                        </label>

                                        <label
                                            htmlFor="include_message_history"
                                            className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <div className="space-y-0.5">
                                                <span className="font-medium text-sm">Berichtgeschiedenis</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Eerdere berichten van het ticket meesturen naar AI
                                                </p>
                                            </div>
                                            <Switch
                                                id="include_message_history"
                                                checked={data.include_message_history}
                                                onCheckedChange={(checked) =>
                                                    setData('include_message_history', checked)
                                                }
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
                                        <p className="text-xs text-muted-foreground">
                                            Informeer klanten wanneer AI is gebruikt bij het beantwoorden
                                        </p>

                                        <label
                                            htmlFor="disclosure_enabled"
                                            className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                        >
                                            <div className="space-y-0.5">
                                                <span className="font-medium text-sm">AI-melding inschakelen</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Toon een melding wanneer AI is gebruikt
                                                </p>
                                            </div>
                                            <Switch
                                                id="disclosure_enabled"
                                                checked={data.disclosure_enabled}
                                                onCheckedChange={(checked) =>
                                                    setData('disclosure_enabled', checked)
                                                }
                                            />
                                        </label>

                                        {data.disclosure_enabled && (
                                            <div className="space-y-3 pl-4 border-l-2 border-muted ml-3">
                                                <label
                                                    htmlFor="disclosure_in_email"
                                                    className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                                >
                                                    <span className="font-medium text-sm">Tonen in e-mail</span>
                                                    <Switch
                                                        id="disclosure_in_email"
                                                        checked={data.disclosure_in_email}
                                                        onCheckedChange={(checked) =>
                                                            setData('disclosure_in_email', checked)
                                                        }
                                                    />
                                                </label>

                                                <label
                                                    htmlFor="disclosure_in_portal"
                                                    className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                                >
                                                    <span className="font-medium text-sm">Tonen in klantenportaal</span>
                                                    <Switch
                                                        id="disclosure_in_portal"
                                                        checked={data.disclosure_in_portal}
                                                        onCheckedChange={(checked) =>
                                                            setData('disclosure_in_portal', checked)
                                                        }
                                                    />
                                                </label>

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
