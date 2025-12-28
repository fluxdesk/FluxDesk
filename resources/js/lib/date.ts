/**
 * Date formatting utilities that use the organization's timezone.
 * All dates in the database are stored in UTC and converted to the
 * organization's timezone when displayed.
 */

/**
 * Get the current organization's timezone from page props.
 * Falls back to UTC if not available.
 */
export function getTimezone(): string {
    // Access the timezone from the window's Inertia page props
    // This avoids needing to call usePage() which requires React context
    const page = (window as any).__page;
    return page?.props?.timezone ?? 'UTC';
}

/**
 * Format a date using the organization's timezone.
 */
export function formatDate(
    date: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string {
    if (!date) return '';

    const timezone = getTimezone();

    return new Intl.DateTimeFormat('nl-NL', {
        timeZone: timezone,
        ...options,
    }).format(new Date(date));
}

/**
 * Format a date with time (e.g., "28 dec 2025, 14:30")
 */
export function formatDateTime(date: string | Date | null | undefined): string {
    return formatDate(date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

/**
 * Format just the date (e.g., "28 dec 2025")
 */
export function formatDateOnly(date: string | Date | null | undefined): string {
    return formatDate(date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Format just the time (e.g., "14:30")
 */
export function formatTime(date: string | Date | null | undefined): string {
    return formatDate(date, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

/**
 * Check if a date is today in the organization's timezone.
 */
export function isToday(date: string | Date): boolean {
    const timezone = getTimezone();
    const now = new Date();
    const then = new Date(date);

    const nowDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
    const thenDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(then);

    return nowDate === thenDate;
}

/**
 * Check if a date is yesterday in the organization's timezone.
 */
export function isYesterday(date: string | Date): boolean {
    const timezone = getTimezone();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const then = new Date(date);

    const yesterdayDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(yesterday);
    const thenDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(then);

    return yesterdayDate === thenDate;
}

/**
 * Format a date for ticket lists (e.g., "vandaag, 14:30" or "ma 12 dec, 14:30")
 */
export function formatTicketListDate(date: string | Date | null | undefined): string {
    if (!date) return '';

    const time = formatTime(date);

    if (isToday(date)) {
        return `vandaag, ${time}`;
    }
    if (isYesterday(date)) {
        return `gisteren, ${time}`;
    }

    // Format as "ma 12 dec, 14:30"
    const dayPart = formatDate(date, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });

    return `${dayPart}, ${time}`;
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelative(date: string | Date | null | undefined): string {
    if (!date) return '';

    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const rtf = new Intl.RelativeTimeFormat('nl', { numeric: 'auto' });

    if (Math.abs(diffSecs) < 60) {
        return rtf.format(-diffSecs, 'second');
    } else if (Math.abs(diffMins) < 60) {
        return rtf.format(-diffMins, 'minute');
    } else if (Math.abs(diffHours) < 24) {
        return rtf.format(-diffHours, 'hour');
    } else if (Math.abs(diffDays) < 30) {
        return rtf.format(-diffDays, 'day');
    } else {
        // Fall back to formatted date for older dates
        return formatDateOnly(date);
    }
}
