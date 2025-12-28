import InputError from '@/components/input-error';
import { TimezoneSelect } from '@/components/common/timezone-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { update } from '@/routes/organization/settings';
import { type Organization, type OrganizationSettings } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Settings } from 'lucide-react';

interface Props {
    organization: Organization;
    settings: OrganizationSettings;
    canSetSystemDefault: boolean;
}

export default function SettingsPage({ organization, settings, canSetSystemDefault }: Props) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        timezone: settings.timezone || 'UTC',
        is_system_default: organization.is_system_default || false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(update().url, { preserveScroll: true });
    }

    return (
        <AppLayout>
            <Head title="Algemeen" />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Settings className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Algemeen</CardTitle>
                                    <CardDescription>
                                        Algemene instellingen voor je organisatie
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="timezone">Tijdzone</Label>
                                    <TimezoneSelect
                                        value={data.timezone}
                                        onChange={(value) => setData('timezone', value)}
                                        className="max-w-xs"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Wordt gebruikt voor datumvariabelen in ticketnummers
                                    </p>
                                    <InputError message={errors.timezone} />
                                </div>

                                {canSetSystemDefault && (
                                    <label
                                        htmlFor="is_system_default"
                                        className="flex items-start space-x-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-muted/50 dark:bg-input dark:border-white/10 dark:hover:bg-white/5"
                                    >
                                        <Switch
                                            id="is_system_default"
                                            checked={data.is_system_default}
                                            onCheckedChange={(checked) => setData('is_system_default', checked)}
                                            className="mt-0.5"
                                        />
                                        <div className="space-y-1">
                                            <span className="font-medium">Standaard organisatie</span>
                                            <p className="text-xs text-muted-foreground">
                                                Stel in als systeemstandaard voor nieuwe gebruikers zonder organisatie
                                            </p>
                                        </div>
                                    </label>
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
