import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Ticket, Users } from 'lucide-react';

interface EntitySelectorProps {
    value: 'tickets' | 'contacts';
    onChange: (value: 'tickets' | 'contacts') => void;
}

const entities = [
    {
        value: 'tickets' as const,
        label: 'Tickets',
        description: 'Analyze ticket data',
        icon: Ticket,
    },
    {
        value: 'contacts' as const,
        label: 'Contacts',
        description: 'Analyze contact data',
        icon: Users,
    },
];

export function EntitySelector({ value, onChange }: EntitySelectorProps) {
    return (
        <div className="space-y-2">
            <Label>Data Source</Label>
            <div className="grid grid-cols-2 gap-3">
                {entities.map((entity) => {
                    const Icon = entity.icon;
                    const isSelected = value === entity.value;

                    return (
                        <button
                            key={entity.value}
                            type="button"
                            onClick={() => onChange(entity.value)}
                            className={cn(
                                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                                isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            )}
                        >
                            <Icon
                                className={cn(
                                    'h-6 w-6',
                                    isSelected ? 'text-primary' : 'text-muted-foreground'
                                )}
                            />
                            <div className="text-center">
                                <div className="text-sm font-medium">{entity.label}</div>
                                <div className="text-xs text-muted-foreground">
                                    {entity.description}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
