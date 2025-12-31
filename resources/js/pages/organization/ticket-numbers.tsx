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
import { update } from '@/routes/organization/ticket-numbers';
import { type Organization, type OrganizationSettings } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Info, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
    organization: Organization;
    settings: OrganizationSettings & { preview_ticket_number?: string };
}

const formatVariableKeys = [
    { variable: '{prefix}', key: 'format_prefix' },
    { variable: '{number}', key: 'format_number' },
    { variable: '{random}', key: 'format_random' },
    { variable: '{yyyy}', key: 'format_year_full' },
    { variable: '{yy}', key: 'format_year_short' },
    { variable: '{mm}', key: 'format_month' },
    { variable: '{dd}', key: 'format_day' },
];

export default function TicketNumbers({ settings }: Props) {
    const { t } = useTranslation('organization');
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        ticket_prefix: settings.ticket_prefix || 'TKT',
        ticket_number_format: settings.ticket_number_format || '{prefix}-{number}',
        use_random_numbers: settings.use_random_numbers || false,
        random_number_length: settings.random_number_length || 6,
    });

    const getPreview = () => {
        const now = new Date();
        const number = data.use_random_numbers
            ? 'X'.repeat(data.random_number_length)
            : String(settings.next_ticket_number || 1).padStart(5, '0');
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
        patch(update().url, { preserveScroll: true });
    }

    return (
        <AppLayout>
            <Head title={t('ticket_numbers.page_title')} />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Hash className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{t('ticket_numbers.title')}</CardTitle>
                                    <CardDescription>
                                        {t('ticket_numbers.description')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                                    <span className="text-sm text-muted-foreground">{t('ticket_numbers.preview')}</span>
                                    <span className="font-mono text-sm font-medium">{getPreview()}</span>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="ticket_prefix">{t('ticket_numbers.prefix')}</Label>
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
                                            <Label htmlFor="ticket_number_format">{t('ticket_numbers.format')}</Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-xs">
                                                    <div className="space-y-1 text-xs">
                                                        {formatVariableKeys.map((v) => (
                                                            <div key={v.variable} className="flex justify-between gap-2">
                                                                <code className="rounded bg-muted px-1">{v.variable}</code>
                                                                <span className="text-muted-foreground">{t(`ticket_numbers.${v.key}`)}</span>
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
                                    {formatVariableKeys.map((v) => (
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

                                <label
                                    htmlFor="use_random_numbers"
                                    className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                >
                                    <Switch
                                        id="use_random_numbers"
                                        checked={data.use_random_numbers}
                                        onCheckedChange={(checked) => setData('use_random_numbers', checked)}
                                        className="mt-0.5"
                                    />
                                    <div className="space-y-1 flex-1">
                                        <span className="font-medium">{t('ticket_numbers.random_numbers')}</span>
                                        <p className="text-xs text-muted-foreground">
                                            {t('ticket_numbers.random_numbers_description')}
                                        </p>
                                        {data.use_random_numbers && (
                                            <div className="mt-3 max-w-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">{t('ticket_numbers.length')}</span>
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
                                </label>

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
