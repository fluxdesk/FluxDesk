import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import OrganizationLayout from '@/layouts/organization/layout';
import { type EmailChannel, type PaginatedData } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { index } from '@/routes/organization/email-channels';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Inbox,
    Mail,
    MessageSquare,
    RefreshCw,
    Send,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EmailChannelLog {
    id: number;
    email_channel_id: number;
    type: 'sync' | 'send' | 'receive';
    status: 'success' | 'failed' | 'partial';
    subject: string | null;
    recipient: string | null;
    ticket_id: number | null;
    message_id: number | null;
    emails_processed: number | null;
    tickets_created: number | null;
    messages_added: number | null;
    error: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    description: string;
    status_color: string;
    type_label: string;
    ticket?: {
        id: number;
        ticket_number: string;
        subject: string;
    };
}

interface Props {
    channel: EmailChannel;
    logs: PaginatedData<EmailChannelLog>;
    stats: {
        total: number;
        syncs: number;
        sends: number;
        failed: number;
    };
    filter?: string;
}

type FilterType = 'all' | 'sync' | 'send' | 'failed';

const filterTabs: { value: FilterType; label: string; icon: React.ElementType }[] = [
    { value: 'all', label: 'Alles', icon: Inbox },
    { value: 'sync', label: 'Synchronisaties', icon: RefreshCw },
    { value: 'send', label: 'Verzonden', icon: Send },
    { value: 'failed', label: 'Mislukt', icon: XCircle },
];

