import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InstallLayout from '@/layouts/install-layout';
import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, ChevronRight, FileText, Loader2, Mail, PlayCircle, Server, XCircle } from 'lucide-react';
import { useState } from 'react';

interface Props {
    appName: string;
    currentMailer: string;
    currentConfig: {
        host: string;
        port: string;
        encryption: string;
        from_address: string;
    };
}

const mailerOptions = [
    {
        value: 'log',
        label: 'Log (Development)',
        description: 'Emails are written to log files. Perfect for development and testing.',
        icon: FileText,
        recommended: true,
    },
    {
        value: 'smtp',
        label: 'SMTP Server',
        description: 'Send emails via an SMTP server. Required for production.',
        icon: Server,
    },
];

export default function MailSetup({ appName, currentMailer, currentConfig }: Props) {
    const [selectedMailer, setSelectedMailer] = useState(currentMailer || 'log');
    const [connectionTested, setConnectionTested] = useState(false);
    const [connectionSuccess, setConnectionSuccess] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [testMessage, setTestMessage] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        mailer: currentMailer || 'log',
        host: currentConfig.host || 'smtp.mailtrap.io',
        port: currentConfig.port || '587',
        username: '',
        password: '',
        encryption: currentConfig.encryption || 'tls',
        from_address: currentConfig.from_address || 'hello@example.com',
    });

    const handleMailerChange = (mailer: string) => {
        setSelectedMailer(mailer);
        setData('mailer', mailer);
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

    const testConnection = async () => {
        setTestingConnection(true);
        setTestMessage('');

        try {
            const response = await fetch('/install/mail/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(data),
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
        post('/install/mail');
    };

    // Log mailer doesn't need a connection test
    const canContinue = selectedMailer === 'log' || connectionSuccess;

    return (
        <InstallLayout currentStep={3} stepTitle="Mail Configuration" stepDescription="Configure how your application sends emails." appName={appName}>
            <Head title="Installation - Mail" />

            <form onSubmit={handleSubmit}>
                {/* Mailer Type Selection */}
                <div className="space-y-3">
                    <Label className="text-zinc-300">Mail Driver</Label>
                    <div className="grid gap-2">
                        {mailerOptions.map((option) => {
                            const Icon = option.icon;
                            const isSelected = selectedMailer === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleMailerChange(option.value)}
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
                                                    Easy Setup
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

                {/* SMTP Configuration */}
                {selectedMailer === 'smtp' && (
                    <div className="mt-8 space-y-4 rounded-lg border border-zinc-800 bg-zinc-800/20 p-4">
                        <h4 className="text-sm font-medium text-zinc-300">SMTP Settings</h4>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="host" className="text-zinc-400">
                                    SMTP Host
                                </Label>
                                <Input
                                    id="host"
                                    value={data.host}
                                    onChange={(e) => handleInputChange('host', e.target.value)}
                                    placeholder="smtp.mailtrap.io"
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
                                    placeholder="587"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.port} />
                            </div>
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
                                    placeholder="your-username"
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
                                    placeholder="your-password"
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                                />
                                <InputError message={errors.password} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="encryption" className="text-zinc-400">
                                Encryption
                            </Label>
                            <Select value={data.encryption} onValueChange={(value) => handleInputChange('encryption', value)}>
                                <SelectTrigger className="border-zinc-700 bg-zinc-800/50 text-white">
                                    <SelectValue placeholder="Select encryption" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tls">TLS (Recommended for production)</SelectItem>
                                    <SelectItem value="ssl">SSL (Port 465)</SelectItem>
                                    <SelectItem value="null">None (Local dev - Mailpit, MailHog)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-zinc-600">
                                Use "None" for local development servers like Herd's Mailpit or MailHog.
                            </p>
                            <InputError message={errors.encryption} />
                        </div>

                        {/* Test Connection Button */}
                        <div className="border-t border-zinc-800 pt-4">
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={testConnection}
                                    disabled={testingConnection || !data.host || !data.port}
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
                                    <div className={`flex items-center gap-2 text-sm ${connectionSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {connectionSuccess ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                                        <span>{testMessage}</span>
                                    </div>
                                )}
                            </div>

                            {!connectionTested && (
                                <p className="mt-2 text-xs text-zinc-500">
                                    Test your SMTP connection before continuing to ensure emails can be sent.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Log Mailer Info */}
                {selectedMailer === 'log' && (
                    <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-800/20 p-4">
                        <div className="flex items-start gap-3">
                            <Mail className="mt-0.5 size-5 text-blue-400" />
                            <div>
                                <p className="text-sm font-medium text-zinc-300">Log Driver Selected</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    All emails will be written to your log files instead of being sent. This is perfect for development and testing.
                                    You can configure a real SMTP server later in your .env file.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* From Address */}
                <div className="mt-8 space-y-4 rounded-lg border border-zinc-800 bg-zinc-800/20 p-4">
                    <h4 className="text-sm font-medium text-zinc-300">Sender Information</h4>
                    <div className="space-y-2">
                        <Label htmlFor="from_address" className="text-zinc-400">
                            From Email Address
                        </Label>
                        <Input
                            id="from_address"
                            type="email"
                            value={data.from_address}
                            onChange={(e) => handleInputChange('from_address', e.target.value)}
                            placeholder="noreply@example.com"
                            className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-600"
                        />
                        <p className="text-xs text-zinc-600">This will be the default "From" address for all outgoing emails.</p>
                        <InputError message={errors.from_address} />
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                        <a href="/install/database">
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

                {/* Hint if connection not tested */}
                {selectedMailer === 'smtp' && !connectionTested && (
                    <p className="mt-3 text-center text-xs text-zinc-500">Test your SMTP connection before continuing</p>
                )}
            </form>
        </InstallLayout>
    );
}
