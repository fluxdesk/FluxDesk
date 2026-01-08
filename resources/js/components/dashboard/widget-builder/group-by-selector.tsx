import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface GroupBySelectorProps {
    value: string | null;
    entity: 'tickets' | 'contacts';
    onChange: (value: string | null) => void;
}

const ticketGroupByOptions = [
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'department', label: 'Department' },
    { value: 'channel', label: 'Channel' },
    { value: 'assignee', label: 'Assignee' },
];

const contactGroupByOptions = [
    { value: 'company', label: 'Company' },
];

export function GroupBySelector({ value, entity, onChange }: GroupBySelectorProps) {
    const options = entity === 'tickets' ? ticketGroupByOptions : contactGroupByOptions;

    return (
        <div className="space-y-2">
            <Label>Group By</Label>
            <Select value={value || ''} onValueChange={(v) => onChange(v || null)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a field to group by" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