export default function Logs({ channel, logs, stats, filter = 'all' }: Props) {
    const [selectedLog, setSelectedLog] = useState<EmailChannelLog | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['logs', 'stats'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const handleFilterChange = (newFilter: FilterType) => {
        router.get(
            window.location.pathname,
            newFilter === 'all' ? {} : { filter: newFilter },
            { preserveState: true, preserveScroll: true }
        );
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'failed':
                return <XCircle className="h-4 w-4 text-destructive" />;
            case 'partial':
                return <AlertCircle className="h-4 w-4 text-amber-500" />;
            default:
                return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'sync':
                return <RefreshCw className="h-4 w-4" />;
            case 'send':
                return <Send className="h-4 w-4" />;
            case 'receive':
                return <Mail className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const getStatusBadge = (status: string, color: string) => {
        const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
            green: 'default',
            red: 'destructive',
            yellow: 'secondary',
            gray: 'outline',
        };

        const labels: Record<string, string> = {
            success: 'Geslaagd',
            failed: 'Mislukt',
            partial: 'Gedeeltelijk',
        };

        return (
            <Badge variant={variants[color] || 'outline'} className="text-xs">
                {labels[status] || status}
            </Badge>
        );
    };

    return (
        <AppLayout>
            <Head title={`${channel.name} - Logs`} />

            <OrganizationLayout>
                <div className="mx-auto max-w-4xl space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href={index().url}
                                className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-muted"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                            <div>
                                <h1 className="text-lg font-semibold">
                                    Activiteitenlog
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {channel.name} &middot; {channel.email_address}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
                            Vernieuwen
                        </Button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid gap-4 sm:grid-cols-4">
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                        <FileText className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats?.total ?? logs.total}</p>
                                        <p className="text-xs text-muted-foreground">Totaal logs</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                                        <RefreshCw className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats?.syncs ?? 0}</p>
                                        <p className="text-xs text-muted-foreground">Synchronisaties</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                                        <Send className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats?.sends ?? 0}</p>
                                        <p className="text-xs text-muted-foreground">Verzonden</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                                        <XCircle className="h-5 w-5 text-destructive" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats?.failed ?? 0}</p>
                                        <p className="text-xs text-muted-foreground">Mislukt</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
                        {filterTabs.map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => handleFilterChange(tab.value)}
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                    filter === tab.value
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Logs Table */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Recente activiteiten</CardTitle>
                            <CardDescription>
                                Klik op een regel voor meer details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {logs.data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">Geen logs</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {filter === 'all'
                                            ? 'Er zijn nog geen activiteiten gelogd voor dit e-mailaccount.'
                                            : 'Geen activiteiten gevonden voor dit filter.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="w-[180px]">Datum</TableHead>
                                                    <TableHead className="w-[140px]">Type</TableHead>
                                                    <TableHead className="w-[100px]">Status</TableHead>
                                                    <TableHead>Details</TableHead>
                                                    <TableHead className="w-[100px]">Ticket</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {logs.data.map((log) => (
                                                    <TableRow
                                                        key={log.id}
                                                        className="cursor-pointer"
                                                        onClick={() => setSelectedLog(log)}
                                                    >
                                                        <TableCell className="text-sm">
                                                            <div className="flex items-center gap-2">
                                                                {getStatusIcon(log.status)}
                                                                <span
                                                                    className="text-muted-foreground"
                                                                    title={format(new Date(log.created_at), 'PPpp', { locale: nl })}
                                                                >
                                                                    {formatDistanceToNow(new Date(log.created_at), {
                                                                        addSuffix: true,
                                                                        locale: nl,
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2 text-sm">
                                                                {getTypeIcon(log.type)}
                                                                <span>{log.type_label}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusBadge(log.status, log.status_color)}
                                                        </TableCell>
                                                        <TableCell className="max-w-[300px]">
                                                            <p className="truncate text-sm text-muted-foreground">
                                                                {log.description}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell>
                                                            {log.ticket && (
                                                                <Link
                                                                    href={`/inbox/${log.ticket.id}`}
                                                                    className="text-sm font-medium text-primary hover:underline"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {log.ticket.ticket_number}
                                                                </Link>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Pagination */}
                                    {logs.last_page > 1 && (
                                        <div className="flex items-center justify-between pt-2">
                                            <p className="text-sm text-muted-foreground">
                                                Pagina {logs.current_page} van {logs.last_page} ({logs.total} resultaten)
                                            </p>
                                            <div className="flex gap-2">
                                                {logs.prev_page_url && (
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={logs.prev_page_url}>Vorige</Link>
                                                    </Button>
                                                )}
                                                {logs.next_page_url && (
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={logs.next_page_url}>Volgende</Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Detail Modal */}
                <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {selectedLog && getTypeIcon(selectedLog.type)}
                                {selectedLog?.type_label}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedLog && format(new Date(selectedLog.created_at), 'EEEE d MMMM yyyy, HH:mm', { locale: nl })}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedLog && (
                            <div className="space-y-4">
                                {/* Status */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Status:</span>
                                    {getStatusBadge(selectedLog.status, selectedLog.status_color)}
                                </div>

                                {/* Description */}
                                <div>
                                    <span className="text-sm font-medium">Beschrijving:</span>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {selectedLog.description}
                                    </p>
                                </div>

                                {/* Sync stats */}
                                {selectedLog.type === 'sync' && (
                                    <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{selectedLog.emails_processed || 0}</div>
                                            <div className="text-xs text-muted-foreground">E-mails verwerkt</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">{selectedLog.tickets_created || 0}</div>
                                            <div className="text-xs text-muted-foreground">Tickets aangemaakt</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">{selectedLog.messages_added || 0}</div>
                                            <div className="text-xs text-muted-foreground">Antwoorden</div>
                                        </div>
                                    </div>
                                )}

                                {/* Send details */}
                                {selectedLog.type === 'send' && (
                                    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                        {selectedLog.recipient && (
                                            <div>
                                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ontvanger</span>
                                                <p className="mt-0.5 text-sm">{selectedLog.recipient}</p>
                                            </div>
                                        )}
                                        {selectedLog.subject && (
                                            <div>
                                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Onderwerp</span>
                                                <p className="mt-0.5 text-sm">{selectedLog.subject}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Linked ticket */}
                                {selectedLog.ticket && (
                                    <Link
                                        href={`/inbox/${selectedLog.ticket.id}`}
                                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                    >
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                            <MessageSquare className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-primary">
                                                {selectedLog.ticket.ticket_number}
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {selectedLog.ticket.subject}
                                            </p>
                                        </div>
                                    </Link>
                                )}

                                {/* Error message */}
                                {selectedLog.error && (
                                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            Foutmelding
                                        </div>
                                        <p className="mt-2 font-mono text-xs text-destructive/80 whitespace-pre-wrap">
                                            {selectedLog.error}
                                        </p>
                                    </div>
                                )}

                                {/* Metadata */}
                                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                    <div>
                                        <span className="text-sm font-medium">Extra informatie:</span>
                                        <pre className="mt-2 rounded-lg bg-muted p-3 text-xs overflow-x-auto">
                                            {JSON.stringify(selectedLog.metadata, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </OrganizationLayout>
        </AppLayout>
    );
}
