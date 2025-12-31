import * as React from 'react';
import { useTranslation } from 'react-i18next';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { update, verifyDns } from '@/routes/organization/portal';
import { type Organization, type OrganizationSettings } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm, router } from '@inertiajs/react';
import { Globe, Copy, Check, ExternalLink, Link2, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
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
    const { t } = useTranslation('organization');
    const [copied, setCopied] = React.useState(false);
    const [copiedDomain, setCopiedDomain] = React.useState(false);
    const [verifying, setVerifying] = React.useState(false);

    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        slug: organization.slug || '',
        portal_enabled: settings.portal_enabled ?? true,
        custom_domain: settings.custom_domain || '',
    });

    const getPortalUrl = () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return `${baseUrl}/${data.slug}/portal`;
    };

    const getCustomDomainUrl = () => {
        if (!data.custom_domain) return '';
        return `https://${data.custom_domain}`;
    };

    const copyPortalUrl = async () => {
        await navigator.clipboard.writeText(getPortalUrl());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copyCustomDomainUrl = async () => {
        await navigator.clipboard.writeText(getCustomDomainUrl());
        setCopiedDomain(true);
        setTimeout(() => setCopiedDomain(false), 2000);
    };

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(update().url, { preserveScroll: true });
    }

    function handleVerifyDns() {
        setVerifying(true);
        router.post(verifyDns().url, {}, {
            preserveScroll: true,
            onFinish: () => setVerifying(false),
        });
    }

    // Check if domain has been modified from saved value
    const domainModified = data.custom_domain !== (settings.custom_domain || '');
    const isVerified = settings.custom_domain_verified && !domainModified;

    return (
        <AppLayout>
            <Head title={t('portal.page_title')} />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    {/* Portal Toggle Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Globe className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-lg">{t('portal.title')}</CardTitle>
                                    <CardDescription>
                                        {t('portal.description')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Portal Enabled Toggle */}
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="portal_enabled" className="text-base font-medium">
                                            {t('portal.enable_portal')}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            {data.portal_enabled
                                                ? t('portal.enabled_description')
                                                : t('portal.disabled_description')}
                                        </p>
                                    </div>
                                    <Switch
                                        id="portal_enabled"
                                        checked={data.portal_enabled}
                                        onCheckedChange={(checked) => setData('portal_enabled', checked)}
                                    />
                                </div>

                                {/* URL Slug */}
                                <div className="space-y-2">
                                    <Label htmlFor="slug">{t('portal.url_slug')}</Label>
                                    <Input
                                        id="slug"
                                        value={data.slug}
                                        onChange={(e) => setData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        placeholder={t('portal.slug_placeholder')}
                                        className="max-w-xs font-mono"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('portal.slug_help')}
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
                                                <TooltipContent>{t('portal.copy_url')}</TooltipContent>
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
                                                <TooltipContent>{t('portal.open_portal')}</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 pt-2">
                                    <Button type="submit" disabled={processing}>
                                        {t('common.save')}
                                    </Button>
                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-muted-foreground">{t('common.saved')}</p>
                                    </Transition>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Custom Domain Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                                    <Link2 className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{t('portal.custom_domain_title')}</CardTitle>
                                    <CardDescription>
                                        {t('portal.custom_domain_description')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="custom_domain">{t('portal.domain_name')}</Label>
                                    <Input
                                        id="custom_domain"
                                        value={data.custom_domain}
                                        onChange={(e) => setData('custom_domain', e.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''))}
                                        placeholder={t('portal.domain_placeholder')}
                                        className="max-w-sm font-mono"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('portal.domain_help')}
                                    </p>
                                    <InputError message={errors.custom_domain} />
                                </div>

                                {data.custom_domain && (
                                    <>
                                        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-mono text-sm">{getCustomDomainUrl()}</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={copyCustomDomainUrl}
                                                            className="h-8 px-2"
                                                        >
                                                            {copiedDomain ? (
                                                                <Check className="h-4 w-4 text-green-600" />
                                                            ) : (
                                                                <Copy className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t('portal.copy_url')}</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        {isVerified ? (
                                            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">
                                                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                                        {t('portal.dns_verified')}
                                                    </p>
                                                    <p className="text-sm text-green-700 dark:text-green-300">
                                                        {t('portal.dns_verified_description')}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleVerifyDns}
                                                    disabled={verifying || domainModified}
                                                    className="shrink-0"
                                                >
                                                    <RefreshCw className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                    <div className="flex-1 space-y-3">
                                                        <div>
                                                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                                                {t('portal.dns_required')}
                                                            </p>
                                                            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                                                                {t('portal.dns_required_description_prefix')}{' '}
                                                                <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/50">{data.custom_domain}</code>{' '}
                                                                {t('portal.dns_required_description_points_to')}{' '}
                                                                <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/50">{typeof window !== 'undefined' ? window.location.host : 'your-fluxdesk-domain'}</code>
                                                            </p>
                                                        </div>
                                                        {!domainModified && settings.custom_domain && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleVerifyDns}
                                                                disabled={verifying}
                                                                className="bg-white dark:bg-transparent"
                                                            >
                                                                {verifying ? (
                                                                    <>
                                                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                                        {t('portal.verifying')}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ShieldCheck className="h-4 w-4 mr-2" />
                                                                        {t('portal.verify_dns')}
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                        {domainModified && (
                                                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                                                {t('portal.save_first')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="flex items-center gap-4 pt-2">
                                    <Button type="submit" disabled={processing}>
                                        {t('common.save')}
                                    </Button>
                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-muted-foreground">{t('common.saved')}</p>
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
