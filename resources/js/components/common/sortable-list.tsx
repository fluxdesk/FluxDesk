import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SortableItemProps {
    id: string | number;
    children: ReactNode;
    disabled?: boolean;
}

export function SortableItem({ id, children, disabled }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors',
                isDragging && 'opacity-50 shadow-lg',
            )}
        >
            <button
                type="button"
                className={cn(
                    'cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground',
                    disabled && 'cursor-not-allowed opacity-50',
                )}
                {...attributes}
                {...listeners}
                disabled={disabled}
            >
                <GripVertical className="h-4 w-4" />
            </button>
            {children}
        </div>
    );
}

interface SortableListProps<T extends { id: number | string }> {
    items: T[];
    onReorder: (items: T[]) => void;
    renderItem: (item: T) => ReactNode;
    disabled?: boolean;
}

export function SortableList<T extends { id: number | string }>({
    items,
    onReorder,
    renderItem,
    disabled,
}: SortableListProps<T>) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(items, oldIndex, newIndex);
            onReorder(newItems);
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
                disabled={disabled}
            >
                <div className="space-y-2">
                    {items.map((item) => (
                        <SortableItem key={item.id} id={item.id} disabled={disabled}>
                            {renderItem(item)}
                        </SortableItem>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
