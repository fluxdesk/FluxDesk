import { type VersionStatus } from '@/types';
import { useCallback, useEffect, useState } from 'react';

const SESSION_KEY = 'fluxdesk_version_checked';
const CACHE_KEY = 'fluxdesk_version_cache';

interface UseVersionCheckResult {
    versionStatus: VersionStatus | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook to check for version updates.
 * Only checks once per session to avoid unnecessary requests.
 * Caches result in sessionStorage for performance.
 */
export function useVersionCheck(): UseVersionCheckResult {
    const [versionStatus, setVersionStatus] = useState<VersionStatus | null>(() => {
        // Try to load from sessionStorage on initial render
        if (typeof window !== 'undefined') {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    return JSON.parse(cached) as VersionStatus;
                } catch {
                    // Ignore parse errors
                }
            }
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchVersionStatus = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/upgrade/status', {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                // Silently fail for non-super-admin users (403) or other errors
                if (response.status === 403) {
                    return;
                }
                throw new Error(`Failed to fetch version status: ${response.status}`);
            }

            const data = (await response.json()) as VersionStatus;
            setVersionStatus(data);

            // Cache in sessionStorage
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
            }
        } catch (err) {
            // Silently fail - version check is not critical
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Only check once per session
        if (typeof window !== 'undefined') {
            const alreadyChecked = sessionStorage.getItem(SESSION_KEY);
            if (alreadyChecked) {
                return; // Already checked this session
            }

            // Mark as checked and fetch
            sessionStorage.setItem(SESSION_KEY, 'true');

            // Small delay to not interfere with initial page load
            const timeoutId = setTimeout(fetchVersionStatus, 2000);
            return () => clearTimeout(timeoutId);
        }
    }, [fetchVersionStatus]);

    return {
        versionStatus,
        isLoading,
        error,
        refetch: fetchVersionStatus,
    };
}
