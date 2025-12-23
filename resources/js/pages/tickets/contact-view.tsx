import DOMPurify from 'dompurify';
import { Head, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Send, FileText, Image as ImageIcon, Download, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useInitials } from '@/hooks/use-initials';
import type { Ticket, Message } from '@/types';

interface Props {
    ticket: Ticket;
    token: string;
}

export default function ContactView({ ticket, token }: Props) {
    const getInitials = useInitials();
    const { data, setData, post, processing, reset } = useForm({
        body: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.body.trim() || processing) return;

        post(`/ticket/${token}/reply`, {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
        return <FileText className="h-4 w-4" />;
    };

    return (
        <>
            <Head title={`Ticket #${ticket.ticket_number}`} />

            <div className="min-h-screen bg-muted/30">
                {/* Header */}
                <div className="border-b bg-background">
                    <div className="mx-auto max-w-3xl px-4 py-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Ticket #{ticket.ticket_number}</span>
                                    {ticket.status && (
                                        <Badge
                                            variant="outline"
                                            style={{
                                                borderColor: ticket.status.color,
                                                color: ticket.status.color,
                                            }}
                                        >
                                            {ticket.status.name}
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="mt-1 text-xl font-semibold">{ticket.subject}</h1>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="mx-auto max-w-3xl px-4 py-6">
                    <div className="space-y-6">
                        {ticket.messages && ticket.messages.length > 0 ? (
                            ticket.messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    isOwnMessage={message.is_from_contact}
                                    getInitials={getInitials}
                                    getFileIcon={getFileIcon}
                                />
                            ))
                        ) : (
                            <div className="py-12 text-center text-muted-foreground">
                                Nog geen berichten
                            </div>
                        )}
                    </div>

                    {/* Reply form */}
                    <div className="mt-8 rounded-lg border bg-background p-4">
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <Textarea
                                    placeholder="Typ uw reactie..."
                                    value={data.body}
                                    onChange={(e) => setData('body', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="min-h-[120px] resize-none"
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        Druk <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Ctrl</kbd> + <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Enter</kbd> om te versturen
                                    </span>
                                    <Button type="submit" disabled={processing || !data.body.trim()}>
                                        {processing ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="mr-2 h-4 w-4" />
                                        )}
                                        Versturen
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

function MessageBubble({
    message,
    isOwnMessage,
    getInitials,
    getFileIcon,
}: {
    message: Message;
    isOwnMessage: boolean;
    getInitials: (name: string) => string;
    getFileIcon: (mimeType: string) => React.ReactNode;
}) {
    const senderName = isOwnMessage
        ? (message.contact?.name || 'U')
        : (message.user?.name || 'Support');
    const hasAttachments = message.file_attachments && message.file_attachments.length > 0;

    return (
        <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
            <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className={isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                    {getInitials(senderName)}
                </AvatarFallback>
            </Avatar>
            <div className={`flex max-w-[75%] flex-col ${isOwnMessage ? 'items-end' : ''}`}>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{senderName}</span>
                    <span>{format(new Date(message.created_at), 'd MMM, HH:mm', { locale: nl })}</span>
                </div>
                <div
                    className={`rounded-2xl px-4 py-3 ${
                        isOwnMessage
                            ? 'rounded-tr-sm bg-primary text-primary-foreground'
                            : 'rounded-tl-sm bg-muted'
                    }`}
                >
                    {message.body_html ? (
                        <div
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body_html) }}
                        />
                    ) : (
                        <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                    )}
                </div>
                {hasAttachments && (
                    <div className={`mt-2 flex flex-wrap gap-2 ${isOwnMessage ? 'justify-end' : ''}`}>
                        {message.file_attachments?.map((attachment) => (
                            <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
                            >
                                {getFileIcon(attachment.mime_type)}
                                <span className="max-w-[120px] truncate">{attachment.original_filename}</span>
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
