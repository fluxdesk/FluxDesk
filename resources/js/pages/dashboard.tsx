import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AppShell } from '@/layouts/app-shell';
import type { Ticket } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Code,
    Globe,
    Inbox,
    Mail,
    Minus,
    Ticket as TicketIcon,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

interface Metrics {
    total_tickets: number;
    open_tickets: number;
    unassigned_tickets: number;
    overdue_tickets: number;
    total_contacts: number;
    tickets_today: number;
    tickets_this_week: number;
    resolved_this_week: number;
}

interface StatusData {
    name: string;
    value: number;
    color: string;
}

interface TimeData {
    date: string;
    created: number;
    resolved: number;
}

interface ResponseTimeMetrics {
    avgFirstResponse: number;
    avgResolution: number;
}

interface AgentPerformance {
    id: number;
    name: string;
    avatar?: string;
    total_assigned: number;
    resolved_count: number;
    resolution_rate: number;
}

interface TrendData {
    current: number;
    previous: number;
    change: number;
}

interface Trends {
    created: TrendData;
    resolved: TrendData;
}

interface ChannelData {
    name: string;
    value: number;
    icon: string;
    color: string;
}

interface Props {
    metrics: Metrics;
    ticketsByStatus: StatusData[];
    ticketsOverTime: TimeData[];
    recentTickets: Ticket[];
    slaAtRisk: Ticket[];
    slaBreached: Ticket[];
    selectedRange: string;
    responseTimeMetrics: ResponseTimeMetrics;
    agentPerformance: AgentPerformance[];
    trends: Trends;
    ticketsByChannel: ChannelData[];
}

const dateRanges = [
    { value: '24h', label: 'Afgelopen 24 uur' },
    { value: '7d', label: 'Afgelopen 7 dagen' },
    { value: '30d', label: 'Afgelopen 30 dagen' },
    { value: '90d', label: 'Afgelopen 3 maanden' },
];

const chartConfig = {
    created: {
        label: 'Aangemaakt',
        color: 'hsl(var(--chart-1))',
    },
    resolved: {
        label: 'Opgelost',
        color: 'hsl(var(--chart-2))',
    },
} satisfies ChartConfig;

const agentChartConfig = {
    total_assigned: {
        label: 'Toegewezen',
        color: 'hsl(var(--chart-1))',
    },
    resolved_count: {
        label: 'Opgelost',
        color: 'hsl(var(--chart-2))',
    },
} satisfies ChartConfig;

