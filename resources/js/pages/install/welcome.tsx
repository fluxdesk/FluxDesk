import { Button } from '@/components/ui/button';
import InstallLayout from '@/layouts/install-layout';
import { Head, Link } from '@inertiajs/react';
import { AlertCircle, Check, ChevronRight, ExternalLink, Shield, X, Zap } from 'lucide-react';

interface Requirement {
    met: boolean;
    required: string;
    current: string | boolean;
}

interface Props {
    requirements: Record<string, Requirement>;
    allMet: boolean;
    appName: string;
}

const requirementLabels: Record<string, { label: string; description: string }> = {
    php_version: { label: 'PHP Version', description: 'Minimum version required' },
    pdo: { label: 'PDO Extension', description: 'Database connectivity' },
    mbstring: { label: 'Mbstring Extension', description: 'String handling' },
    openssl: { label: 'OpenSSL Extension', description: 'Encryption support' },
    tokenizer: { label: 'Tokenizer Extension', description: 'Code analysis' },
    json: { label: 'JSON Extension', description: 'Data serialization' },
    curl: { label: 'cURL Extension', description: 'HTTP requests' },
    fileinfo: { label: 'Fileinfo Extension', description: 'File type detection' },
    storage_writable: { label: 'Storage Directory', description: 'Write permissions' },
    env_writable: { label: 'Environment File', description: 'Configuration storage' },
};

export default function Welcome({ requirements, allMet, appName }: Props) {
    const metCount = Object.values(requirements).filter(r => r.met).length;
    const totalCount = Object.keys(requirements).length;

    return (
        <InstallLayout
            currentStep={1}
            stepTitle="Welcome"
            stepDescription="Let's make sure your server meets all requirements."
            appName={appName}
        >
            <Head title="Installation - Welcome" />

            {/* Hero Section */}
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 ring-1 ring-white/10">
                    <Shield className="size-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">System Check</h3>
                <p className="mt-1 text-sm text-zinc-400">
                    {allMet
                        ? 'All requirements met! Ready to proceed.'
                        : `${metCount} of ${totalCount} requirements met`
                    }
                </p>
            </div>

            {/* Requirements List */}
            <div className="space-y-2">
                {Object.entries(requirements).map(([key, req]) => {
                    const info = requirementLabels[key] || { label: key, description: '' };
                    return (
                        <div
                            key={key}
                            className={`
                                flex items-center justify-between rounded-lg border px-4 py-3 transition-colors
                                ${req.met
                                    ? 'border-emerald-500/20 bg-emerald-500/5'
                                    : 'border-red-500/20 bg-red-500/5'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`
                                    flex size-8 items-center justify-center rounded-lg
                                    ${req.met
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-red-500/10 text-red-400'
                                    }
                                `}>
                                    {req.met ? (
                                        <Check className="size-4" strokeWidth={3} />
                                    ) : (
                                        <X className="size-4" strokeWidth={3} />
                                    )}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${req.met ? 'text-emerald-300' : 'text-red-300'}`}>
                                        {info.label}
                                    </p>
                                    <p className="text-xs text-zinc-500">{info.description}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-xs font-mono ${req.met ? 'text-zinc-400' : 'text-red-400'}`}>
                                    {typeof req.current === 'boolean'
                                        ? (req.current ? 'Yes' : 'No')
                                        : req.current
                                    }
                                </p>
                                {!req.met && (
                                    <p className="text-xs text-zinc-600">
                                        Required: {req.required}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Status Message */}
            {!allMet && (
                <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-400" />
                    <div>
                        <p className="text-sm font-medium text-amber-300">
                            Some requirements are not met
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                            Please install the missing PHP extensions or fix permission issues before continuing.
                        </p>
                        <a
                            href="https://laravel.com/docs/deployment#server-requirements"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                        >
                            View documentation
                            <ExternalLink className="size-3" />
                        </a>
                    </div>
                </div>
            )}

            {/* Features Preview */}
            {allMet && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/30 p-3">
                        <Zap className="size-5 text-blue-400" />
                        <div>
                            <p className="text-sm font-medium text-zinc-300">Fast Setup</p>
                            <p className="text-xs text-zinc-500">Under 2 minutes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/30 p-3">
                        <Shield className="size-5 text-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-zinc-300">Secure</p>
                            <p className="text-xs text-zinc-500">Industry standards</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Button */}
            <div className="mt-8">
                <Button
                    asChild
                    disabled={!allMet}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
                >
                    <Link href="/install/database">
                        Continue to Database Setup
                        <ChevronRight className="ml-2 size-4" />
                    </Link>
                </Button>
            </div>
        </InstallLayout>
    );
}
