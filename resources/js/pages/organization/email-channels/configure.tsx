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
import { type EmailChannel, type MailFolder, type PostImportActionOption } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { update } from '@/routes/organization/email-channels/configure';
import { ArrowLeft, Calendar, FolderInput, Loader2, Mail, Settings } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { index } from '@/routes/organization/email-channels';

interface Props {
    channel: EmailChannel;
    mailFolders: MailFolder[];
    postImportActions: PostImportActionOption[];
    defaultImportSince: string;
}

export default function Configure({ channel, mailFolders, postImportActions, defaultImportSince }: Props) {
    const { data, setData, patch, processing, errors } = useForm({
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
            <Head title={`${channel.name} configureren`} />

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
                                {channel.name} configureren
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Verbonden als {channel.email_address}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FolderInput className="h-5 w-5" />
                                    E-mailmap selecteren
                                </CardTitle>
                                <CardDescription>
                                    Selecteer de map waaruit e-mails worden opgehaald en omgezet naar tickets.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="fetch_folder">Map om e-mails uit op te halen</Label>
                                    {mailFolders.length > 0 ? (
                                        <Select
                                            value={data.fetch_folder}
                                            onValueChange={(value) => setData('fetch_folder', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecteer een map" />
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
                                            Mappen laden...
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
                                    Historische e-mails importeren
                                </CardTitle>
                                <CardDescription>
                                    Wil je oude e-mails importeren als tickets, of alleen nieuwe e-mails vanaf nu?
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
                                            <span className="font-medium">Alleen nieuwe e-mails</span>
                                            <p className="text-sm text-muted-foreground">
                                                Importeer alleen e-mails die binnenkomen na activatie. Aanbevolen voor migraties.
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
                                            <span className="font-medium">Ook oude e-mails importeren</span>
                                            <p className="text-sm text-muted-foreground">
                                                Importeer e-mails vanaf een specifieke datum als tickets.
                                            </p>
                                        </div>
                                    </label>
                                </RadioGroup>

                                {data.import_old_emails && (
                                    <div className="grid gap-2 pt-2 pl-7">
                                        <Label htmlFor="import_emails_since">E-mails importeren vanaf</Label>
                                        <Input
                                            type="date"
                                            id="import_emails_since"
                                            value={data.import_emails_since}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setData('import_emails_since', e.target.value)}
                                            className="max-w-[200px]"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Alle e-mails vanaf deze datum worden geimporteerd als tickets.
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
                                    Na het importeren
                                </CardTitle>
                                <CardDescription>
                                    Wat moet er met e-mails gebeuren nadat ze zijn geimporteerd als ticket?
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
                                        <Label htmlFor="post_import_folder">Verplaatsen naar map</Label>
                                        {mailFolders.length > 0 ? (
                                            <Select
                                                value={data.post_import_folder}
                                                onValueChange={(value) => setData('post_import_folder', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecteer een map" />
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
                                                placeholder="Map naam"
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
                                    Synchronisatie-instellingen
                                </CardTitle>
                                <CardDescription>
                                    Hoe vaak moeten nieuwe e-mails worden opgehaald?
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2">
                                    <Label htmlFor="sync_interval_minutes">Synchronisatie-interval (minuten)</Label>
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
                                        Nieuwe e-mails worden elke {data.sync_interval_minutes} {data.sync_interval_minutes === 1 ? 'minuut' : 'minuten'} opgehaald.
                                    </p>
                                    <InputError message={errors.sync_interval_minutes} />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" asChild>
                                <Link href={index().url}>Annuleren</Link>
                            </Button>
                            <Button type="submit" disabled={processing || !data.fetch_folder}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Activeren
                            </Button>
                        </div>
                    </form>
                </div>
            </OrganizationLayout>
        </AppLayout>
    );
}
