import { Card, CardContent } from '@/components/ui/card';
import { type PortalSharedData } from '@/types/portal';
import { usePage } from '@inertiajs/react';
import { Headphones, MessageCircle, Zap } from 'lucide-react';
import { type PropsWithChildren } from 'react';

interface PortalAuthLayoutProps {
    title?: string;
    description?: string;
}

function getInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

export default function PortalAuthLayout({
    children,
    title,
    description,
}: PropsWithChildren<PortalAuthLayoutProps>) {
    const { organization } = usePage<PortalSharedData>().props;

    const primaryColor = organization?.settings?.primary_color ?? '#18181b';
    const orgInitials = getInitials(organization?.name ?? 'Portal');

    const brandStyles = {
        '--portal-primary': primaryColor,
        '--portal-secondary': organization?.settings?.secondary_color ?? '#71717a',
        '--portal-accent': organization?.settings?.accent_color ?? '#3b82f6',
    } as React.CSSProperties;

    return (
        <div
            className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10"
            style={brandStyles}
        >
            <div className="w-full max-w-sm md:max-w-4xl">
                <Card className="overflow-hidden p-0">
                    <CardContent className="grid p-0 md:grid-cols-2">
                        {/* Left side - Form */}
                        <div className="p-8 md:p-10">
                            <div className="flex flex-col gap-6">
                                {/* Logo / Organization Name */}
                                <div className="flex items-center gap-3">
                                    {organization?.settings?.logo_path ? (
                                        <img
                                            src={`/storage/${organization.settings.logo_path}`}
                                            alt={organization.name}
                                            className="h-10 w-auto"
                                        />
                                    ) : (
                                        <div
                                            className="flex size-10 items-center justify-center rounded-lg text-white text-sm font-bold"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {orgInitials}
                                        </div>
                                    )}
                                    <span className="text-lg font-semibold text-foreground">
                                        {organization?.name ?? 'Support Portal'}
                                    </span>
                                </div>

                                {/* Title & Description */}
                                {(title || description) && (
                                    <div className="flex flex-col gap-2">
                                        {title && (
                                            <h1 className="text-2xl font-semibold tracking-tight">
                                                {title}
                                            </h1>
                                        )}
                                        {description && (
                                            <p className="text-sm text-muted-foreground text-balance">
                                                {description}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {children}
                            </div>
                        </div>

                        {/* Right side - Branding panel */}
                        <div className="relative hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 md:block">
                            {/* Decorative circles using org primary color */}
                            <div
                                className="absolute -right-20 -top-20 size-64 rounded-full blur-3xl"
                                style={{ backgroundColor: `${primaryColor}15` }}
                            />
                            <div
                                className="absolute -bottom-20 -left-20 size-64 rounded-full blur-3xl"
                                style={{ backgroundColor: `${primaryColor}08` }}
                            />

                            <div className="relative flex h-full flex-col items-center justify-center p-12">
                                {/* Logo */}
                                {organization?.settings?.logo_path ? (
                                    <div
                                        className="flex size-20 items-center justify-center rounded-2xl ring-1"
                                        style={{
                                            backgroundColor: `${primaryColor}15`,
                                            borderColor: `${primaryColor}30`,
                                        }}
                                    >
                                        <img
                                            src={`/storage/${organization.settings.logo_path}`}
                                            alt={organization.name}
                                            className="size-12 object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className="flex size-20 items-center justify-center rounded-2xl ring-1 text-2xl font-bold text-white"
                                        style={{
                                            backgroundColor: `${primaryColor}15`,
                                            borderColor: `${primaryColor}30`,
                                        }}
                                    >
                                        {orgInitials}
                                    </div>
                                )}

                                <h2 className="mt-6 text-xl font-semibold text-white">
                                    {organization?.name ?? 'Support Portal'}
                                </h2>
                                <p className="mt-2 text-center text-sm text-zinc-400">
                                    Klantportaal
                                </p>

                                {/* Feature highlights */}
                                <div className="mt-10 space-y-4">
                                    <div className="flex items-center gap-3 text-zinc-300">
                                        <div
                                            className="flex size-8 items-center justify-center rounded-lg bg-zinc-800"
                                        >
                                            <Zap className="size-4" style={{ color: primaryColor }} />
                                        </div>
                                        <span className="text-sm">Tickets volgen</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-zinc-300">
                                        <div
                                            className="flex size-8 items-center justify-center rounded-lg bg-zinc-800"
                                        >
                                            <MessageCircle className="size-4" style={{ color: primaryColor }} />
                                        </div>
                                        <span className="text-sm">Direct reageren</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-zinc-300">
                                        <div
                                            className="flex size-8 items-center justify-center rounded-lg bg-zinc-800"
                                        >
                                            <Headphones className="size-4" style={{ color: primaryColor }} />
                                        </div>
                                        <span className="text-sm">24/7 toegang</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <p className="mt-6 px-6 text-center text-xs text-muted-foreground">
                    Veilig inloggen via een magische link per e-mail
                </p>
            </div>
        </div>
    );
}
