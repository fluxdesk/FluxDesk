import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { LOCALE_NAMES, type SupportedLocale } from '@/i18n/config';

interface LanguageSelectProps {
    name?: string;
    value: string;
    availableLocales: string[];
    onValueChange?: (value: string) => void;
    className?: string;
    disabled?: boolean;
}

export function LanguageSelect({
    name,
    value,
    availableLocales,
    onValueChange,
    className,
    disabled,
}: LanguageSelectProps) {
    return (
        <Select
            name={name}
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
        >
            <SelectTrigger className={className}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {availableLocales.map((locale) => (
                    <SelectItem key={locale} value={locale}>
                        {LOCALE_NAMES[locale as SupportedLocale] ?? locale}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
