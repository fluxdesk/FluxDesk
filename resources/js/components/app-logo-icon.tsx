import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface AppLogoIconProps {
    className?: string;
}

function getInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

export default function AppLogoIcon({ className }: AppLogoIconProps) {
    const { name } = usePage<SharedData>().props;
    const initials = getInitials(name);

    return (
        <svg className={className} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <text
                x="16"
                y="21"
                textAnchor="middle"
                fontSize="14"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                fill="currentColor"
            >
                {initials}
            </text>
        </svg>
    );
}
