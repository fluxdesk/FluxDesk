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
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation('common');
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        password: '',
        password_confirmation: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(register(invitation.token).url);
    }

    const roleLabel = invitation.role === 'admin' ? t('invitation.register.role_admin') : t('invitation.register.role_agent');

    return (
        <AuthCardLayout
            title={t('invitation.register.title')}
            description={t('invitation.register.description')}
        >
            <Head title={t('invitation.register.title')} />

            <Card className="border-0 shadow-none p-0">
                <CardHeader className="px-0 pt-0">
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="size-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{invitation.organization.name}</CardTitle>
                            <CardDescription>
                                {t('invitation.register.invited_by', { name: invitation.inviter.name })}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="mb-6 space-y-2 text-sm">
                        <div className="flex items-center gap-3">
                            <Mail className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('invitation.register.email_label')}</span>
                            <span className="font-medium">{invitation.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('invitation.register.role_label')}</span>
                            <span className="font-medium">{roleLabel}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="name">{t('invitation.register.name_label')}</FieldLabel>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    autoFocus
                                    placeholder={t('invitation.register.name_placeholder')}
                                />
                                <InputError message={errors.name} />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="password">{t('invitation.register.password_label')}</FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                    placeholder={t('invitation.register.password_placeholder')}
                                />
                                <InputError message={errors.password} />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="password_confirmation">{t('invitation.register.password_confirm_label')}</FieldLabel>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required
                                    placeholder={t('invitation.register.password_confirm_placeholder')}
                                />
                            </Field>

                            <Field>
                                <Button type="submit" className="w-full" disabled={processing}>
                                    {processing && <Spinner />}
                                    {t('invitation.register.submit_button')}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </AuthCardLayout>
    );
}
