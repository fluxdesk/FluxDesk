import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TagInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    id?: string;
}

export function TagInput({
    value = [],
    onChange,
    placeholder = 'Type and press Enter...',
    className,
    disabled,
    id,
}: TagInputProps) {
    const [inputValue, setInputValue] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
            removeTag(value.length - 1);
        }
    };

    const addTag = () => {
        const trimmedValue = inputValue.trim().toLowerCase();
        if (trimmedValue && !value.includes(trimmedValue)) {
            onChange([...value, trimmedValue]);
            setInputValue('');
        } else {
            setInputValue('');
        }
    };

    const removeTag = (index: number) => {
        const newTags = value.filter((_, i) => i !== index);
        onChange(newTags);
    };

    const handleBlur = () => {
        if (inputValue.trim()) {
            addTag();
        }
    };

    return (
        <div
            className={cn(
                'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] dark:bg-input dark:border-white/10',
                disabled && 'cursor-not-allowed opacity-50',
                className
            )}
            onClick={() => inputRef.current?.focus()}
        >
            {value.map((tag, index) => (
                <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 py-0.5 pr-1"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeTag(index);
                        }}
                        disabled={disabled}
                        className="rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            ))}
            <input
                ref={inputRef}
                id={id}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={value.length === 0 ? placeholder : ''}
                disabled={disabled}
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px]"
            />
        </div>
    );
}
