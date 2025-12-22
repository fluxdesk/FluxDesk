import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { Building2 } from 'lucide-react';

export default function OnboardingOrganization() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/onboarding/organization');
    }

    return (
        <>
            <Head title="Organisatie aanmaken" />

            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo/Icon */}
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                            <Building2 className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Welkom bij FluxDesk
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            Laten we je organisatie instellen om aan de slag te gaan
                        </p>
                    </div>

                    {/* Form */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Organisatienaam</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Mijn Bedrijf B.V."
                                    autoFocus
                                    required
                                />
                                <InputError message={errors.name} />
                                <p className="text-xs text-muted-foreground">
                                    Dit is je bedrijfs- of teamnaam. Je kunt dit later wijzigen.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={processing || !data.name.trim()}
                            >
                                {processing ? 'Aanmaken...' : 'Organisatie aanmaken'}
                            </Button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-muted-foreground">
                        Je kunt na het instellen teamleden uitnodigen
                    </p>
                </div>
            </div>
        </>
    );
}
