import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

interface MentionTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    users: User[];
}

export function MentionTextarea({
    value,
    onChange,
    users,
    className,
    ...props
}: MentionTextareaProps) {
    const getInitials = useInitials();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [mentionQuery, setMentionQuery] = React.useState('');
    const [mentionStart, setMentionStart] = React.useState<number | null>(null);
    const [dropdownAbove, setDropdownAbove] = React.useState(true);

    // Filter users based on mention query
    const filteredUsers = React.useMemo(() => {
        if (!mentionQuery) return users;
        const query = mentionQuery.toLowerCase();
        return users.filter(
            (user) =>
                user.name.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query)
        );
    }, [users, mentionQuery]);

    // Handle text changes
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;
        onChange(newValue);

        // Check if we're typing a mention
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

        if (lastAtSymbol !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
            const charBeforeAt = lastAtSymbol > 0 ? newValue[lastAtSymbol - 1] : ' ';
            if (!textAfterAt.includes(' ') && (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtSymbol === 0)) {
                setMentionQuery(textAfterAt);
                setMentionStart(lastAtSymbol);
                setShowSuggestions(true);
                setSelectedIndex(0);
                calculateDropdownPosition();
                return;
            }
        }

        setShowSuggestions(false);
        setMentionStart(null);
    };

    // Calculate if dropdown should appear above or below
    const calculateDropdownPosition = () => {
        if (!textareaRef.current) return;
        const textareaRect = textareaRef.current.getBoundingClientRect();
        const spaceAbove = textareaRect.top;
        const spaceBelow = window.innerHeight - textareaRect.bottom;
        setDropdownAbove(spaceAbove > 250 || spaceAbove > spaceBelow);
    };

    // Insert mention into text
    const insertMention = React.useCallback((user: User) => {
        if (mentionStart === null || !textareaRef.current) return;

        const cursorPos = textareaRef.current.selectionStart;
        const beforeMention = value.slice(0, mentionStart);
        const afterCursor = value.slice(cursorPos);
        const mentionText = `@${user.name} `;

        const newValue = beforeMention + mentionText + afterCursor;
        onChange(newValue);

        setShowSuggestions(false);
        setMentionStart(null);

        const newCursorPos = mentionStart + mentionText.length;
        setTimeout(() => {
            textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
            textareaRef.current?.focus();
        }, 0);
    }, [mentionStart, value, onChange]);

    // Handle keyboard in CAPTURE phase - this runs BEFORE the textarea gets the event
    const handleKeyDownCapture = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!showSuggestions || filteredUsers.length === 0) {
            return; // Let event propagate normally
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
                break;
            case 'Enter':
                if (!e.shiftKey && filteredUsers[selectedIndex]) {
                    e.preventDefault();
                    e.stopPropagation();
                    insertMention(filteredUsers[selectedIndex]);
                }
                break;
            case 'Tab':
                if (filteredUsers[selectedIndex]) {
                    e.preventDefault();
                    e.stopPropagation();
                    insertMention(filteredUsers[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                setShowSuggestions(false);
                break;
        }
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll selected item into view
    React.useEffect(() => {
        if (showSuggestions && dropdownRef.current) {
            const selectedItem = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, showSuggestions]);

    // Reset selected index when filtered users change
    React.useEffect(() => {
        setSelectedIndex(0);
    }, [filteredUsers.length]);

    const renderDropdown = () => {
        if (!showSuggestions || filteredUsers.length === 0) return null;

        return (
            <div
                ref={dropdownRef}
                className={cn(
                    "absolute left-0 right-0 z-50 overflow-hidden rounded-lg border bg-popover shadow-lg",
                    dropdownAbove ? "bottom-full mb-1" : "top-full mt-1"
                )}
            >
                <div className="max-h-48 overflow-y-auto py-1">
                    {filteredUsers.map((user, index) => (
                        <button
                            key={user.id}
                            type="button"
                            data-index={index}
                            className={cn(
                                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                                index === selectedIndex
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-accent/50'
                            )}
                            onClick={() => insertMention(user)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback className="text-[10px]">
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{user.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </button>
                    ))}
                </div>
                <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
                    <kbd className="rounded border bg-muted px-1">↑</kbd>{' '}
                    <kbd className="rounded border bg-muted px-1">↓</kbd> navigeren,{' '}
                    <kbd className="rounded border bg-muted px-1">Tab</kbd> selecteren
                </div>
            </div>
        );
    };

    return (
        <div
            ref={containerRef}
            className="relative"
            onKeyDownCapture={handleKeyDownCapture}
        >
            {dropdownAbove && renderDropdown()}

            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                className={className}
                {...props}
            />

            {!dropdownAbove && renderDropdown()}
        </div>
    );
}
