import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronsUpDownIcon, GlobeIcon } from 'lucide-react';
import { useState } from 'react';

const timezones: Record<string, string[]> = {
    'Africa': [
        'Africa/Abidjan',
        'Africa/Accra',
        'Africa/Addis_Ababa',
        'Africa/Algiers',
        'Africa/Cairo',
        'Africa/Casablanca',
        'Africa/Johannesburg',
        'Africa/Lagos',
        'Africa/Nairobi',
        'Africa/Tunis',
    ],
    'America': [
        'America/Anchorage',
        'America/Argentina/Buenos_Aires',
        'America/Bogota',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Mexico_City',
        'America/New_York',
        'America/Phoenix',
        'America/Santiago',
        'America/Sao_Paulo',
        'America/Toronto',
        'America/Vancouver',
    ],
    'Asia': [
        'Asia/Bangkok',
        'Asia/Colombo',
        'Asia/Dubai',
        'Asia/Ho_Chi_Minh',
        'Asia/Hong_Kong',
        'Asia/Jakarta',
        'Asia/Jerusalem',
        'Asia/Karachi',
        'Asia/Kolkata',
        'Asia/Kuala_Lumpur',
        'Asia/Manila',
        'Asia/Seoul',
        'Asia/Shanghai',
        'Asia/Singapore',
        'Asia/Taipei',
        'Asia/Tokyo',
    ],
    'Atlantic': [
        'Atlantic/Azores',
        'Atlantic/Canary',
        'Atlantic/Cape_Verde',
        'Atlantic/Reykjavik',
    ],
    'Australia': [
        'Australia/Adelaide',
        'Australia/Brisbane',
        'Australia/Darwin',
        'Australia/Hobart',
        'Australia/Melbourne',
        'Australia/Perth',
        'Australia/Sydney',
    ],
    'Europe': [
        'Europe/Amsterdam',
        'Europe/Athens',
        'Europe/Berlin',
        'Europe/Brussels',
        'Europe/Bucharest',
        'Europe/Budapest',
        'Europe/Copenhagen',
        'Europe/Dublin',
        'Europe/Helsinki',
        'Europe/Istanbul',
        'Europe/Lisbon',
        'Europe/London',
        'Europe/Madrid',
        'Europe/Moscow',
        'Europe/Oslo',
        'Europe/Paris',
        'Europe/Prague',
        'Europe/Rome',
        'Europe/Stockholm',
        'Europe/Vienna',
        'Europe/Warsaw',
        'Europe/Zurich',
    ],
    'Indian': [
        'Indian/Maldives',
        'Indian/Mauritius',
    ],
    'Pacific': [
        'Pacific/Auckland',
        'Pacific/Fiji',
        'Pacific/Guam',
        'Pacific/Honolulu',
        'Pacific/Samoa',
    ],
    'Other': [
        'UTC',
    ],
};

interface TimezoneSelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export function TimezoneSelect({ value, onChange, className }: TimezoneSelectProps) {
    const [open, setOpen] = useState(false);

    // Get display label for the selected timezone
    const getDisplayLabel = (tz: string) => {
        const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
        return city;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('w-full justify-between font-normal', className)}
                >
                    <span className="flex items-center gap-2 truncate">
                        <GlobeIcon className="h-4 w-4 shrink-0 opacity-50" />
                        {value || 'Selecteer tijdzone...'}
                    </span>
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Zoek tijdzone..." />
                    <CommandList>
                        <CommandEmpty>Geen tijdzone gevonden.</CommandEmpty>
                        {Object.entries(timezones).map(([region, zones]) => (
                            <CommandGroup key={region} heading={region}>
                                {zones.map((tz) => (
                                    <CommandItem
                                        key={tz}
                                        value={tz}
                                        onSelect={() => {
                                            onChange(tz);
                                            setOpen(false);
                                        }}
                                    >
                                        <CheckIcon
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                value === tz ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        <span className="truncate">{getDisplayLabel(tz)}</span>
                                        <span className="ml-auto text-xs text-muted-foreground truncate">
                                            {tz}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
