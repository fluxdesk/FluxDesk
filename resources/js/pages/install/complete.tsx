import { Button } from '@/components/ui/button';
import InstallLayout from '@/layouts/install-layout';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Clock, Copy, ExternalLink, Sparkles, Terminal } from 'lucide-react';
import { useState } from 'react';

interface Props {
    appName: string;
}

export default function Complete({ appName }: Props) {
    const [copied, setCopied] = useState(false);

    const queueCommand = 'php artisan queue:work';

    const copyCommand = () => {
        navigator.clipboard.writeText(queueCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <InstallLayout
            currentStep={4}
            stepTitle="Installation Complete!"
            stepDescription="Your help desk is ready to go."
            appName={appName}
        >
            <Head title="Installation - Complete" />

            {/* Success Animation */}
            <div className="mb-8 text-center">
                <div className="relative mx-auto mb-6 flex size-24 items-center justify-center">
                    {/* Animated rings */}
                    <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
                    <div className="absolute inset-2 animate-pulse rounded-full bg-emerald-500/30" />
                    <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-500/30">
                        <CheckCircle2 className="size-10 text-white" strokeWidth={2.5} />
                    </div>
                </div>

                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1 text-sm text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                    <Sparkles className="size-4" />
                    <span>Successfully Installed</span>
                </div>

                <h3 className="mt-4 text-xl font-semibold text-white">{appName} is ready!</h3>
                <p className="mt-2 text-sm text-zinc-400">
                    Your help desk has been configured and is ready for action.
                </p>
            </div>

            {/* Next Steps */}
            <div className="space-y-4">
                <h4 className="text-sm font-medium text-zinc-300">Important: Background Jobs</h4>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                            <Clock className="size-4 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-300">
                                Set up a queue worker for background jobs
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                                Email sending, notifications, and scheduled tasks require a running queue worker.
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                                <code className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-300">
                                    <Terminal className="mr-2 inline size-3 text-zinc-600" />
                                    {queueCommand}
                                </code>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyCommand}
                                    className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                >
                                    {copied ? (
                                        <CheckCircle2 className="size-4 text-emerald-400" />
                                    ) : (
                                        <Copy className="size-4" />
                                    )}
                                </Button>
                            </div>

                            <a
                                href="https://laravel.com/docs/queues#running-the-queue-worker"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                            >
                                Learn about queue workers
                                <ExternalLink className="size-3" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Quick Tips */}
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                        <h5 className="text-sm font-medium text-zinc-300">Invite Team Members</h5>
                        <p className="mt-1 text-xs text-zinc-500">
                            Go to Organization Settings to invite agents and admins.
                        </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                        <h5 className="text-sm font-medium text-zinc-300">Set Up Email</h5>
                        <p className="mt-1 text-xs text-zinc-500">
                            Configure email channels to receive tickets via email.
                        </p>
                    </div>
                </div>
            </div>

            {/* Login Button */}
            <div className="mt-8">
                <Button
                    asChild
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700"
                >
                    <Link href="/login">
                        Go to Login
                        <ArrowRight className="ml-2 size-4" />
                    </Link>
                </Button>

                <p className="mt-4 text-center text-xs text-zinc-600">
                    Use the admin credentials you just created to log in.
                </p>
            </div>
        </InstallLayout>
    );
}
