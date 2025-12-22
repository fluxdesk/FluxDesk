import AppLogoIcon from '@/components/app-logo-icon';
import { Card, CardContent } from '@/components/ui/card';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Headphones, MessageCircle, Zap } from 'lucide-react';
import { type PropsWithChildren } from 'react';

interface AuthCardLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthCardLayoutProps>) {
    const { name } = usePage<SharedData>().props;

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <Card className="overflow-hidden p-0">
                    <CardContent className="grid p-0 md:grid-cols-2">
                        {/* Left side - Form */}
                        <div className="p-8 md:p-10">
                            <div className="flex flex-col gap-8">
                                <Link
                                    href="/login"
                                    className="flex items-center gap-3"
                                >
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
                                        <AppLogoIcon className="size-6 fill-primary-foreground" />
                                    </div>
                                    <span className="text-lg font-semibold">{name}</span>
                                </Link>

                                <div className="flex flex-col gap-2">
                                    <h1 className="text-2xl font-semibold tracking-tight">
                                        {title}
                                    </h1>
                                    {description && (
                                        <p className="text-sm text-muted-foreground text-balance">
                                            {description}
                                        </p>
                                    )}
                                </div>

                                {children}
                            </div>
                        </div>

                        {/* Right side - Branding panel */}
                        <div className="relative hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 md:block">
                            {/* Decorative circles */}
                            <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
                            <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-primary/5 blur-3xl" />

                            <div className="relative flex h-full flex-col items-center justify-center p-12">
                                {/* Logo */}
                                <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                                    <AppLogoIcon className="size-12 fill-primary" />
                                </div>

                                <h2 className="mt-6 text-xl font-semibold text-white">
                                    {name}
                                </h2>
                                <p className="mt-2 text-center text-sm text-zinc-400">
                                    Klantenservice software voor moderne teams
                                </p>

                                {/* Feature highlights */}
                                <div className="mt-10 space-y-4">
                                    <div className="flex items-center gap-3 text-zinc-300">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-800">
                                            <Zap className="size-4 text-primary" />
                                        </div>
                                        <span className="text-sm">Snelle ticket afhandeling</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-zinc-300">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-800">
                                            <MessageCircle className="size-4 text-primary" />
                                        </div>
                                        <span className="text-sm">Real-time communicatie</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-zinc-300">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-800">
                                            <Headphones className="size-4 text-primary" />
                                        </div>
                                        <span className="text-sm">24/7 support portaal</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <p className="mt-6 px-6 text-center text-xs text-muted-foreground">
                    Door in te loggen ga je akkoord met onze{' '}
                    <a href="#" className="underline underline-offset-4 hover:text-foreground">
                        Servicevoorwaarden
                    </a>{' '}
                    en{' '}
                    <a href="#" className="underline underline-offset-4 hover:text-foreground">
                        Privacybeleid
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}
