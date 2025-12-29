import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { index, update } from '@/routes/organization/branding';
import { type Organization, type OrganizationSettings } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm, router } from '@inertiajs/react';
import { ColorPicker } from '@/components/common/color-picker';
import { Input } from '@/components/ui/input';
import { Trash2, Upload, ImageIcon, Mail, Palette, Eye } from 'lucide-react';

interface Props {
    organization: Organization;
    settings: OrganizationSettings;
}

export default function Branding({ organization, settings }: Props) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        primary_color: settings.primary_color || '#3b82f6',
        secondary_color: settings.secondary_color || '#6b7280',
        accent_color: settings.accent_color || '#10b981',
        email_background_color: settings.email_background_color || '#1A1A2E',
        email_footer_text: settings.email_footer_text || '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(update().url, { preserveScroll: true });
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
            <Head title="Huisstijl" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Palette className="h-5 w-5 text-primary" />
                                </div>
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

                                {/* Email Footer Text */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">E-mail voettekst</Label>
                                    <Input
                                        value={data.email_footer_text}
                                        onChange={(e) => setData('email_footer_text', e.target.value)}
                                        placeholder="Deze e-mail is verzonden via FluxDesk"
                                        className="max-w-md"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Tekst onderaan elke uitgaande e-mail. Laat leeg om te verbergen.
                                    </p>
                                    <InputError message={errors.email_footer_text} />
                                </div>

                                {/* Email Preview Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium">E-mail voorbeeld</Label>
                                    </div>
                                    <div
                                        className="overflow-hidden rounded-lg border"
                                        style={{ backgroundColor: data.email_background_color }}
                                    >
                                        <div className="flex justify-center p-6 sm:p-8">
                                            <div className="w-full max-w-[320px]">
                                                {/* Logo */}
                                                {settings.email_logo_path && (
                                                    <div className="mb-4 text-center">
                                                        <img
                                                            src={`/storage/${settings.email_logo_path}`}
                                                            alt="Logo"
                                                            className="mx-auto h-8 w-auto"
                                                        />
                                                    </div>
                                                )}

                                                {/* Email card */}
                                                <div className="overflow-hidden rounded-xl bg-white shadow-lg">
                                                    {/* Header band */}
                                                    <div
                                                        className="px-5 py-4"
                                                        style={{ backgroundColor: data.primary_color }}
                                                    >
                                                        <span className="text-sm font-semibold text-white">
                                                            Ticket ontvangen
                                                        </span>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="space-y-4 p-5">
                                                        <p className="text-sm leading-relaxed text-gray-700">
                                                            Beste klant,
                                                        </p>
                                                        <p className="text-sm leading-relaxed text-gray-700">
                                                            We hebben uw verzoek ontvangen en zullen zo snel mogelijk reageren.
                                                        </p>

                                                        {/* Ticket info card */}
                                                        <div className="rounded-lg bg-gray-50 p-4">
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                                                        Ticketnummer
                                                                    </span>
                                                                    <p className="mt-0.5 text-sm font-semibold text-gray-900">
                                                                        #12345
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                                                        Onderwerp
                                                                    </span>
                                                                    <p className="mt-0.5 text-sm text-gray-700">
                                                                        Voorbeeld onderwerp
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* CTA Button */}
                                                        <div className="pt-2 text-center">
                                                            <span
                                                                className="inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-white"
                                                                style={{ backgroundColor: data.primary_color }}
                                                            >
                                                                Bekijk ticket
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer */}
                                                <div className="mt-4 text-center">
                                                    <span className="text-xs text-gray-500">
                                                        {organization.name}
                                                    </span>
                                                    {(data.email_footer_text || !settings.email_footer_text) && (
                                                        <p className="mt-1 text-[10px] text-gray-400">
                                                            {data.email_footer_text || 'Deze e-mail is verzonden via FluxDesk'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
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
                </div>
            </OrganizationLayout>
        </AppLayout>
    );
}
