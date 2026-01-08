import type { DashboardLayout, WidgetPlacement } from '@/types/dashboard';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDashboardLayoutOptions {
    layout: DashboardLayout;
}

export function useDashboardLayout({ layout }: UseDashboardLayoutOptions) {
    const [widgets, setWidgets] = useState<WidgetPlacement[]>(layout.widgets);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setWidgets(layout.widgets);
    }, [layout.widgets]);

    const saveLayout = useCallback((newWidgets: WidgetPlacement[]) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setHasChanges(true);

        saveTimeoutRef.current = setTimeout(() => {
            router.patch(
                '/dashboard/layout',
                { widgets: newWidgets } as unknown as Record<string, unknown>,
                {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        setHasChanges(false);
                    },
                },
            );
        }, 500);
    }, []);

    const updateWidgets = useCallback(
        (newWidgets: WidgetPlacement[]) => {
            setWidgets(newWidgets);
            saveLayout(newWidgets);
        },
        [saveLayout],
    );

    const resetLayout = useCallback(() => {
        router.post(
            '/dashboard/layout/reset',
            {},
            {
                preserveState: false,
                preserveScroll: true,
                onSuccess: () => {
                    setHasChanges(false);
                },
            },
        );
    }, []);

    const toggleCustomizing = useCallback(() => {
        setIsCustomizing((prev) => !prev);
    }, []);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        widgets,
        isCustomizing,
        hasChanges,
        updateWidgets,
        resetLayout,
        toggleCustomizing,
    };
}
