import * as React from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { update } from '@/routes/organization/portal';
import { type Organization, type OrganizationSettings } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Globe, Copy, Check, ExternalLink } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
    organization: Organization;
    settings: OrganizationSettings;
}

export default function Portal({ organization, settings }: Props) {
    const [copied, setCopied] = React.useState(false);

    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        slug: organization.slug || '',
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

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(update().url, { preserveScroll: true });
    }

    return (
        <AppLayout>
            <Head title="Klantenportaal" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Globe className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Klantenportaal</CardTitle>
                                    <CardDescription>
                                        URL en instellingen voor het klantenportaal
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="slug">URL-slug</Label>
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
                                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-mono text-sm">{getPortalUrl()}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
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
                                                </TooltipTrigger>
                                                <TooltipContent>Kopieer URL</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(getPortalUrl(), '_blank')}
                                                        className="h-8 px-2"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Open portaal</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                )}

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
