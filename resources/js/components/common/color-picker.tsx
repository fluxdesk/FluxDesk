import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const presetColors = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#10b981', // emerald
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#0ea5e9', // sky
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#f43f5e', // rose
    '#6b7280', // gray
];

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', className)}
                >
                    <div
                        className="mr-2 h-4 w-4 rounded-full border"
                        style={{ backgroundColor: value }}
                    />
                    <span className="font-mono text-sm">{value}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
                <div className="grid grid-cols-6 gap-2">
                    {presetColors.map((color) => (
                        <button
                            key={color}
                            type="button"
                            className={cn(
                                'h-6 w-6 rounded-md border-2',
                                value === color ? 'border-foreground' : 'border-transparent'
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => onChange(color)}
                        />
                    ))}
                </div>
                <div className="mt-4">
                    <Input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="#000000"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        className="font-mono"
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
