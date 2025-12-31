import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { type EmailChannel, type MailFolder, type PostImportActionOption, type Department } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { update } from '@/routes/organization/email-channels/configure';
import { ArrowLeft, Building2, Calendar, FolderInput, Loader2, Mail, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@inertiajs/react';
import { index } from '@/routes/organization/email-channels';

interface Props {
    channel: EmailChannel & { department_id?: number };
    mailFolders: MailFolder[];
    postImportActions: PostImportActionOption[];
    departments: Department[];
    defaultImportSince: string;
}

export default function Configure({ channel, mailFolders, postImportActions, departments, defaultImportSince }: Props) {
    const { t } = useTranslation('organization');
    const { data, setData, patch, processing, errors } = useForm({
        department_id: channel.department_id?.toString() || departments.find((d) => d.is_default)?.id.toString() || '',
        fetch_folder: channel.fetch_folder || '',
        post_import_action: channel.post_import_action || 'nothing',
        post_import_folder: channel.post_import_folder || '',
        sync_interval_minutes: channel.sync_interval_minutes || 5,
        import_old_emails: false,
        import_emails_since: defaultImportSince,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(update(channel.id).url);
    }

    return (
        <AppLayout>
            <Head title={t('email_channels.configure.page_title', { name: channel.name })} />

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
                                {t('email_channels.configure.title', { name: channel.name })}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {t('email_channels.configure.connected_as', { email: channel.email_address })}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Building2 className="h-5 w-5" />
                                    {t('email_channels.configure.department_card.title')}
                                </CardTitle>
                                <CardDescription>
                                    {t('email_channels.configure.department_card.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2">
                                    <Label htmlFor="department_id">{t('email_channels.configure.department_label')}</Label>
                                    <Select
                                        value={data.department_id}
                                        onValueChange={(value) => setData('department_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('email_channels.configure.department_placeholder')} />
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

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FolderInput className="h-5 w-5" />
                                    {t('email_channels.configure.folder_card.title')}
                                </CardTitle>
                                <CardDescription>
                                    {t('email_channels.configure.folder_card.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="fetch_folder">{t('email_channels.configure.folder_label')}</Label>
                                    {mailFolders.length > 0 ? (
                                        <Select
                                            value={data.fetch_folder}
                                            onValueChange={(value) => setData('fetch_folder', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('email_channels.configure.folder_placeholder')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mailFolders.map((folder) => (
                                                    <SelectItem key={folder.id} value={folder.id}>
                                                        {folder.display_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {t('email_channels.configure.folders_loading')}
                                        </div>
                                    )}
                                    <InputError message={errors.fetch_folder} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Calendar className="h-5 w-5" />
                                    {t('email_channels.configure.history_card.title')}
                                </CardTitle>
                                <CardDescription>
                                    {t('email_channels.configure.history_card.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <RadioGroup
                                    value={data.import_old_emails ? 'yes' : 'no'}
                                    onValueChange={(value) => setData('import_old_emails', value === 'yes')}
                                    className="space-y-3"
                                >
                                    <label
                                        htmlFor="import_no"
                                        className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                                            !data.import_old_emails ? 'border-primary bg-primary/5' : ''
                                        }`}
                                    >
                                        <RadioGroupItem value="no" id="import_no" className="mt-0.5" />
                                        <div className="flex-1">
                                            <span className="font-medium">{t('email_channels.configure.history_new_only')}</span>
                                            <p className="text-sm text-muted-foreground">
                                                {t('email_channels.configure.history_new_only_description')}
                                            </p>
                                        </div>
                                    </label>
                                    <label
                                        htmlFor="import_yes"
                                        className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                                            data.import_old_emails ? 'border-primary bg-primary/5' : ''
                                        }`}
                                    >
                                        <RadioGroupItem value="yes" id="import_yes" className="mt-0.5" />
                                        <div className="flex-1">
                                            <span className="font-medium">{t('email_channels.configure.history_import_old')}</span>
                                            <p className="text-sm text-muted-foreground">
                                                {t('email_channels.configure.history_import_old_description')}
                                            </p>
                                        </div>
                                    </label>
                                </RadioGroup>

                                {data.import_old_emails && (
                                    <div className="grid gap-2 pt-2 pl-7">
                                        <Label htmlFor="import_emails_since">{t('email_channels.configure.history_since_label')}</Label>
                                        <Input
                                            type="date"
                                            id="import_emails_since"
                                            value={data.import_emails_since}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setData('import_emails_since', e.target.value)}
                                            className="max-w-[200px]"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            {t('email_channels.configure.history_since_help')}
                                        </p>
                                        <InputError message={errors.import_emails_since} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Mail className="h-5 w-5" />
                                    {t('email_channels.configure.post_import_card.title')}
                                </CardTitle>
                                <CardDescription>
                                    {t('email_channels.configure.post_import_card.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <RadioGroup
                                    value={data.post_import_action}
                                    onValueChange={(value) => setData('post_import_action', value as typeof data.post_import_action)}
                                    className="space-y-3"
                                >
                                    {postImportActions.map((action) => (
                                        <label
                                            key={action.value}
                                            htmlFor={action.value}
                                            className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                                                data.post_import_action === action.value
                                                    ? 'border-primary bg-primary/5'
                                                    : ''
                                            }`}
                                        >
                                            <RadioGroupItem value={action.value} id={action.value} className="mt-0.5" />
                                            <div className="flex-1">
                                                <span className="font-medium">
                                                    {action.label}
                                                </span>
                                                <p className="text-sm text-muted-foreground">
                                                    {action.description}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </RadioGroup>
                                <InputError message={errors.post_import_action} />

                                {data.post_import_action === 'move_to_folder' && (
                                    <div className="grid gap-2 pt-2">
                                        <Label htmlFor="post_import_folder">{t('email_channels.configure.post_import_folder_label')}</Label>
                                        {mailFolders.length > 0 ? (
                                            <Select
                                                value={data.post_import_folder}
                                                onValueChange={(value) => setData('post_import_folder', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('email_channels.configure.post_import_folder_placeholder')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {mailFolders
                                                        .filter((f) => f.id !== data.fetch_folder)
                                                        .map((folder) => (
                                                            <SelectItem key={folder.id} value={folder.id}>
                                                                {folder.display_name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                id="post_import_folder"
                                                value={data.post_import_folder}
                                                onChange={(e) => setData('post_import_folder', e.target.value)}
                                                placeholder={t('email_channels.configure.post_import_folder_name_placeholder')}
                                            />
                                        )}
                                        <InputError message={errors.post_import_folder} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Settings className="h-5 w-5" />
                                    {t('email_channels.configure.sync_card.title')}
                                </CardTitle>
                                <CardDescription>
                                    {t('email_channels.configure.sync_card.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2">
                                    <Label htmlFor="sync_interval_minutes">{t('email_channels.configure.sync_interval_label')}</Label>
                                    <Input
                                        id="sync_interval_minutes"
                                        type="number"
                                        min={1}
                                        max={60}
                                        value={data.sync_interval_minutes}
                                        onChange={(e) => setData('sync_interval_minutes', parseInt(e.target.value) || 5)}
                                        className="max-w-[200px]"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        {t('email_channels.configure.sync_interval_help', { count: data.sync_interval_minutes })}
                                    </p>
                                    <InputError message={errors.sync_interval_minutes} />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" asChild>
                                <Link href={index().url}>{t('common.cancel')}</Link>
                            </Button>
                            <Button type="submit" disabled={processing || !data.fetch_folder || !data.department_id}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('email_channels.configure.activate')}
                            </Button>
                        </div>
                    </form>
                </div>
            </OrganizationLayout>
        </AppLayout>
    );
}
