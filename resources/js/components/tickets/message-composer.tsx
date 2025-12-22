import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Send, StickyNote, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import type { Ticket } from '@/types';

interface MessageComposerProps {
    ticket: Ticket;
}

export function MessageComposer({ ticket }: MessageComposerProps) {
    const [body, setBody] = useState('');
    const [isNote, setIsNote] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim() || isSubmitting) return;

        setIsSubmitting(true);
        router.post(
            `/inbox/${ticket.id}/messages`,
            {
                body: body.trim(),
                type: isNote ? 'note' : 'reply',
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setBody('');
                    setIsNote(false);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e);
        }
    };

    return (
        <div className="border-t border-border/50 bg-background p-4">
            <div className="mx-auto max-w-3xl">
                <form onSubmit={handleSubmit}>
                    <div
                        className={cn(
                            'rounded-xl border transition-colors',
                            isNote
                                ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'
                                : 'border-border/50 bg-muted/20',
                        )}
                    >
                        {/* Composer Header */}
                        <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2">
                            <Toggle
                                pressed={!isNote}
                                onPressedChange={() => setIsNote(false)}
                                size="sm"
                                className={cn(
                                    'h-7 gap-1.5 rounded-md px-2 text-xs',
                                    !isNote && 'bg-primary/10 text-primary',
                                )}
                            >
                                <MessageSquare className="h-3.5 w-3.5" />
                                Reply
                            </Toggle>
                            <Toggle
                                pressed={isNote}
                                onPressedChange={() => setIsNote(true)}
                                size="sm"
                                className={cn(
                                    'h-7 gap-1.5 rounded-md px-2 text-xs',
                                    isNote && 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
                                )}
                            >
                                <StickyNote className="h-3.5 w-3.5" />
                                Note
                            </Toggle>

                            {isNote && (
                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                    Only visible to your team
                                </span>
                            )}
                        </div>

                        {/* Textarea */}
                        <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                isNote
                                    ? 'Add an internal note...'
                                    : 'Type your reply to the customer...'
                            }
                            className="min-h-[100px] resize-none border-0 bg-transparent px-4 py-3 text-sm focus-visible:ring-0"
                            disabled={isSubmitting}
                        />

                        {/* Footer */}
                        <div className="flex items-center justify-between px-3 py-2">
                            <span className="text-xs text-muted-foreground">
                                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                                </kbd>
                                <span className="mx-1">+</span>
                                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                                    Enter
                                </kbd>
                                <span className="ml-1.5">to send</span>
                            </span>

                            <Button
                                type="submit"
                                size="sm"
                                disabled={!body.trim() || isSubmitting}
                                className={cn(
                                    'h-8 gap-1.5 rounded-lg px-3 text-xs',
                                    isNote &&
                                        'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700',
                                )}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                                {isNote ? 'Add Note' : 'Send Reply'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