function formatTime(hours: number): string {
    if (hours === 0) return '0u';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}u`;
    return `${Math.round(hours / 24)}d`;
}

export default function Dashboard({
    metrics,
    ticketsByStatus,
    ticketsOverTime,
    recentTickets,
    slaAtRisk,
    slaBreached,
    selectedRange,
    responseTimeMetrics,
    agentPerformance,
    trends,
    ticketsByChannel,
}: Props) {
    const handleRangeChange = (value: string) => {
        router.get('/dashboard', { range: value }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AppShell>
            <Head title="Statistieken" />

            <div className="flex min-h-full flex-col">
                {/* Header - Fixed */}
                <div className="shrink-0 border-b px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Statistieken</h1>
                            <p className="text-sm text-muted-foreground">
                                Overzicht van je supporttickets
                            </p>
                        </div>
                        <Select value={selectedRange} onValueChange={handleRangeChange}>
                            <SelectTrigger className="h-9 w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {dateRanges.map((range) => (
                                    <SelectItem key={range.value} value={range.value}>
                                        {range.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex-1 space-y-6 p-6">
                    {/* Row 1: Metric Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            title="Open tickets"
                            value={metrics.open_tickets}
                            description={`${metrics.total_tickets} tickets totaal`}
                            icon={Inbox}
                            variant="default"
                        />
                        <MetricCard
                            title="Niet toegewezen"
                            value={metrics.unassigned_tickets}
                            description="Wacht op toewijzing"
                            icon={Users}
                            variant={metrics.unassigned_tickets > 0 ? 'warning' : 'default'}
                        />
                        <MetricCard
                            title="SLA overschreden"
                            value={metrics.overdue_tickets}
                            description="Deadline verstreken"
                            icon={AlertTriangle}
                            variant={metrics.overdue_tickets > 0 ? 'destructive' : 'default'}
                        />
                        <MetricCard
                            title="Opgelost deze week"
                            value={metrics.resolved_this_week}
                            description={`${metrics.tickets_this_week} nieuw deze week`}
                            icon={CheckCircle2}
                            variant="success"
                        />
                    </div>

                    {/* Row 2: Response Times + Trends */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <ResponseTimeCard metrics={responseTimeMetrics} />
                        <TrendCard trends={trends} />
                    </div>

                    {/* Row 3: Activity Chart + Status Breakdown */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Tickets Over Time */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Ticketactiviteit</CardTitle>
                                <CardDescription>
                                    {dateRanges.find((r) => r.value === selectedRange)?.label || 'Afgelopen 7 dagen'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                                    <AreaChart data={ticketsOverTime}>
                                        <defs>
                                            <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-created)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="var(--color-created)" stopOpacity={0.1} />
                                            </linearGradient>
                                            <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-resolved)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="var(--color-resolved)" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            fontSize={12}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            fontSize={12}
                                            allowDecimals={false}
                                        />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Area
                                            type="monotone"
                                            dataKey="created"
                                            stroke="var(--color-created)"
                                            fill="url(#fillCreated)"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="resolved"
                                            stroke="var(--color-resolved)"
                                            fill="url(#fillResolved)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Tickets by Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Tickets per status</CardTitle>
                                <CardDescription>Huidige verdeling</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center">
                                    <ChartContainer config={{}} className="h-[200px] w-[200px]">
                                        <PieChart>
                                            <Pie
                                                data={ticketsByStatus.filter((s) => s.value > 0)}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={2}
                                            >
                                                {ticketsByStatus
                                                    .filter((s) => s.value > 0)
                                                    .map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                            </Pie>
                                            <ChartTooltip
                                                content={<ChartTooltipContent nameKey="name" />}
                                            />
                                        </PieChart>
                                    </ChartContainer>
                                    <div className="ml-4 space-y-2">
                                        {ticketsByStatus.map((status) => (
                                            <div key={status.name} className="flex items-center gap-2 text-sm">
                                                <div
                                                    className="h-3 w-3 rounded-full"
                                                    style={{ backgroundColor: status.color }}
                                                />
                                                <span className="text-muted-foreground">{status.name}</span>
                                                <span className="font-medium">{status.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Row 4: Agent Performance + Channel Breakdown */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <AgentPerformanceCard agents={agentPerformance} />
                        <ChannelBreakdownCard data={ticketsByChannel} />
                    </div>

                    {/* Row 5: SLA Warnings and Recent Tickets */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* SLA Alerts */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                    SLA-waarschuwingen
                                </CardTitle>
                                <CardDescription>
                                    Tickets met risico of deadline overschreden
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {slaBreached.length === 0 && slaAtRisk.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
                                        <p className="text-sm text-muted-foreground">
                                            Alle tickets zijn binnen SLA
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {slaBreached.map((ticket) => (
                                            <SlaTicketRow
                                                key={ticket.id}
                                                ticket={ticket}
                                                variant="breached"
                                            />
                                        ))}
                                        {slaAtRisk.map((ticket) => (
                                            <SlaTicketRow
                                                key={ticket.id}
                                                ticket={ticket}
                                                variant="at-risk"
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Tickets */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TicketIcon className="h-4 w-4" />
                                    Recente tickets
                                </CardTitle>
                                <CardDescription>Laatste activiteit</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recentTickets.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Inbox className="mb-2 h-8 w-8 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">Nog geen tickets</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {recentTickets.map((ticket) => (
                                            <Link
                                                key={ticket.id}
                                                href={`/inbox/${ticket.id}`}
                                                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                            >
                                                <div
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ backgroundColor: ticket.status?.color }}
                                                />
                                                <div className="flex-1 truncate">
                                                    <p className="truncate text-sm font-medium">
                                                        {ticket.subject}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        #{ticket.ticket_number} &middot;{' '}
                                                        {ticket.contact?.name || ticket.contact?.email}
                                                    </p>
                                                </div>
                                                <div
                                                    className="rounded px-2 py-0.5 text-xs"
                                                    style={{
                                                        backgroundColor: `${ticket.priority?.color}20`,
                                                        color: ticket.priority?.color,
                                                    }}
                                                >
                                                    {ticket.priority?.name}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

function MetricCard({
    title,
    value,
    description,
    icon: Icon,
    variant = 'default',
}: {
    title: string;
    value: number;
    description: string;
    icon: React.ElementType;
    variant?: 'default' | 'warning' | 'destructive' | 'success';
}) {
    const variantStyles = {
        default: 'bg-muted/50 text-foreground',
        warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        destructive: 'bg-destructive/10 text-destructive',
        success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    };

    const iconStyles = {
        default: 'text-muted-foreground',
        warning: 'text-amber-500',
        destructive: 'text-destructive',
        success: 'text-green-500',
    };

    return (
        <Card className={variant !== 'default' ? variantStyles[variant] : ''}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${iconStyles[variant]}`} />
                </div>
            </CardContent>
        </Card>
    );
}

