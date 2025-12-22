import AppLogoIcon from '@/components/app-logo-icon';
import { Check, Database, Rocket, Settings, Sparkles } from 'lucide-react';
import { type PropsWithChildren } from 'react';

interface InstallLayoutProps {
    currentStep: number;
    stepTitle: string;
    stepDescription: string;
    appName?: string;
}

const steps = [
    { number: 1, title: 'Welcome', description: 'System requirements', icon: Sparkles },
    { number: 2, title: 'Database', description: 'Configure connection', icon: Database },
    { number: 3, title: 'Setup', description: 'Admin & organization', icon: Settings },
    { number: 4, title: 'Complete', description: 'Ready to launch', icon: Rocket },
];

export default function InstallLayout({
    children,
    currentStep,
    stepTitle,
    stepDescription,
    appName = 'FluxDesk',
}: PropsWithChildren<InstallLayoutProps>) {
    return (
        <div className="flex h-svh bg-zinc-950">
            {/* Left Sidebar - Step Progress */}
            <aside className="hidden w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 lg:flex">
                {/* Logo Section */}
                <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-5">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-800">
                        <AppLogoIcon className="size-5 fill-zinc-300" />
                    </div>
                    <div>
                        <h1 className="text-sm font-medium text-zinc-200">{appName}</h1>
                        <p className="text-xs text-zinc-500">Installation</p>
                    </div>
                </div>

                {/* Steps */}
                <nav className="flex-1 overflow-y-auto px-4 py-6">
                    <div className="relative">
                        {/* Progress Line */}
                        <div className="absolute left-[19px] top-[40px] h-[calc(100%-80px)] w-px bg-zinc-800">
                            <div
                                className="w-full bg-emerald-500 transition-all duration-500"
                                style={{
                                    height: `${Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100)}%`,
                                }}
                            />
                        </div>

                        {/* Step Items */}
                        <ul className="relative space-y-2">
                            {steps.map((step) => {
                                const isCompleted = currentStep > step.number;
                                const isCurrent = currentStep === step.number;
                                const Icon = step.icon;

                                return (
                                    <li key={step.number}>
                                        <div
                                            className={`flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors ${isCurrent ? 'bg-zinc-800' : ''}`}
                                        >
                                            {/* Step Indicator */}
                                            <div
                                                className={`relative flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                    isCompleted
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : isCurrent
                                                          ? 'bg-blue-500/20 text-blue-400'
                                                          : 'bg-zinc-800 text-zinc-600'
                                                }`}
                                            >
                                                {isCompleted ? (
                                                    <Check className="size-4" strokeWidth={2.5} />
                                                ) : (
                                                    <Icon className="size-4" />
                                                )}
                                            </div>

                                            {/* Step Text */}
                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={`text-sm font-medium ${
                                                        isCompleted
                                                            ? 'text-emerald-400'
                                                            : isCurrent
                                                              ? 'text-zinc-200'
                                                              : 'text-zinc-500'
                                                    }`}
                                                >
                                                    {step.title}
                                                </p>
                                                <p className="truncate text-xs text-zinc-600">{step.description}</p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </nav>

                {/* Footer */}
                <div className="border-t border-zinc-800 px-6 py-4">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Progress</span>
                        <span className="font-mono text-zinc-400">
                            {currentStep}/{steps.length}
                        </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${(currentStep / steps.length) * 100}%` }}
                        />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <header className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-6 py-4 lg:px-8">
                    {/* Mobile Logo */}
                    <div className="mb-4 flex items-center gap-3 lg:hidden">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-800">
                            <AppLogoIcon className="size-4 fill-zinc-300" />
                        </div>
                        <span className="text-sm font-medium text-zinc-200">{appName}</span>
                        <span className="ml-auto font-mono text-xs text-zinc-500">
                            {currentStep}/{steps.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400">
                            step-{currentStep}
                        </span>
                        <span className="text-zinc-600">/</span>
                        <h2 className="text-lg font-medium text-zinc-200">{stepTitle}</h2>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{stepDescription}</p>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="mx-auto max-w-2xl">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">{children}</div>
                    </div>
                </div>

                {/* Mobile Progress Bar */}
                <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-4 lg:hidden">
                    <div className="flex gap-1">
                        {steps.map((step) => (
                            <div
                                key={step.number}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                    currentStep >= step.number ? 'bg-emerald-500' : 'bg-zinc-800'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
