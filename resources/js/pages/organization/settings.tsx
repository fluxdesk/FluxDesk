import * as React from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { index } from '@/routes/organization/settings';
import { type Organization, type OrganizationSettings } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm, router } from '@inertiajs/react';
import { ColorPicker } from '@/components/common/color-picker';
import { Trash2, Info, Upload, ImageIcon, Mail, Globe, Copy, Check, ExternalLink, Palette, Settings as SettingsIcon } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
    organization: Organization;
    settings: OrganizationSettings;
    canSetSystemDefault: boolean;
}

const formatVariables = [
    { variable: '{prefix}', description: 'Ticket voorvoegsel' },
    { variable: '{number}', description: 'Volgnummer' },
    { variable: '{random}', description: 'Willekeurige reeks' },
    { variable: '{yyyy}', description: 'Volledig jaar' },
    { variable: '{yy}', description: 'Kort jaar' },
    { variable: '{mm}', description: 'Maand (01-12)' },
    { variable: '{dd}', description: 'Dag (01-31)' },
];

export default function Settings({ organization, settings, canSetSystemDefault }: Props) {
    const [copied, setCopied] = React.useState(false);

    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        slug: organization.slug || '',
        primary_color: settings.primary_color || '#3b82f6',
        secondary_color: settings.secondary_color || '#6b7280',
        accent_color: settings.accent_color || '#10b981',
        email_background_color: settings.email_background_color || '#1A1A2E',
        ticket_prefix: settings.ticket_prefix || 'TKT',
        ticket_number_format: settings.ticket_number_format || '{prefix}-{number}',
        use_random_numbers: settings.use_random_numbers || false,
        random_number_length: settings.random_number_length || 6,
        timezone: settings.timezone || 'UTC',
        is_system_default: organization.is_system_default || false,
    });

    const getPortalUrl = () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return `${baseUrl}/${data.slug}/portal`;
    };

    const copyPortalUrl = async () => {
        await navigator.clipboard.writeText(getPortalUrl());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getPreview = () => {
        const now = new Date();
        const number = data.use_random_numbers
            ? 'X'.repeat(data.random_number_length)
            : String(settings.next_ticket_number).padStart(5, '0');
        const random = 'X'.repeat(data.random_number_length);

        return data.ticket_number_format
            .replace('{prefix}', data.ticket_prefix)
            .replace('{number}', number)
            .replace('{random}', random)
            .replace('{yyyy}', String(now.getFullYear()))
            .replace('{yy}', String(now.getFullYear()).slice(-2))
            .replace('{y}', String(now.getFullYear()).slice(-2))
            .replace('{mm}', String(now.getMonth() + 1).padStart(2, '0'))
            .replace('{m}', String(now.getMonth() + 1))
            .replace('{dd}', String(now.getDate()).padStart(2, '0'))
            .replace('{d}', String(now.getDate()));
    };

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(index().url, { preserveScroll: true });
    }

    function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            const formData = new FormData();
            formData.append('logo', file);
            router.post(`${index().url}/logo`, formData, {
                forceFormData: true,
                preserveScroll: true,
            });
        }
    }

    function handleDeleteLogo() {
        router.delete(`${index().url}/logo`, { preserveScroll: true });
    }

    function handleEmailLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            const formData = new FormData();
            formData.append('email_logo', file);
            router.post(`${index().url}/email-logo`, formData, {
                forceFormData: true,
                preserveScroll: true,
            });
        }
    }

    function handleDeleteEmailLogo() {
        router.delete(`${index().url}/email-logo`, { preserveScroll: true });
    }

    return (
        <AppLayout>
            <Head title="Organisatie-instellingen" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    {/* Card 1: Huisstijl (Branding) */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Palette className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <CardTitle className="text-lg">Huisstijl</CardTitle>
                                    <CardDescription>
                                        Logo's en kleuren van je organisatie
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Logos Section */}
                                <div>
                                    <Label className="mb-4 block text-sm font-medium">Logo's</Label>
                                    <div className="grid gap-6 sm:grid-cols-2">
                                        {/* Main Logo */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">App logo</span>
                                            </div>
                                            {settings.logo_path ? (
                                                <div className="space-y-3">
                                                    <div className="inline-block rounded-lg border bg-muted/30 p-3">
                                                        <img
                                                            src={`/storage/${settings.logo_path}`}
                                                            alt="Organization logo"
                                                            className="max-h-16 w-auto object-contain"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className="cursor-pointer">
                                                            <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">
                                                                <Upload className="h-3.5 w-3.5" />
                                                                Wijzigen
                                                            </div>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleLogoUpload}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleDeleteLogo}
                                                            className="h-auto px-2.5 py-1.5 text-xs text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                            Verwijder
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="block cursor-pointer">
                                                    <div className="flex h-20 items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
                                                            {organization.name.charAt(0)}
                                                        </div>
                                                        <div className="text-xs">
                                                            <p className="font-medium text-muted-foreground">Upload logo</p>
                                                            <p className="text-muted-foreground/60">PNG, JPG, SVG</p>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>

                                        {/* Email Logo */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">E-mail logo</span>
                                            </div>
                                            {settings.email_logo_path ? (
                                                <div className="space-y-3">
                                                    <div className="inline-block rounded-lg border bg-muted/30 p-3">
                                                        <img
                                                            src={`/storage/${settings.email_logo_path}`}
                                                            alt="Email logo"
                                                            className="max-h-16 w-auto object-contain"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className="cursor-pointer">
                                                            <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">
                                                                <Upload className="h-3.5 w-3.5" />
                                                                Wijzigen
                                                            </div>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleEmailLogoUpload}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleDeleteEmailLogo}
                                                            className="h-auto px-2.5 py-1.5 text-xs text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                            Verwijder
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="block cursor-pointer">
                                                    <div className="flex h-20 items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                            <Mail className="h-5 w-5 text-muted-foreground/50" />
                                                        </div>
                                                        <div className="text-xs">
                                                            <p className="font-medium text-muted-foreground">Upload logo</p>
                                                            <p className="text-muted-foreground/60">PNG, JPG, SVG</p>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleEmailLogoUpload}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Colors Section */}
                                <div className="space-y-4">
                                    <Label className="text-sm font-medium">Kleuren</Label>
                                    <div className="grid gap-4 sm:grid-cols-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Primair</Label>
                                            <ColorPicker
                                                value={data.primary_color}
                                                onChange={(color) => setData('primary_color', color)}
                                            />
                                            <InputError message={errors.primary_color} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Secundair</Label>
                                            <ColorPicker
                                                value={data.secondary_color}
                                                onChange={(color) => setData('secondary_color', color)}
                                            />
                                            <InputError message={errors.secondary_color} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Accent</Label>
                                            <ColorPicker
                                                value={data.accent_color}
                                                onChange={(color) => setData('accent_color', color)}
                                            />
                                            <InputError message={errors.accent_color} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">E-mail achtergrond</Label>
                                            <ColorPicker
                                                value={data.email_background_color}
                                                onChange={(color) => setData('email_background_color', color)}
                                            />
                                            <InputError message={errors.email_background_color} />
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex items-center gap-4 border-t pt-6">
                                    <Button type="submit" disabled={processing}>
                                        Huisstijl opslaan
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

                    {/* Card 2: Instellingen (Settings) */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <CardTitle className="text-lg">Instellingen</CardTitle>
                                    <CardDescription>
                                        Ticketnummering, tijdzone en klantenportaal
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Ticket Numbers Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">Ticketnummers</Label>
                                        <div className="rounded-md bg-muted px-2.5 py-1">
                                            <span className="font-mono text-sm">{getPreview()}</span>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="ticket_prefix" className="text-xs text-muted-foreground">Voorvoegsel</Label>
                                            <Input
                                                id="ticket_prefix"
                                                value={data.ticket_prefix}
                                                onChange={(e) => setData('ticket_prefix', e.target.value)}
                                                placeholder="TKT"
                                                maxLength={10}
                                                className="font-mono"
                                            />
                                            <InputError message={errors.ticket_prefix} />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="ticket_number_format" className="text-xs text-muted-foreground">Opmaak</Label>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-xs">
                                                        <div className="space-y-1 text-xs">
                                                            {formatVariables.map((v) => (
                                                                <div key={v.variable} className="flex justify-between gap-2">
                                                                    <code className="rounded bg-muted px-1">{v.variable}</code>
                                                                    <span className="text-muted-foreground">{v.description}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                            <Input
                                                id="ticket_number_format"
                                                value={data.ticket_number_format}
                                                onChange={(e) => setData('ticket_number_format', e.target.value)}
                                                placeholder="{prefix}-{number}"
                                                className="font-mono"
                                            />
                                            <InputError message={errors.ticket_number_format} />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1">
                                        {formatVariables.map((v) => (
                                            <Badge
                                                key={v.variable}
                                                variant="secondary"
                                                className="cursor-pointer font-mono text-xs hover:bg-primary hover:text-primary-foreground"
                                                onClick={() =>
                                                    setData('ticket_number_format', data.ticket_number_format + v.variable)
                                                }
                                            >
                                                {v.variable}
                                            </Badge>
                                        ))}
                                    </div>

                                    <div className="rounded-lg border bg-muted/20 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="use_random_numbers" className="text-sm">Willekeurige nummers</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Willekeurige ID's i.p.v. opeenvolgend
                                                </p>
                                            </div>
                                            <Switch
                                                id="use_random_numbers"
                                                checked={data.use_random_numbers}
                                                onCheckedChange={(checked) => setData('use_random_numbers', checked)}
                                            />
                                        </div>

                                        {data.use_random_numbers && (
                                            <div className="mt-4 max-w-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs">Lengte</Label>
                                                    <span className="text-xs font-medium">{data.random_number_length}</span>
                                                </div>
                                                <Slider
                                                    value={[data.random_number_length]}
                                                    onValueChange={(value) => setData('random_number_length', value[0])}
                                                    min={4}
                                                    max={12}
                                                    step={1}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Timezone Section */}
                                <div className="space-y-2">
                                    <Label htmlFor="timezone" className="text-sm font-medium">Tijdzone</Label>
                                    <Input
                                        id="timezone"
                                        value={data.timezone}
                                        onChange={(e) => setData('timezone', e.target.value)}
                                        placeholder="Europe/Amsterdam"
                                        className="max-w-xs"
                                    />
                                    <InputError message={errors.timezone} />
                                </div>

                                {/* System Default Section - Super Admin Only */}
                                {canSetSystemDefault && (
                                    <div className="rounded-lg border bg-muted/20 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="is_system_default" className="text-sm">Standaard organisatie</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Stel in als systeemstandaard voor nieuwe gebruikers zonder organisatie
                                                </p>
                                            </div>
                                            <Switch
                                                id="is_system_default"
                                                checked={data.is_system_default}
                                                onCheckedChange={(checked) => setData('is_system_default', checked)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Portal Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium">Klantenportaal</Label>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="slug" className="text-xs text-muted-foreground">URL-slug</Label>
                                        <Input
                                            id="slug"
                                            value={data.slug}
                                            onChange={(e) => setData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            placeholder="mijn-organisatie"
                                            className="max-w-xs font-mono"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Alleen kleine letters, cijfers en koppeltekens
                                        </p>
                                        <InputError message={errors.slug} />
                                    </div>

                                    {data.slug && (
                                        <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-mono text-sm">{getPortalUrl()}</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={copyPortalUrl}
                                                    className="h-8 px-2"
                                                >
                                                    {copied ? (
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => window.open(getPortalUrl(), '_blank')}
                                                    className="h-8 px-2"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Save Button */}
                                <div className="flex items-center gap-4 border-t pt-6">
                                    <Button type="submit" disabled={processing}>
                                        Instellingen opslaan
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
                </div>
            </OrganizationLayout>
        </AppLayout>
    );
}
