import { Button } from '@/components/ui/button';
import UpgradeLayout from '@/layouts/upgrade-layout';
import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Check,
    CheckCircle2,
    Loader2,
    Play,
    RefreshCw,
    Terminal,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface VersionStatus {
    current: string;
    latest: string | null;
    is_outdated: boolean;
}

interface Props {
    versionStatus: VersionStatus;
    currentVersion: string;
    targetVersion: string | null;
}

interface Step {
    id: string;
    message: string;
    status: 'pending' | 'running' | 'completed' | 'error' | 'warning';
    timestamp: string;
}

type UpgradeState = 'idle' | 'running' | 'completed' | 'failed';

export default function UpgradeRun({ currentVersion, targetVersion }: Props) {
    const [state, setState] = useState<UpgradeState>('idle');
    const [steps, setSteps] = useState<Step[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [newVersion, setNewVersion] = useState<string | null>(null);
    const consoleRef = useRef<HTMLDivElement>(null);

    // Auto-scroll console
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [steps, logs]);

    // Calculate current step number based on completed steps
    useEffect(() => {
        const completedSteps = steps.filter((s) => s.status === 'completed').length;
        const stepMapping: Record<string, number> = {
            maintenance: 1,
            fetch: 2,
            pull: 2,
            composer: 3,
            npm_install: 3,
            npm_build: 4,
            migrate: 5,
            cache_clear: 6,
            cache_rebuild: 6,
            version: 6,
            maintenance_off: 6,
            complete: 6,
        };

        const lastStep = steps[steps.length - 1];
        if (lastStep && stepMapping[lastStep.id]) {
            setCurrentStep(stepMapping[lastStep.id]);
        } else if (completedSteps > 0) {
            setCurrentStep(Math.min(Math.ceil(completedSteps / 2), 6));
        }
    }, [steps]);

    const handleEvent = useCallback((event: string, data: Record<string, unknown>) => {
        switch (event) {
            case 'step':
                setSteps((prev) => {
                    const existing = prev.findIndex((s) => s.id === data.id);
                    const step: Step = {
                        id: data.id as string,
                        message: data.message as string,
                        status: data.status as Step['status'],
                        timestamp: data.timestamp as string,
                    };

                    if (existing >= 0) {
                        const updated = [...prev];
                        updated[existing] = step;
                        return updated;
                    }
                    return [...prev, step];
                });
                break;

            case 'output':
                setLogs((prev) => [...prev, data.text as string]);
                break;

            case 'complete':
                if (data.success) {
                    setState('completed');
                    setNewVersion(data.version as string);
                    setCurrentStep(6);
                } else {
                    setState('failed');
                }
                break;
        }
    }, []);

    const startUpgrade = useCallback(() => {
        setState('running');
        setSteps([]);
        setLogs([]);
        setCurrentStep(1);

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        // Use fetch with ReadableStream for SSE over POST
        fetch('/upgrade/execute', {
            method: 'POST',
            headers: {
                'Accept': 'text/event-stream',
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(async (response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) return;

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete events from buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                let currentEvent = '';
                let currentData = '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.slice(7);
                    } else if (line.startsWith('data: ')) {
                        currentData = line.slice(6);

                        if (currentEvent && currentData) {
                            try {
                                const data = JSON.parse(currentData);
                                handleEvent(currentEvent, data);
                            } catch (e) {
                                console.error('Failed to parse SSE data:', e);
                            }
                        }
                        currentEvent = '';
                        currentData = '';
                    }
                }
            }
        }).catch((error) => {
            console.error('Upgrade stream error:', error);
            setState('failed');
            setSteps((prev) => [
                ...prev,
                {
                    id: 'error',
                    message: 'Verbinding met server verbroken',
                    status: 'error',
                    timestamp: new Date().toISOString(),
                },
            ]);
        });
    }, [handleEvent]);

    const getStepIcon = (status: Step['status']) => {
        switch (status) {
            case 'completed':
                return <Check className="size-3 text-emerald-400" />;
            case 'running':
                return <Loader2 className="size-3 animate-spin text-blue-400" />;
            case 'error':
                return <XCircle className="size-3 text-red-400" />;
            case 'warning':
                return <AlertCircle className="size-3 text-amber-400" />;
            default:
                return <div className="size-3 rounded-full bg-zinc-600" />;
        }
    };

    const getStepColor = (status: Step['status']) => {
        switch (status) {
            case 'completed':
                return 'text-emerald-400';
            case 'running':
                return 'text-blue-400';
            case 'error':
                return 'text-red-400';
            case 'warning':
                return 'text-amber-400';
            default:
                return 'text-zinc-500';
        }
    };

    return (
        <UpgradeLayout
            currentVersion={currentVersion}
            targetVersion={targetVersion}
            currentStep={currentStep}
            stepTitle={
                state === 'idle'
                    ? 'Klaar om te upgraden'
                    : state === 'running'
                      ? 'Upgrade wordt uitgevoerd...'
                      : state === 'completed'
                        ? 'Upgrade voltooid!'
                        : 'Upgrade mislukt'
            }
            stepDescription={
                state === 'idle'
                    ? 'Klik op de knop om de upgrade te starten'
                    : state === 'running'
                      ? 'Even geduld, dit kan enkele minuten duren'
                      : state === 'completed'
                        ? `FluxDesk is bijgewerkt naar v${newVersion}`
                        : 'Er is een fout opgetreden tijdens de upgrade'
            }
        >
            <Head title="Systeem Upgrade" />

            <div className="space-y-6">
                {/* Start Button (only shown in idle state) */}
                {state === 'idle' && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-blue-500/20">
                            <RefreshCw className="size-8 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-200">
                            Upgraden naar v{targetVersion}
                        </h3>
                        <p className="mt-2 text-sm text-zinc-400">
                            De applicatie wordt in onderhoudsmodus gezet tijdens de upgrade.
                            <br />
                            Gebruikers kunnen tijdelijk geen toegang krijgen tot het systeem.
                        </p>
                        <Button
                            onClick={startUpgrade}
                            size="lg"
                            className="mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
                        >
                            <Play className="mr-2 size-4" />
                            Upgrade starten
                        </Button>
                    </div>
                )}

                {/* Console Output */}
                {state !== 'idle' && (
                    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                        {/* Console Header */}
                        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
                            <Terminal className="size-4 text-zinc-400" />
                            <span className="text-sm font-medium text-zinc-300">Upgrade Console</span>
                            {state === 'running' && (
                                <Loader2 className="ml-auto size-4 animate-spin text-blue-400" />
                            )}
                            {state === 'completed' && (
                                <CheckCircle2 className="ml-auto size-4 text-emerald-400" />
                            )}
                            {state === 'failed' && (
                                <XCircle className="ml-auto size-4 text-red-400" />
                            )}
                        </div>

                        {/* Console Body */}
                        <div
                            ref={consoleRef}
                            className="h-[400px] overflow-y-auto p-4 font-mono text-sm"
                        >
                            {steps.map((step, index) => (
                                <div key={`${step.id}-${index}`} className="flex items-start gap-3 py-1">
                                    <div className="mt-1 shrink-0">{getStepIcon(step.status)}</div>
                                    <div className="flex-1">
                                        <span className={getStepColor(step.status)}>{step.message}</span>
                                        <span className="ml-2 text-xs text-zinc-600">
                                            {new Date(step.timestamp).toLocaleTimeString('nl-NL')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {logs.map((log, index) => (
                                <div key={`log-${index}`} className="py-0.5 text-xs text-zinc-500">
                                    {log}
                                </div>
                            ))}
                            {state === 'running' && (
                                <div className="flex items-center gap-2 py-2 text-zinc-400">
                                    <Loader2 className="size-3 animate-spin" />
                                    <span className="animate-pulse">Bezig met verwerken...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Success Message */}
                {state === 'completed' && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                                <CheckCircle2 className="size-6 text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-emerald-400">
                                    Upgrade succesvol!
                                </h3>
                                <p className="mt-1 text-sm text-zinc-400">
                                    FluxDesk is bijgewerkt naar versie {newVersion}.
                                    De applicatie is weer beschikbaar voor alle gebruikers.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Button asChild variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                                        <Link href="/dashboard">
                                            Naar Dashboard
                                            <ArrowRight className="ml-2 size-4" />
                                        </Link>
                                    </Button>
                                    <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
                                        <Link href="/upgrade">Terug naar Upgrade pagina</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {state === 'failed' && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                                <XCircle className="size-6 text-red-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-red-400">
                                    Upgrade mislukt
                                </h3>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Er is een fout opgetreden tijdens de upgrade.
                                    Controleer de console output hierboven voor meer details.
                                    De onderhoudsmodus is automatisch uitgeschakeld.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Button
                                        onClick={startUpgrade}
                                        variant="outline"
                                        className="border-zinc-700 hover:bg-zinc-800"
                                    >
                                        <RefreshCw className="mr-2 size-4" />
                                        Opnieuw proberen
                                    </Button>
                                    <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
                                        <Link href="/upgrade">Terug naar Upgrade pagina</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </UpgradeLayout>
    );
}
