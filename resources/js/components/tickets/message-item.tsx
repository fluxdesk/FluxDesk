import { format } from 'date-fns';
import { StickyNote, Bot, Eye } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useInitials } from '@/hooks/use-initials';
import type { Message } from '@/types';

interface MessageItemProps {
    message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
    const getInitials = useInitials();
    const [showOriginal, setShowOriginal] = useState(false);

    const isNote = message.type === 'note';
    const isSystem = message.type === 'system';
    const isFromContact = message.is_from_contact;
    const hasRawContent = !!message.raw_content;

    const authorName = isFromContact
        ? message.contact?.name || message.contact?.email || 'Customer'
        : message.user?.name || 'Agent';

    if (isSystem) {
        return (
            <div className="flex items-center justify-center py-3">
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                    <Bot className="h-3.5 w-3.5" />
                    {message.body}
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'group relative rounded-xl p-4 transition-colors',
                isNote
                    ? 'border border-amber-200/50 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20'
                    : isFromContact
                      ? 'bg-muted/50'
                      : 'bg-primary/5',
            )}
        >
            {/* Note indicator */}
            {isNote && (
                <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                    <StickyNote className="h-3.5 w-3.5" />
                </div>
            )}

            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border/50">
                        <AvatarFallback
                            className={cn(
                                'text-xs font-medium',
                                isFromContact
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-primary/10 text-primary',
                            )}
                        >
                            {getInitials(authorName)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <span className="text-sm font-medium">{authorName}</span>
                        {isNote && (
                            <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                Internal Note
                            </span>
                        )}
                        {isFromContact && (
                            <span className="ml-2 text-xs text-muted-foreground">Customer</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasRawContent && (
                        <Dialog open={showOriginal} onOpenChange={setShowOriginal}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                    <Eye className="h-3 w-3" />
                                    View original
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] max-w-4xl overflow-hidden">
                                <DialogHeader>
                                    <DialogTitle>Original Email Content</DialogTitle>
                                </DialogHeader>
                                <div className="mt-4 overflow-auto rounded-lg border bg-white">
                                    <iframe
                                        srcDoc={message.raw_content || ''}
                                        sandbox="allow-same-origin"
                                        className="h-[60vh] w-full border-0"
                                        title="Original email content"
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    <time className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), 'MMM d, h:mm a')}
                    </time>
                </div>
            </div>

            {/* Body */}
            <div className="prose prose-sm max-w-none text-foreground/90 dark:prose-invert">
                {message.body_html ? (
                    <div
                        className="email-content"
                        dangerouslySetInnerHTML={{ __html: message.body_html }}
                    />
                ) : (
                    <p className="whitespace-pre-wrap">{message.body}</p>
                )}
            </div>
        </div>
    );
}
