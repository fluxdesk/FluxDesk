import { Button } from '@/components/ui/button';
import InstallLayout from '@/layouts/install-layout';
import { Head, router } from '@inertiajs/react';
import { AlertCircle, ArrowRight, CheckCircle2, Database, Loader2, Terminal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    appName: string;
    dbConfig: {
        driver: string;
        host: string | null;
        database: string | null;
    };
}

interface LogEntry {
    type: 'command' | 'info' | 'success' | 'error' | 'migration' | 'output';
    message: string;
    timestamp: string;
}

export default function DatabaseSetup({ appName, dbConfig }: Props) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isRunning, setIsRunning] = useState(true);
    const consoleRef = useRef<HTMLDivElement>(null);
    const hasStarted = useRef(false);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        const eventSource = new EventSource('/install/database/stream');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'complete') {
                    setIsComplete(true);
                    setIsSuccess(data.success);
                    setIsRunning(false);
                    eventSource.close();
                    return;
                }

                if (data.message || data.type === 'info') {
                    setLogs((prev) => [...prev, data as LogEntry]);
                }
            } catch (e) {
                console.error('Failed to parse SSE message:', e);
            }
        };

        eventSource.onerror = () => {
            setIsComplete(true);
            setIsSuccess(false);
            setIsRunning(false);
            setLogs((prev) => [
                ...prev,
                { type: 'error', message: 'Connection lost. Please try again.', timestamp: new Date().toLocaleTimeString() },
            ]);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, []);

    useEffect(() => {
        // Auto-scroll to bottom when new logs arrive
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);

    const getLineClass = (type: LogEntry['type']) => {
        switch (type) {
            case 'command':
                return 'text-cyan-400 font-semibold';
            case 'success':
                return 'text-emerald-400';
            case 'error':
                return 'text-red-400';
            case 'migration':
                return 'text-amber-300';
            case 'info':
                return 'text-zinc-400';
            default:
                return 'text-zinc-300';
        }
    };

    const getDriverLabel = (driver: string) => {
        switch (driver) {
            case 'sqlite':
                return 'SQLite';
            case 'mysql':
                return 'MySQL';
            case 'pgsql':
                return 'PostgreSQL';
            default:
                return driver;
        }
    };

    const handleContinue = () => {
        router.visit('/install/admin');
    };

    const handleRetry = () => {
        router.visit('/install/database');
    };

    return (
        <InstallLayout
            currentStep={2}
            stepTitle="Setting Up Database"
            stepDescription="Running migrations and configuring your database."
            appName={appName}
        >
            <Head title="Installation - Database Setup" />

            {/* Database Info Header */}
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/20">
                    <Database className="size-5 text-blue-400" />
                </div>
                <div>
                    <p className="font-medium text-white">{getDriverLabel(dbConfig.driver)}</p>
                    <p className="text-xs text-zinc-500">
                        {dbConfig.driver === 'sqlite'
                            ? 'database/database.sqlite'
                            : `${dbConfig.host} / ${dbConfig.database}`}
                    </p>
                </div>
                {isRunning && (
                    <div className="ml-auto">
                        <Loader2 className="size-5 animate-spin text-blue-400" />
                    </div>
                )}
                {isComplete && isSuccess && (
                    <div className="ml-auto">
                        <CheckCircle2 className="size-5 text-emerald-400" />
                    </div>
                )}
                {isComplete && !isSuccess && (
                    <div className="ml-auto">
                        <AlertCircle className="size-5 text-red-400" />
                    </div>
                )}
            </div>

            {/* Terminal Console */}
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
                    <div className="flex gap-1.5">
                        <div className="size-3 rounded-full bg-red-500/80" />
                        <div className="size-3 rounded-full bg-yellow-500/80" />
                        <div className="size-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="ml-2 flex items-center gap-2 text-xs text-zinc-500">
                        <Terminal className="size-3.5" />
                        <span>fluxdesk — installation</span>
                    </div>
                </div>

                {/* Terminal Content */}
                <div
                    ref={consoleRef}
                    className="h-80 overflow-y-auto p-4 font-mono text-sm leading-relaxed"
                    style={{
                        fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
                    }}
                >
                    {logs.length === 0 && isRunning && (
                        <div className="flex items-center gap-2 text-zinc-500">
                            <Loader2 className="size-4 animate-spin" />
                            <span>Initializing...</span>
                        </div>
                    )}

                    {logs.map((log, index) => (
                        <div key={index} className={`${getLineClass(log.type)} ${log.message === '' ? 'h-4' : ''}`}>
                            {log.type === 'command' && <span className="text-emerald-500">➜ </span>}
                            {log.type === 'migration' && <span className="text-zinc-600">   </span>}
                            {log.type === 'success' && log.message && <span className="mr-1">✓</span>}
                            {log.type === 'error' && <span className="mr-1">✗</span>}
                            {log.message}
                        </div>
                    ))}

                    {isRunning && logs.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-zinc-600">
                            <span className="animate-pulse">▋</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Message */}
            {isComplete && (
                <div
                    className={`mt-6 rounded-xl border p-4 ${
                        isSuccess
                            ? 'border-emerald-500/20 bg-emerald-500/10'
                            : 'border-red-500/20 bg-red-500/10'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {isSuccess ? (
                            <>
                                <CheckCircle2 className="size-5 text-emerald-400" />
                                <div>
                                    <p className="font-medium text-emerald-300">Database configured successfully!</p>
                                    <p className="mt-0.5 text-xs text-zinc-400">
                                        All migrations have been executed. Continue to create your admin account.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="size-5 text-red-400" />
                                <div>
                                    <p className="font-medium text-red-300">Database setup failed</p>
                                    <p className="mt-0.5 text-xs text-zinc-400">
                                        Please check the error messages above and try again.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            {isComplete && (
                <div className="mt-6">
                    {isSuccess ? (
                        <Button
                            onClick={handleContinue}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
                        >
                            Continue to Admin Setup
                            <ArrowRight className="ml-2 size-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleRetry}
                            variant="outline"
                            className="w-full border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                            Go Back & Try Again
                        </Button>
                    )}
                </div>
            )}
        </InstallLayout>
    );
}