function ResponseTimeCard({ metrics }: { metrics: ResponseTimeMetrics }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" />
                    Responstijden
                </CardTitle>
                <CardDescription>Gemiddelde tijden in deze periode</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Eerste reactie</p>
                        <p className="text-3xl font-bold">{formatTime(metrics.avgFirstResponse)}</p>
                        <p className="text-xs text-muted-foreground">gemiddeld</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Oplostijd</p>
                        <p className="text-3xl font-bold">{formatTime(metrics.avgResolution)}</p>
                        <p className="text-xs text-muted-foreground">gemiddeld</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function TrendCard({ trends }: { trends: Trends }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Vergelijking vorige periode</CardTitle>
                <CardDescription>Ten opzichte van dezelfde periode ervoor</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-6">
                    <TrendItem label="Nieuwe tickets" current={trends.created.current} change={trends.created.change} />
                    <TrendItem label="Opgeloste tickets" current={trends.resolved.current} change={trends.resolved.change} />
                </div>
            </CardContent>
        </Card>
    );
}

function TrendItem({ label, current, change }: { label: string; current: number; change: number }) {
    const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
    const colorClass = change > 0
        ? 'text-green-600 dark:text-green-400'
        : change < 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-muted-foreground';

    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{current}</span>
                <span className={`flex items-center gap-0.5 text-sm font-medium ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                    {Math.abs(change)}%
                </span>
            </div>
        </div>
    );
}

function AgentPerformanceCard({ agents }: { agents: AgentPerformance[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Prestaties per medewerker
                </CardTitle>
                <CardDescription>Tickets toegewezen en opgelost</CardDescription>
            </CardHeader>
            <CardContent>
                {agents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Users className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Geen ticketactiviteit in deze periode</p>
                    </div>
                ) : (
                    <ChartContainer config={agentChartConfig} className="h-[200px] w-full">
                        <BarChart data={agents} layout="vertical" margin={{ left: 0, right: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={80}
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="total_assigned" fill="var(--color-total_assigned)" radius={4} barSize={12} />
                            <Bar dataKey="resolved_count" fill="var(--color-resolved_count)" radius={4} barSize={12} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}

function ChannelBreakdownCard({ data }: { data: ChannelData[] }) {
    const icons: Record<string, React.ElementType> = {
        globe: Globe,
        mail: Mail,
        code: Code,
    };

    const hasData = data.some((d) => d.value > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Tickets per kanaal</CardTitle>
                <CardDescription>Verdeling over invoerkanalen</CardDescription>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Globe className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Geen tickets in deze periode</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-center">
                        <ChartContainer config={{}} className="h-[160px] w-[160px]">
                            <PieChart>
                                <Pie
                                    data={data.filter((d) => d.value > 0)}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={2}
                                >
                                    {data.filter((d) => d.value > 0).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                            </PieChart>
                        </ChartContainer>
                        <div className="ml-6 space-y-3">
                            {data.map((channel) => {
                                const IconComponent = icons[channel.icon] || Globe;
                                return (
                                    <div key={channel.name} className="flex items-center gap-3 text-sm">
                                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                                        <span className="min-w-[50px] text-muted-foreground">{channel.name}</span>
                                        <span className="font-medium">{channel.value}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SlaTicketRow({
    ticket,
    variant,
}: {
    ticket: Ticket;
    variant: 'breached' | 'at-risk';
}) {
    const deadline = new Date(ticket.sla_deadline!);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
    const minutes = Math.abs(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));

    const timeText =
        variant === 'breached'
            ? `${hours}u ${minutes}m te laat`
            : `${hours}u ${minutes}m over`;

    return (
        <Link
            href={`/inbox/${ticket.id}`}
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                variant === 'breached'
                    ? 'border-destructive/50 bg-destructive/5'
                    : 'border-amber-500/50 bg-amber-500/5'
            }`}
        >
            <Clock
                className={`h-4 w-4 ${
                    variant === 'breached' ? 'text-destructive' : 'text-amber-500'
                }`}
            />
            <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium">{ticket.subject}</p>
                <p className="text-xs text-muted-foreground">
                    #{ticket.ticket_number} &middot; {ticket.contact?.name || ticket.contact?.email}
                </p>
            </div>
            <span
                className={`text-xs font-medium ${
                    variant === 'breached' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
                }`}
            >
                {timeText}
            </span>
        </Link>
    );
}
