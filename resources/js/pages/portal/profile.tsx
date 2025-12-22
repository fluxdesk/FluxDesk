import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PortalLayout from '@/layouts/portal/portal-layout';
import { type PortalSharedData } from '@/types/portal';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function PortalProfile() {
    const { organization, contact } = usePage<PortalSharedData>().props;
    const primaryColor = organization?.settings?.primary_color ?? '#18181b';
    const orgSlug = organization?.slug ?? '';
    const [showSuccess, setShowSuccess] = useState(false);

    const form = useForm({
        name: contact?.name ?? '',
        phone: contact?.phone ?? '',
        company: contact?.company ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch(`/${orgSlug}/portal/profile`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowSuccess(true);
            },
        });
    };

    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess]);

    return (
        <PortalLayout>
            <Head title="Profiel" />

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-xl">Mijn profiel</CardTitle>
                    <CardDescription>
                        Beheer je contactgegevens. Je e-mailadres kan niet worden gewijzigd.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email (disabled) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mailadres</Label>
                            <Input
                                id="email"
                                type="email"
                                value={contact?.email ?? ''}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                Je e-mailadres kan niet worden gewijzigd.
                            </p>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Naam</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Je naam"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                disabled={form.processing}
                            />
                            {form.errors.name && (
                                <p className="text-sm text-destructive">{form.errors.name}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefoonnummer</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+31 6 12345678"
                                value={form.data.phone}
                                onChange={(e) => form.setData('phone', e.target.value)}
                                disabled={form.processing}
                            />
                            {form.errors.phone && (
                                <p className="text-sm text-destructive">{form.errors.phone}</p>
                            )}
                        </div>

                        {/* Company */}
                        <div className="space-y-2">
                            <Label htmlFor="company">Bedrijfsnaam</Label>
                            <Input
                                id="company"
                                type="text"
                                placeholder="Je bedrijf"
                                value={form.data.company}
                                onChange={(e) => form.setData('company', e.target.value)}
                                disabled={form.processing}
                            />
                            {form.errors.company && (
                                <p className="text-sm text-destructive">{form.errors.company}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            {showSuccess && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle2 className="size-4" />
                                    Profiel bijgewerkt
                                </div>
                            )}
                            <div className={showSuccess ? '' : 'ml-auto'}>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    className="text-white"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {form.processing ? (
                                        <>
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            Opslaan...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="size-4 mr-2" />
                                            Opslaan
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </PortalLayout>
    );
}
