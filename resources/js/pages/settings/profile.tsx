import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { send } from '@/routes/verification';
import { type SharedData } from '@/types';
import { Form, Head, Link, usePage } from '@inertiajs/react';
import { toast } from 'sonner';

import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<SharedData>().props;

    return (
        <AppLayout>
            <Head title="Profielinstellingen" />

            <SettingsLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Profielgegevens</CardTitle>
                            <CardDescription>
                                Wijzig je naam en e-mailadres
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form
                                {...ProfileController.update.form()}
                                options={{
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        toast.success('Profiel bijgewerkt');
                                    },
                                    onError: () => {
                                        toast.error('Profiel bijwerken mislukt');
                                    },
                                }}
                                className="space-y-4"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Naam</Label>
                                            <Input
                                                id="name"
                                                defaultValue={auth.user.name}
                                                name="name"
                                                required
                                                autoComplete="name"
                                                placeholder="Volledige naam"
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="email">E-mailadres</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                defaultValue={auth.user.email}
                                                name="email"
                                                required
                                                autoComplete="username"
                                                placeholder="E-mailadres"
                                            />
                                            <InputError message={errors.email} />
                                        </div>

                                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                                            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                                Je e-mailadres is nog niet geverifieerd.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="font-medium underline underline-offset-4"
                                                >
                                                    Verificatie-e-mail opnieuw versturen
                                                </Link>
                                                {status === 'verification-link-sent' && (
                                                    <p className="mt-2 font-medium text-green-600 dark:text-green-400">
                                                        Een nieuwe verificatielink is verstuurd.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="pt-2">
                                            <Button disabled={processing}>
                                                Wijzigingen opslaan
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>

                    <Card className="border-destructive/50">
                        <CardHeader>
                            <CardTitle className="text-lg text-destructive">Gevarenzone</CardTitle>
                            <CardDescription>
                                Verwijder je account en al je gegevens permanent
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DeleteUser />
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
