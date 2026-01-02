import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { type MessagingChannel, type MessagingAccount, type Department } from '@/types';
import { Head, useForm, Link } from '@inertiajs/react';
import { update } from '@/routes/organization/messaging-channels/configure';
import { index } from '@/routes/organization/messaging-channels';
import { ArrowLeft, Building2, Loader2, MessageCircle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    channel: MessagingChannel;
    accounts: MessagingAccount[];
    departments: Department[];
}

export default function Configure({ channel, accounts, departments }: Props) {
    const { t } = useTranslation('organization');

    const { data, setData, patch, processing, errors } = useForm({
        external_id: channel.external_id || '',
        external_name: channel.external_name || '',
        external_username: channel.external_username || '',
        department_id: channel.department_id?.toString() || '',
        page_access_token: '',
    });

    const selectedAccount = accounts.find((a) => a.id === data.external_id);

    function handleAccountSelect(accountId: string) {
        const account = accounts.find((a) => a.id === accountId);
        if (account) {
            setData({
                ...data,
                external_id: account.id,
                external_name: account.name,
                external_username: account.username || '',
                page_access_token: account.page_access_token || '',
            });
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(update(channel.id).url);
    }

    return (
        <AppLayout>
            <Head title={t('messaging_channels.configure.page_title', { name: channel.name })} />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href={index().url}
                            className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-semibold">
                                {t('messaging_channels.configure.title', { name: channel.name })}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {t('messaging_channels.configure.subtitle')}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <User className="h-5 w-5" />
                                    {t('messaging_channels.configure.account_card.title')}
                                </CardTitle>
                                <CardDescription>
                                    {t('messaging_channels.configure.account_card.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {accounts.length > 0 ? (
                                    <RadioGroup
                                        value={data.external_id}
                                        onValueChange={handleAccountSelect}
                                        className="space-y-3"
                                    >
                                        {accounts.map((account) => (
                                            <label
                                                key={account.id}
                                                htmlFor={account.id}
                                                className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                                                    data.external_id === account.id ? 'border-primary bg-primary/5' : ''
                                                }`}
                                            >
                                                <RadioGroupItem value={account.id} id={account.id} />
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                        <MessageCircle className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">{account.name}</span>
                                                        {account.username && (
                                                            <p className="text-sm text-muted-foreground">
                                                                @{account.username}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </RadioGroup>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
                                        <h3 className="mt-4 text-lg font-semibold">
                                            {t('messaging_channels.configure.no_accounts_title')}
                                        </h3>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {t('messaging_channels.configure.no_accounts_description')}
                                        </p>
                                    </div>
                                )}
                                <InputError message={errors.external_id} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Building2 className="h-5 w-5" />
                                    {t('messaging_channels.configure.department_card.title')}
                                </CardTitle>
                                <CardDescription>
                                    {t('messaging_channels.configure.department_card.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2">
                                    <Label htmlFor="department_id">{t('messaging_channels.configure.department_label')}</Label>
                                    <Select
                                        value={data.department_id}
                                        onValueChange={(value) => setData('department_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('messaging_channels.configure.department_placeholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((department) => (
                                                <SelectItem key={department.id} value={department.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-2 w-2 rounded-full"
                                                            style={{ backgroundColor: department.color }}
                                                        />
                                                        {department.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.department_id} />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" asChild>
                                <Link href={index().url}>{t('common.cancel')}</Link>
                            </Button>
                            <Button type="submit" disabled={processing || !data.external_id}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('messaging_channels.configure.activate')}
                            </Button>
                        </div>
                    </form>
                </div>
            </OrganizationLayout>
        </AppLayout>
    );
}
