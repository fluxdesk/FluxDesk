import DOMPurify from 'dompurify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import PortalLayout from '@/layouts/portal/portal-layout';
import { type PortalMessage, type PortalSharedData, type PortalTicket } from '@/types/portal';
import { cn } from '@/lib/utils';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { formatDateTime } from '@/lib/date';
import { ArrowLeft, Download, Loader2, Paperclip, Send, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    ticket: PortalTicket & { messages?: PortalMessage[] };
}

export default function PortalTicketShow({ ticket }: Props) {
    const { t } = useTranslation('portal');
    const { organization } = usePage<PortalSharedData>().props;
    const primaryColor = organization?.settings?.primary_color ?? '#18181b';
    const orgSlug = organization?.slug ?? '';

    const form = useForm({
        body: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.data.body.trim()) return;

        form.post(`/${orgSlug}/portal/tickets/${ticket.id}/reply`, {
            preserveScroll: true,
            onSuccess: () => form.reset('body'),
        });
    };

    const messages = ticket.messages ?? [];

    return (
        <PortalLayout>
            <Head title={`Ticket #${ticket.ticket_number}`} />

            {/* Back link */}
            <div className="mb-4">
                <Link
                    href={`/${orgSlug}/portal`}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="size-4" />
                    {t('create_ticket.back_to_overview')}
                </Link>
            </div>

            {/* Ticket Header Card */}
            <Card className="mb-6">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-mono text-muted-foreground">
                                    #{ticket.ticket_number}
                                </span>
                                {ticket.status && (
                                    <Badge
                                        variant="outline"
                                        style={{
                                            borderColor: ticket.status.color,
                                            color: ticket.status.color,
                                            backgroundColor: `${ticket.status.color}15`,
                                        }}
                                    >
                                        {ticket.status.name}
                                    </Badge>
                                )}
                            </div>
                            <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                        </div>
                        {ticket.priority && (
                            <Badge
                                variant="secondary"
                                style={{
                                    backgroundColor: `${ticket.priority.color}20`,
                                    color: ticket.priority.color,
                                }}
                            >
                                {ticket.priority.name}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                        {t('tickets.created_at', { date: formatDateTime(ticket.created_at) })}
                    </p>
                </CardContent>
            </Card>

            {/* Messages */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg">{t('tickets.messages')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            {t('tickets.no_messages')}
                        </p>
                    ) : (
                        messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isOwn={message.is_from_contact}
                                primaryColor={primaryColor}
                                t={t}
                            />
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Reply Form */}
            {!ticket.status?.is_closed && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('tickets.reply')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Textarea
                                placeholder={t('tickets.reply_placeholder')}
                                value={form.data.body}
                                onChange={(e) => form.setData('body', e.target.value)}
                                disabled={form.processing}
                                rows={4}
                                className="resize-none"
                            />
                            {form.errors.body && (
                                <p className="text-sm text-destructive">{form.errors.body}</p>
                            )}
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={form.processing || !form.data.body.trim()}
                                    className="text-white"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {form.processing ? (
                                        <>
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            {t('tickets.sending')}
                                        </>
                                    ) : (
                                        <>
                                            <Send className="size-4 mr-2" />
                                            {t('tickets.send')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {ticket.status?.is_closed && (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">
                            {t('tickets.closed_message')}
                        </p>
                        <Link href={`/${orgSlug}/portal/tickets/create`} className="mt-4 inline-block">
                            <Button variant="outline">{t('tickets.create_new')}</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </PortalLayout>
    );
}

interface MessageBubbleProps {
    message: PortalMessage;
    isOwn: boolean;
    primaryColor: string;
    t: (key: string) => string;
}

function MessageBubble({ message, isOwn, primaryColor, t }: MessageBubbleProps) {
    const senderName = isOwn
        ? t('tickets.you')
        : message.user?.name ?? t('tickets.support');

    return (
        <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
            {/* Avatar */}
            <div
                className={cn(
                    'shrink-0 flex size-9 items-center justify-center rounded-full text-white text-sm font-medium',
                    !isOwn && 'bg-muted-foreground'
                )}
                style={isOwn ? { backgroundColor: primaryColor } : undefined}
            >
                {isOwn ? (
                    senderName.charAt(0).toUpperCase()
                ) : (
                    <User className="size-4" />
                )}
            </div>

            {/* Message content */}
            <div className={cn('flex-1 max-w-[80%]', isOwn && 'flex flex-col items-end')}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{senderName}</span>
                    <span className="text-xs text-muted-foreground">
                        {formatDateTime(message.created_at)}
                    </span>
                </div>
                <div
                    className={cn(
                        'rounded-lg px-4 py-2.5',
                        isOwn
                            ? 'text-white'
                            : 'bg-muted'
                    )}
                    style={isOwn ? { backgroundColor: primaryColor } : undefined}
                >
                    {message.body_html ? (
                        <div
                            className="text-sm prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body_html) }}
                        />
                    ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                    )}
                </div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {message.attachments.map((attachment) => (
                            <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs hover:bg-muted/80 transition-colors"
                            >
                                <Paperclip className="size-3" />
                                <span className="max-w-[120px] truncate">{attachment.original_filename}</span>
                                <span className="text-muted-foreground">({attachment.human_size})</span>
                                <Download className="size-3" />
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
