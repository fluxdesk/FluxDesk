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
import { type MessagingChannel, type PaginatedData } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { index } from '@/routes/organization/messaging-channels';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Inbox,
    MessageCircle,
    MessageSquare,
    RefreshCw,
    Send,
    XCircle,
    Webhook,
} from 'lucide-react';
import { useState } from 'react';
import { formatDateTime, formatRelative } from '@/lib/date';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface MessagingChannelLog {
    id: number;
    messaging_channel_id: number;
    type: 'webhook' | 'send' | 'auto_reply';
    status: 'success' | 'failed';
    ticket_id: number | null;
    message_id: number | null;
    messages_received: number | null;
    messages_sent: number | null;
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
    message?: {
        id: number;
    };
}

interface Props {
    channel: MessagingChannel;
    logs: PaginatedData<MessagingChannelLog>;
    stats: {
        total: number;
        webhooks: number;
        sends: number;
        auto_replies: number;
        failed: number;
    };
    filter?: string;
}

type FilterType = 'all' | 'webhook' | 'send' | 'auto_reply' | 'failed';

export default function Logs({ channel, logs, stats, filter = 'all' }: Props) {
    const { t } = useTranslation('organization');
    const [selectedLog, setSelectedLog] = useState<MessagingChannelLog | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filterTabs: { value: FilterType; label: string; icon: React.ElementType }[] = [
        { value: 'all', label: t('messaging_channels.logs.filter_all'), icon: Inbox },
        { value: 'webhook', label: t('messaging_channels.logs.filter_webhooks'), icon: Webhook },
        { value: 'send', label: t('messaging_channels.logs.filter_sends'), icon: Send },
        { value: 'auto_reply', label: t('messaging_channels.logs.filter_auto_replies'), icon: MessageSquare },
        { value: 'failed', label: t('messaging_channels.logs.filter_failed'), icon: XCircle },
    ];

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
            default:
                return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'webhook':
                return <Webhook className="h-4 w-4" />;
            case 'send':
                return <Send className="h-4 w-4" />;
            case 'auto_reply':
                return <MessageSquare className="h-4 w-4" />;
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

        return (
            <Badge variant={variants[color] || 'outline'} className="text-xs">
                {status === 'success' ? t('messaging_channels.logs.status_success') : t('messaging_channels.logs.status_failed')}
            </Badge>
        );
    };

    return (
        <AppLayout>
            <Head title={`${channel.name} - ${t('messaging_channels.logs.page_title')}`} />

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
                                    {t('messaging_channels.logs.title')}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {channel.name}
                                    {channel.external_username && ` • @${channel.external_username}`}
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
                            {t('messaging_channels.logs.refresh')}
                        </Button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid gap-4 sm:grid-cols-5">
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                        <FileText className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats?.total ?? logs.total}</p>
                                        <p className="text-xs text-muted-foreground">{t('messaging_channels.logs.stats_total')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                                        <Webhook className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats?.webhooks ?? 0}</p>
                                        <p className="text-xs text-muted-foreground">{t('messaging_channels.logs.stats_webhooks')}</p>
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
                                        <p className="text-xs text-muted-foreground">{t('messaging_channels.logs.stats_sends')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                                        <MessageSquare className="h-5 w-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats?.auto_replies ?? 0}</p>
                                        <p className="text-xs text-muted-foreground">{t('messaging_channels.logs.stats_auto_replies')}</p>
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
                                        <p className="text-xs text-muted-foreground">{t('messaging_channels.logs.stats_failed')}</p>
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
                            <CardTitle className="text-base">{t('messaging_channels.logs.recent_title')}</CardTitle>
                            <CardDescription>
                                {t('messaging_channels.logs.recent_description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {logs.data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">{t('messaging_channels.logs.empty_title')}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {filter === 'all'
                                            ? t('messaging_channels.logs.empty_description')
                                            : t('messaging_channels.logs.empty_filtered')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="w-[180px]">{t('messaging_channels.logs.table_date')}</TableHead>
                                                    <TableHead className="w-[140px]">{t('messaging_channels.logs.table_type')}</TableHead>
                                                    <TableHead className="w-[100px]">{t('messaging_channels.logs.table_status')}</TableHead>
                                                    <TableHead>{t('messaging_channels.logs.table_details')}</TableHead>
                                                    <TableHead className="w-[100px]">{t('messaging_channels.logs.table_ticket')}</TableHead>
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
                                                                    title={formatDateTime(log.created_at)}
                                                                >
                                                                    {formatRelative(log.created_at)}
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
                                                {t('messaging_channels.logs.pagination', {
                                                    current: logs.current_page,
                                                    last: logs.last_page,
                                                    total: logs.total,
                                                })}
                                            </p>
                                            <div className="flex gap-2">
                                                {logs.prev_page_url && (
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={logs.prev_page_url}>{t('messaging_channels.logs.prev')}</Link>
                                                    </Button>
                                                )}
                                                {logs.next_page_url && (
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={logs.next_page_url}>{t('messaging_channels.logs.next')}</Link>
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
                                {selectedLog && formatDateTime(selectedLog.created_at)}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedLog && (
                            <div className="space-y-4">
                                {/* Status */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{t('messaging_channels.logs.detail_status')}:</span>
                                    {getStatusBadge(selectedLog.status, selectedLog.status_color)}
                                </div>

                                {/* Description */}
                                <div>
                                    <span className="text-sm font-medium">{t('messaging_channels.logs.detail_description')}:</span>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {selectedLog.description}
                                    </p>
                                </div>

                                {/* Linked ticket */}
                                {selectedLog.ticket && (
                                    <Link
                                        href={`/inbox/${selectedLog.ticket.id}`}
                                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                    >
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                            <MessageCircle className="h-4 w-4 text-primary" />
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
                                            {t('messaging_channels.logs.detail_error')}
                                        </div>
                                        <p className="mt-2 font-mono text-xs text-destructive/80 whitespace-pre-wrap">
                                            {selectedLog.error}
                                        </p>
                                    </div>
                                )}

                                {/* Metadata */}
                                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                    <div>
                                        <span className="text-sm font-medium">{t('messaging_channels.logs.detail_metadata')}:</span>
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
