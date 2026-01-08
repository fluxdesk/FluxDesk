import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { WidgetSize } from '@/types/dashboard';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Maximize2, Minimize2, Square, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { getWidgetSizeClass, WIDGET_REGISTRY } from './widget-registry';

interface WidgetContainerProps {
    id: string;
    widgetKey?: string;
    size: WidgetSize;
    isCustomizing: boolean;
    onResize: (size: WidgetSize) => void;
    onRemove: () => void;
    children: ReactNode;
}

export function WidgetContainer({
    id,
    widgetKey,
    size,
    isCustomizing,
    onResize,
    onRemove,
    children,
}: WidgetContainerProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled: !isCustomizing });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const widgetDef = widgetKey ? WIDGET_REGISTRY[widgetKey] : undefined;
    const supportedSizes = widgetDef?.supportedSizes || ['sm', 'md', 'lg'];

    const sizeIcons = {
        sm: Minimize2,
        md: Square,
        lg: Maximize2,
    };

    const sizeLabels = {
        sm: 'Small',
        md: 'Medium',
        lg: 'Large',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                getWidgetSizeClass(size),
                'group relative',
                isDragging && 'z-50 opacity-50',
                isCustomizing && !isDragging && 'rounded-lg ring-1 ring-dashed ring-muted-foreground/20',
            )}
        >
            {/* Controls - visible on hover in customize mode */}
            {isCustomizing && (
                <div
                    className={cn(
                        'absolute -right-1 -top-1 z-20 flex items-center gap-0.5 rounded-md bg-background/95 p-0.5 shadow-sm backdrop-blur-sm transition-opacity',
                        'opacity-0 group-hover:opacity-100',
                    )}
                >
                    <button
                        type="button"
                        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                    </button>

                    {supportedSizes.length > 1 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground"
                                >
                                    {(() => {
                                        const Icon = sizeIcons[size];
                                        return <Icon className="h-3 w-3" />;
                                    })()}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {supportedSizes.map((s) => {
                                    const Icon = sizeIcons[s];
                                    return (
                                        <DropdownMenuItem
                                            key={s}
                                            onClick={() => onResize(s)}
                                            className={cn(size === s && 'bg-muted')}
                                        >
                                            <Icon className="mr-2 h-4 w-4" />
                                            {sizeLabels[s]}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={onRemove}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {children}
        </div>
    );
}
