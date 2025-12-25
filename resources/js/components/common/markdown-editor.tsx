import * as React from 'react';
import { Bold, Italic, Strikethrough, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MentionTextarea } from '@/components/common/mention-textarea';
import type { User } from '@/types';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    users: User[];
    placeholder?: string;
    disabled?: boolean;
    minRows?: number;
    maxRows?: number;
    className?: string;
    toolbarClassName?: string;
}

interface ToolbarAction {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    shortcut?: string;
    action: () => void;
}

export function MarkdownEditor({
    value,
    onChange,
    onKeyDown,
    users,
    placeholder,
    disabled = false,
    minRows = 2,
    maxRows = 10,
    className,
    toolbarClassName,
}: MarkdownEditorProps) {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    const insertMarkdown = React.useCallback((prefix: string, suffix: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);

        const newValue =
            value.substring(0, start) +
            prefix + selectedText + suffix +
            value.substring(end);

        onChange(newValue);

        // Position cursor after the change
        setTimeout(() => {
            textarea.focus();
            if (selectedText) {
                // If text was selected, place cursor after the wrapped text
                const newPosition = start + prefix.length + selectedText.length + suffix.length;
                textarea.setSelectionRange(newPosition, newPosition);
            } else {
                // If no text selected, place cursor between prefix and suffix
                const newPosition = start + prefix.length;
                textarea.setSelectionRange(newPosition, newPosition);
            }
        }, 0);
    }, [value, onChange]);

    const insertListItem = React.useCallback((prefix: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const textBeforeCursor = value.substring(0, start);
        const textAfterCursor = value.substring(start);

        // Check if we're at the start of a line
        const lastNewline = textBeforeCursor.lastIndexOf('\n');
        const isAtLineStart = lastNewline === textBeforeCursor.length - 1 || start === 0;

        const insertion = isAtLineStart ? prefix : '\n' + prefix;
        const newValue = textBeforeCursor + insertion + textAfterCursor;

        onChange(newValue);

        setTimeout(() => {
            textarea.focus();
            const newPosition = start + insertion.length;
            textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
    }, [value, onChange]);

    const toolbarActions: ToolbarAction[] = React.useMemo(() => [
        {
            icon: Bold,
            label: 'Vet',
            shortcut: 'Ctrl+B',
            action: () => insertMarkdown('**', '**'),
        },
        {
            icon: Italic,
            label: 'Cursief',
            shortcut: 'Ctrl+I',
            action: () => insertMarkdown('*', '*'),
        },
        {
            icon: Strikethrough,
            label: 'Doorgestreept',
            action: () => insertMarkdown('~~', '~~'),
        },
        {
            icon: List,
            label: 'Opsommingslijst',
            action: () => insertListItem('- '),
        },
        {
            icon: ListOrdered,
            label: 'Genummerde lijst',
            action: () => insertListItem('1. '),
        },
    ], [insertMarkdown, insertListItem]);

    // Handle keyboard shortcuts
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    insertMarkdown('**', '**');
                    return;
                case 'i':
                    e.preventDefault();
                    insertMarkdown('*', '*');
                    return;
            }
        }
        onKeyDown?.(e);
    }, [insertMarkdown, onKeyDown]);

    // Capture textarea ref from MentionTextarea
    const setTextareaRef = React.useCallback((el: HTMLTextAreaElement | null) => {
        textareaRef.current = el;
    }, []);

    return (
        <div className="flex flex-col">
            {/* Toolbar */}
            <div className={cn(
                'flex items-center gap-0.5 border-b px-2 py-1.5',
                toolbarClassName
            )}>
                {toolbarActions.map((action, index) => (
                    <Tooltip key={index}>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={action.action}
                                disabled={disabled}
                            >
                                <action.icon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            {action.label}
                            {action.shortcut && (
                                <span className="ml-2 text-muted-foreground">{action.shortcut}</span>
                            )}
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>

            {/* Textarea with mentions */}
            <MentionTextarea
                ref={setTextareaRef}
                value={value}
                onChange={onChange}
                onKeyDown={handleKeyDown}
                users={users}
                placeholder={placeholder}
                autoResize
                minRows={minRows}
                maxRows={maxRows}
                disabled={disabled}
                className={cn(
                    'w-full resize-none border-0 bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0',
                    className
                )}
            />
        </div>
    );
}
