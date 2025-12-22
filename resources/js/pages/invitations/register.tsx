import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import AuthCardLayout from '@/layouts/auth/auth-card-layout';
import { register } from '@/routes/invitations';
import { Head, useForm } from '@inertiajs/react';
import { Building2, CheckCircle2, Mail } from 'lucide-react';

interface Invitation {
    token: string;
    email: string;
    role: 'admin' | 'agent';
    expires_at: string;
    organization: {
        name: string;
    };
    inviter: {
        name: string;
    };
}

interface Props {
    invitation: Invitation;
}

export default function RegisterViaInvitation({ invitation }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        password: '',
        password_confirmation: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(register(invitation.token).url);
    }

    const roleLabel = invitation.role === 'admin' ? 'Beheerder' : 'Medewerker';

    return (
        <AuthCardLayout
            title="Account aanmaken"
            description="Maak een account aan om de uitnodiging te accepteren"
        >
            <Head title="Account aanmaken" />

            <Card className="border-0 shadow-none p-0">
                <CardHeader className="px-0 pt-0">
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="size-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{invitation.organization.name}</CardTitle>
                            <CardDescription>
                                Uitgenodigd door {invitation.inviter.name}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="mb-6 space-y-2 text-sm">
                        <div className="flex items-center gap-3">
                            <Mail className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">E-mail:</span>
                            <span className="font-medium">{invitation.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Rol:</span>
                            <span className="font-medium">{roleLabel}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="name">Naam</FieldLabel>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    autoFocus
                                    placeholder="Je volledige naam"
                                />
                                <InputError message={errors.name} />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="password">Wachtwoord</FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                    placeholder="Kies een wachtwoord"
                                />
                                <InputError message={errors.password} />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="password_confirmation">Bevestig wachtwoord</FieldLabel>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required
                                    placeholder="Herhaal je wachtwoord"
                                />
                            </Field>

                            <Field>
                                <Button type="submit" className="w-full" disabled={processing}>
                                    {processing && <Spinner />}
                                    Account aanmaken
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </AuthCardLayout>
    );
}
