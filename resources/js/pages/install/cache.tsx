import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InstallLayout from '@/layouts/install-layout';
import { Head, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    Clock,
    Database,
    FileArchive,
    HardDrive,
    Loader2,
    PlayCircle,
    XCircle,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

interface Props {
    appName: string;
    currentConfig: {
        cache_store: string;
        session_driver: string;
        queue_connection: string;
        redis_host: string;
        redis_port: string;
    };
}

const cacheStoreOptions = [
    {
        value: 'database',
        label: 'Database',
        description: 'Store cache in your database. Works out of the box.',
        icon: Database,
        recommended: true,
    },
    {
        value: 'file',
        label: 'File System',
        description: 'Store cache in files. Simple but slower.',
        icon: FileArchive,
    },
    {
        value: 'redis',
        label: 'Redis',
        description: 'High-performance in-memory cache. Best for production.',
        icon: Zap,
        advanced: true,
    },
];

const sessionDriverOptions = [
    { value: 'database', label: 'Database', description: 'Recommended for most setups' },
    { value: 'file', label: 'File System', description: 'Simple file-based sessions' },
    { value: 'redis', label: 'Redis', description: 'High-performance sessions' },
];

const queueConnectionOptions = [
    { value: 'database', label: 'Database', description: 'Recommended. Required for email sync & notifications.', recommended: true },
    { value: 'redis', label: 'Redis', description: 'Best for high volume. Requires Redis server.' },
    { value: 'sync', label: 'Synchronous', description: 'Jobs run immediately (blocks requests). Not for production.', warning: true },
];

export default function CacheSetup({ appName, currentConfig }: Props) {
    const [selectedStore, setSelectedStore] = useState(currentConfig.cache_store || 'database');
    const [connectionTested, setConnectionTested] = useState(false);
    const [connectionSuccess, setConnectionSuccess] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [testMessage, setTestMessage] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        store: currentConfig.cache_store || 'database',
        session_driver: currentConfig.session_driver || 'database',
        queue_connection: currentConfig.queue_connection || 'database',
        redis_host: currentConfig.redis_host || '127.0.0.1',
        redis_port: currentConfig.redis_port || '6379',
        redis_password: '',
    });

    const usesRedis = data.store === 'redis' || data.session_driver === 'redis' || data.queue_connection === 'redis';

    const handleStoreChange = (store: string) => {
        setSelectedStore(store);
        setData('store', store);
        setConnectionTested(false);
        setConnectionSuccess(false);
        setTestMessage('');
    };

    const handleInputChange = (field: string, value: string) => {
        setData(field as keyof typeof data, value);
        if (connectionTested) {
            setConnectionTested(false);
            setConnectionSuccess(false);
            setTestMessage('');
        }
    };

    const testRedisConnection = async () => {
        setTestingConnection(true);
        setTestMessage('');

        try {
            const response = await fetch('/install/cache/test-redis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    redis_host: data.redis_host,
                    redis_port: data.redis_port,
                    redis_password: data.redis_password,
                }),
            });

            const result = await response.json();

            setConnectionTested(true);
            setConnectionSuccess(result.success);
            setTestMessage(result.message);
        } catch {
            setConnectionTested(true);
            setConnectionSuccess(false);
            setTestMessage('Failed to test connection. Please try again.');
        } finally {
            setTestingConnection(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/install/cache');
    };

    // If Redis is used anywhere, require a successful connection test
    const canContinue = !usesRedis || connectionSuccess;

    return (
        <InstallLayout
            currentStep={4}
            stepTitle="Cache & Performance"
            stepDescription="Configure caching, sessions, and background jobs."
            appName={appName}
        >
            <Head title="Installation - Cache" />

            <form onSubmit={handleSubmit}>
                {/* Cache Store Selection */}
                <div className="space-y-3">
                    <Label className="text-zinc-300">Cache Store</Label>
                    <div className="grid gap-2">
                        {cacheStoreOptions.map((option) => {
                            const Icon = option.icon;
                            const isSelected = selectedStore === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleStoreChange(option.value)}
                                    className={`relative flex items-center gap-4 rounded-lg border p-3 text-left transition-all ${
                                        isSelected
                                            ? 'border-blue-500/50 bg-blue-500/10'
                                            : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 hover:bg-zinc-800/50'
                                    }`}
                                >
                                    <div
                                        className={`flex size-10 items-center justify-center rounded-lg ${
                                            isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'
                                        }`}
                                    >
                                        <Icon className="size-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{option.label}</p>
                                            {option.recommended && (
                                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                                                    Recommended
                                                </span>
                                            )}
                                            {option.advanced && (
                                                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                                                    Advanced
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-500">{option.description}</p>
                                    </div>
                                    <div
                                        className={`flex size-4 items-center justify-center rounded-full border-2 transition-colors ${
                                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-zinc-600'
                                        }`}
                                    >
                                        {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Session & Queue Configuration */}
                <div className="mt-8 space-y-4 rounded-lg border border-zinc-800 bg-zinc-800/20 p-4">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                        <Clock className="size-4" />
                        Sessions & Background Jobs
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="session_driver" className="text-zinc-400">
                                Session Driver
                            </Label>
                            <Select value={data.session_driver} onValueChange={(value) => handleInputChange('session_driver', value)}>
                                <SelectTrigger className="border-zinc-700 bg-zinc-800/50 text-white">
                                    <SelectValue placeholder="Select driver" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sessionDriverOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            <div>
                                                <p>{option.label}</p>
                                                <p className="text-xs text-zinc-500">{option.description}</p>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-zinc-600">How user sessions are stored</p>
                            <InputError message={errors.session_driver} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="queue_connection" className="text-zinc-400">
                                Queue Driver
                            </Label>
                            <Select value={data.queue_connection} onValueChange={(value) => handleInputChange('queue_connection', value)}>
                                <SelectTrigger className="border-zinc-700 bg-zinc-800/50 text-white">
                                    <SelectValue placeholder="Select driver" />
                                </SelectTrigger>
                                <SelectContent>
                                    {queueConnectionOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            <div>
                                                <p>{option.label}</p>
                                                <p className="text-xs text-zinc-500">{option.description}</p>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-zinc-600">How background jobs are processed</p>
                            <InputError message={errors.queue_connection} />
                        </div>
                    </div>

                    {/* Queue Info Box */}
                    {data.queue_connection === 'sync' ? (
                        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                            <p className="text-xs text-amber-300">
                                <strong>Warning:</strong> Synchronous mode processes jobs immediately, which blocks HTTP requests.
                                This is fine for development but not recommended for production. Email sync and notifications
                                will run inline, potentially slowing down your application.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                            <p className="text-xs text-blue-300">
                                <strong>Note:</strong> For production, run a queue worker: <code className="rounded bg-blue-500/20 px-1">php artisan queue:work</code>
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                                The queue handles email sync, sending notifications, and other background tasks.
                            </p>
                        </div>
                    )}
                </div>

                {/* Redis Configuration */}
                {usesRedis && (
                    <div className="mt-8 space-y-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <h4 className="flex items-center gap-2 text-sm font-medium text-amber-300">
                            <Zap className="size-4" />
                            Redis Configuration
                        </h4>
                        <p className="text-xs text-zinc-400">
                            You've selected Redis for one or more features. Please configure your Redis server connection.
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="redis_host" className="text-zinc-400">
                                    Redis Host
                                </Label>
                                <Input
                                    id="redis_host"
                                    value={data.redis_host}
                                    onChange={(e) => handleInputChange('redis_host', e.target.value)}
                                    placeholder="127.0.0.1"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.redis_host} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="redis_port" className="text-zinc-400">
                                    Redis Port
                                </Label>
                                <Input
                                    id="redis_port"
                                    value={data.redis_port}
                                    onChange={(e) => handleInputChange('redis_port', e.target.value)}
                                    placeholder="6379"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.redis_port} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="redis_password" className="text-zinc-400">
                                Redis Password (optional)
                            </Label>
                            <Input
                                id="redis_password"
                                type="password"
                                value={data.redis_password}
                                onChange={(e) => handleInputChange('redis_password', e.target.value)}
                                placeholder="Leave empty if no password"
                                className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                            />
                            <InputError message={errors.redis_password} />
                        </div>

                        {/* Test Redis Connection */}
                        <div className="border-t border-amber-500/20 pt-4">
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={testRedisConnection}
                                    disabled={testingConnection || !data.redis_host || !data.redis_port}
                                    className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
                                >
                                    {testingConnection ? (
                                        <>
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <PlayCircle className="mr-2 size-4" />
                                            Test Connection
                                        </>
                                    )}
                                </Button>

                                {connectionTested && (
                                    <div className={`flex items-center gap-2 text-sm ${connectionSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {connectionSuccess ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                                        <span>{testMessage}</span>
                                    </div>
                                )}
                            </div>

                            {!connectionTested && (
                                <p className="mt-2 text-xs text-zinc-500">You must test your Redis connection before continuing.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Database Info (when not using Redis) */}
                {!usesRedis && (
                    <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-800/20 p-4">
                        <div className="flex items-start gap-3">
                            <HardDrive className="mt-0.5 size-5 text-blue-400" />
                            <div>
                                <p className="text-sm font-medium text-zinc-300">Database-based Configuration</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    You've selected database-based options for cache, sessions, and queues. This works out of the box with no
                                    additional configuration required. You can switch to Redis later for better performance in production.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="mt-8 flex items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                        <a href="/install/mail">
                            <ArrowLeft className="mr-2 size-4" />
                            Back
                        </a>
                    </Button>

                    <Button
                        type="submit"
                        disabled={processing || !canContinue}
                        className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                Continue
                                <ChevronRight className="ml-2 size-4" />
                            </>
                        )}
                    </Button>
                </div>

                {/* Hint if Redis not tested */}
                {usesRedis && !connectionTested && (
                    <p className="mt-3 text-center text-xs text-zinc-500">Test your Redis connection before continuing</p>
                )}
            </form>
        </InstallLayout>
    );
}
