import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InstallLayout from '@/layouts/install-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, ChevronRight, Database, HardDrive, Loader2, PlayCircle, Settings, XCircle } from 'lucide-react';
import { useState } from 'react';

interface ExistingConfig {
    driver: string;
    host?: string;
    port?: string;
    database?: string;
    username?: string;
    password?: string;
    configured: boolean;
}

interface Props {
    appName: string;
    currentDriver: string;
    existingConfig: ExistingConfig | null;
}

const databaseOptions = [
    {
        value: 'sqlite',
        label: 'SQLite',
        description: 'Simple, file-based database. Great for small deployments.',
        icon: HardDrive,
        recommended: true,
    },
    {
        value: 'mysql',
        label: 'MySQL / MariaDB',
        description: 'Popular relational database for production environments.',
        icon: Database,
    },
    {
        value: 'pgsql',
        label: 'PostgreSQL',
        description: 'Advanced open-source database with powerful features.',
        icon: Database,
    },
];

const driverLabels: Record<string, string> = {
    mysql: 'MySQL',
    mariadb: 'MariaDB',
    pgsql: 'PostgreSQL',
    sqlite: 'SQLite',
};

export default function DatabaseSetup({ appName, currentDriver, existingConfig }: Props) {
    const [showManualConfig, setShowManualConfig] = useState(!existingConfig?.configured);
    const [selectedDriver, setSelectedDriver] = useState(currentDriver || 'sqlite');
    const [connectionTested, setConnectionTested] = useState(false);
    const [connectionSuccess, setConnectionSuccess] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [testMessage, setTestMessage] = useState('');
    const [usingExisting, setUsingExisting] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        driver: currentDriver || 'sqlite',
        host: '127.0.0.1',
        port: '3306',
        database: 'fluxdesk',
        username: '',
        password: '',
    });

    const handleDriverChange = (driver: string) => {
        setSelectedDriver(driver);
        setData('driver', driver);
        setConnectionTested(false);
        setConnectionSuccess(false);
        setTestMessage('');

        if (driver === 'mysql') {
            setData('port', '3306');
        } else if (driver === 'pgsql') {
            setData('port', '5432');
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setData(field as keyof typeof data, value);
        if (connectionTested) {
            setConnectionTested(false);
            setConnectionSuccess(false);
            setTestMessage('');
        }
    };

    const testConnection = async (config?: ExistingConfig) => {
        setTestingConnection(true);
        setTestMessage('');

        const testData = config || data;

        try {
            const response = await fetch('/install/database/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(testData),
            });

            const result = await response.json();

            setConnectionTested(true);
            setConnectionSuccess(result.success);
            setTestMessage(result.message);

            return result.success;
        } catch {
            setConnectionTested(true);
            setConnectionSuccess(false);
            setTestMessage('Failed to test connection. Please try again.');
            return false;
        } finally {
            setTestingConnection(false);
        }
    };

    const handleUseExisting = async () => {
        if (!existingConfig) return;

        setUsingExisting(true);
        const success = await testConnection(existingConfig);

        if (success) {
            router.post('/install/database/use-existing');
        } else {
            setUsingExisting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/install/database');
    };

    const canContinue = selectedDriver === 'sqlite' || connectionSuccess;

    // Show pre-configured database card
    if (existingConfig?.configured && !showManualConfig) {
        return (
            <InstallLayout
                currentStep={2}
                stepTitle="Database Configuration"
                stepDescription="We detected a pre-configured database in your environment."
                appName={appName}
            >
                <Head title="Installation - Database" />

                <div className="space-y-6">
                    {/* Pre-configured Database Card */}
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5">
                        <div className="flex items-start gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                                <Database className="size-5 text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-white">Database Already Configured</h3>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Your environment has database credentials configured. This is typical for Forge, Ploi, or similar deployment platforms.
                                </p>

                                <div className="mt-4 space-y-2 rounded-lg bg-zinc-900/50 p-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Driver</span>
                                        <span className="font-medium text-zinc-300">
                                            {driverLabels[existingConfig.driver] || existingConfig.driver}
                                        </span>
                                    </div>
                                    {existingConfig.driver !== 'sqlite' && (
                                        <>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-zinc-500">Host</span>
                                                <span className="font-mono text-zinc-300">
                                                    {existingConfig.host}:{existingConfig.port}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-zinc-500">Database</span>
                                                <span className="font-mono text-zinc-300">{existingConfig.database}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-zinc-500">Username</span>
                                                <span className="font-mono text-zinc-300">{existingConfig.username}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Connection Test Result */}
                                {connectionTested && (
                                    <div
                                        className={`mt-4 flex items-center gap-2 text-sm ${connectionSuccess ? 'text-emerald-400' : 'text-red-400'}`}
                                    >
                                        {connectionSuccess ? (
                                            <CheckCircle2 className="size-4" />
                                        ) : (
                                            <XCircle className="size-4" />
                                        )}
                                        <span>{testMessage}</span>
                                    </div>
                                )}

                                {/* Skip option when test fails */}
                                {connectionTested && !connectionSuccess && !usingExisting && (
                                    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                                        <p className="text-sm text-amber-200">
                                            If you're sure the database is configured correctly, you can skip the test and continue anyway.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUsingExisting(true);
                                                router.post('/install/database/use-existing');
                                            }}
                                            className="mt-2 text-sm font-medium text-amber-400 hover:text-amber-300"
                                        >
                                            Skip test and continue anyway →
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        >
                            <a href="/install">
                                <ArrowLeft className="mr-2 size-4" />
                                Back
                            </a>
                        </Button>

                        <Button
                            type="button"
                            onClick={handleUseExisting}
                            disabled={testingConnection || usingExisting}
                            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {testingConnection || usingExisting ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    {testingConnection ? 'Testing Connection...' : 'Setting up...'}
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 size-4" />
                                    Test & Use This Configuration
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Manual Config Link */}
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => setShowManualConfig(true)}
                            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                        >
                            <Settings className="size-3.5" />
                            Configure manually instead
                        </button>
                    </div>
                </div>
            </InstallLayout>
        );
    }

    // Show manual configuration form
    return (
        <InstallLayout
            currentStep={2}
            stepTitle="Database Configuration"
            stepDescription="Choose your database type and configure the connection."
            appName={appName}
        >
            <Head title="Installation - Database" />

            <form onSubmit={handleSubmit}>
                {/* Back to pre-config option */}
                {existingConfig?.configured && showManualConfig && (
                    <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-800/30 p-3">
                        <button
                            type="button"
                            onClick={() => {
                                setShowManualConfig(false);
                                setConnectionTested(false);
                                setConnectionSuccess(false);
                                setTestMessage('');
                            }}
                            className="flex w-full items-center gap-3 text-left text-sm text-zinc-400 transition-colors hover:text-white"
                        >
                            <ArrowLeft className="size-4" />
                            <span>Back to pre-configured database</span>
                        </button>
                    </div>
                )}

                {/* Database Type Selection */}
                <div className="space-y-3">
                    <Label className="text-zinc-300">Database Type</Label>
                    <div className="grid gap-2">
                        {databaseOptions.map((option) => {
                            const Icon = option.icon;
                            const isSelected = selectedDriver === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleDriverChange(option.value)}
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
                                            <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                                {option.label}
                                            </p>
                                            {option.recommended && (
                                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                                                    Recommended
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

                {/* Connection Details (for MySQL/PostgreSQL) */}
                {selectedDriver !== 'sqlite' && (
                    <div className="mt-8 space-y-4 rounded-lg border border-zinc-800 bg-zinc-800/20 p-4">
                        <h4 className="text-sm font-medium text-zinc-300">Connection Details</h4>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="host" className="text-zinc-400">
                                    Host
                                </Label>
                                <Input
                                    id="host"
                                    value={data.host}
                                    onChange={(e) => handleInputChange('host', e.target.value)}
                                    placeholder="127.0.0.1"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.host} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="port" className="text-zinc-400">
                                    Port
                                </Label>
                                <Input
                                    id="port"
                                    value={data.port}
                                    onChange={(e) => handleInputChange('port', e.target.value)}
                                    placeholder={selectedDriver === 'mysql' ? '3306' : '5432'}
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.port} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="database" className="text-zinc-400">
                                Database Name
                            </Label>
                            <Input
                                id="database"
                                value={data.database}
                                onChange={(e) => handleInputChange('database', e.target.value)}
                                placeholder="fluxdesk"
                                className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                            />
                            <p className="text-xs text-zinc-600">The database must already exist. We won't create it for you.</p>
                            <InputError message={errors.database} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-zinc-400">
                                    Username
                                </Label>
                                <Input
                                    id="username"
                                    value={data.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                    placeholder="root"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.username} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-zinc-400">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                    placeholder="••••••••"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.password} />
                            </div>
                        </div>

                        {/* Test Connection Button */}
                        <div className="border-t border-zinc-800 pt-4">
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => testConnection()}
                                    disabled={testingConnection || !data.host || !data.database || !data.username}
                                    className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
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
                                    <div
                                        className={`flex items-center gap-2 text-sm ${connectionSuccess ? 'text-emerald-400' : 'text-red-400'}`}
                                    >
                                        {connectionSuccess ? (
                                            <CheckCircle2 className="size-4" />
                                        ) : (
                                            <XCircle className="size-4" />
                                        )}
                                        <span>{testMessage}</span>
                                    </div>
                                )}
                            </div>

                            {!connectionTested && (
                                <p className="mt-2 text-xs text-zinc-500">
                                    Test your connection before continuing to ensure everything is configured correctly.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* SQLite Info */}
                {selectedDriver === 'sqlite' && (
                    <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-800/20 p-4">
                        <p className="text-sm text-zinc-400">SQLite will create a database file at:</p>
                        <code className="mt-2 block rounded bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-300">
                            database/database.sqlite
                        </code>
                    </div>
                )}

                {/* Global Error */}
                {errors.database && selectedDriver === 'sqlite' && (
                    <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                        <p className="text-sm text-red-400">{errors.database}</p>
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
                        <a href="/install">
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
                                Connecting & Migrating...
                            </>
                        ) : (
                            <>
                                Continue
                                <ChevronRight className="ml-2 size-4" />
                            </>
                        )}
                    </Button>
                </div>

                {/* Hint if connection not tested */}
                {selectedDriver !== 'sqlite' && !connectionTested && (
                    <p className="mt-3 text-center text-xs text-zinc-500">
                        Test your database connection before continuing
                    </p>
                )}
            </form>
        </InstallLayout>
    );
}
