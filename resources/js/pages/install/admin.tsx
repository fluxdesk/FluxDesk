import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InstallLayout from '@/layouts/install-layout';
import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, Building2, ChevronRight, Globe, Loader2, User } from 'lucide-react';

interface Props {
    appName: string;
    appUrl: string;
}

export default function AdminSetup({ appName, appUrl }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        app_name: appName || 'FluxDesk',
        app_url: appUrl || '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        admin_password_confirmation: '',
        organization_name: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/install/admin');
    };

    return (
        <InstallLayout
            currentStep={5}
            stepTitle="Create Your Account"
            stepDescription="Set up your administrator account and organization."
            appName={data.app_name}
        >
            <Head title="Installation - Admin Setup" />

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Application Settings */}
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
                            <Globe className="size-4 text-blue-400" />
                        </div>
                        <h3 className="font-medium text-white">Application Settings</h3>
                    </div>

                    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-800/20 p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="app_name" className="text-zinc-400">Application Name</Label>
                                <Input
                                    id="app_name"
                                    value={data.app_name}
                                    onChange={(e) => setData('app_name', e.target.value)}
                                    placeholder="FluxDesk"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.app_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="app_url" className="text-zinc-400">Application URL</Label>
                                <Input
                                    id="app_url"
                                    value={data.app_url}
                                    onChange={(e) => setData('app_url', e.target.value)}
                                    placeholder="https://support.example.com"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.app_url} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Administrator Account */}
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                            <User className="size-4 text-emerald-400" />
                        </div>
                        <h3 className="font-medium text-white">Administrator Account</h3>
                    </div>

                    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-800/20 p-4">
                        <div className="space-y-2">
                            <Label htmlFor="admin_name" className="text-zinc-400">Full Name</Label>
                            <Input
                                id="admin_name"
                                value={data.admin_name}
                                onChange={(e) => setData('admin_name', e.target.value)}
                                placeholder="John Doe"
                                className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                            />
                            <InputError message={errors.admin_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="admin_email" className="text-zinc-400">Email Address</Label>
                            <Input
                                id="admin_email"
                                type="email"
                                value={data.admin_email}
                                onChange={(e) => setData('admin_email', e.target.value)}
                                placeholder="admin@example.com"
                                className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                            />
                            <InputError message={errors.admin_email} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="admin_password" className="text-zinc-400">Password</Label>
                                <Input
                                    id="admin_password"
                                    type="password"
                                    value={data.admin_password}
                                    onChange={(e) => setData('admin_password', e.target.value)}
                                    placeholder="••••••••"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <p className="text-xs text-zinc-600">Minimum 8 characters</p>
                                <InputError message={errors.admin_password} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="admin_password_confirmation" className="text-zinc-400">Confirm Password</Label>
                                <Input
                                    id="admin_password_confirmation"
                                    type="password"
                                    value={data.admin_password_confirmation}
                                    onChange={(e) => setData('admin_password_confirmation', e.target.value)}
                                    placeholder="••••••••"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.admin_password_confirmation} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization */}
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10">
                            <Building2 className="size-4 text-indigo-400" />
                        </div>
                        <h3 className="font-medium text-white">Organization</h3>
                    </div>

                    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-800/20 p-4">
                        <div className="space-y-2">
                            <Label htmlFor="organization_name" className="text-zinc-400">Organization Name</Label>
                            <Input
                                id="organization_name"
                                value={data.organization_name}
                                onChange={(e) => setData('organization_name', e.target.value)}
                                placeholder="Acme Inc."
                                className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                            />
                            <p className="text-xs text-zinc-600">
                                Your company or team name. This will be your first organization.
                            </p>
                            <InputError message={errors.organization_name} />
                        </div>
                    </div>
                </div>

                {/* Global Error */}
                {errors.admin && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                        <p className="text-sm text-red-400">{errors.admin}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                        <a href="/install/cache">
                            <ArrowLeft className="mr-2 size-4" />
                            Back
                        </a>
                    </Button>

                    <Button
                        type="submit"
                        disabled={processing}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Setting up...
                            </>
                        ) : (
                            <>
                                Complete Installation
                                <ChevronRight className="ml-2 size-4" />
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </InstallLayout>
    );
}
