import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/axios';

interface Draft {
    body: string;
    type: 'reply' | 'note';
    savedAt: number;
}

interface ServerDraft {
    body: string;
    type: string;
    updated_at: string;
}

interface UseDraftOptions {
    ticketId: number;
    debounceMs?: number;
}

interface UseDraftReturn {
    draft: Draft | null;
    draftStatus: 'idle' | 'saving' | 'saved';
    loadDraft: () => Draft | null;
    saveDraft: (body: string, type: 'reply' | 'note') => void;
    saveToServer: (body: string, type: 'reply' | 'note') => Promise<void>;
    clearDraft: () => void;
    loadFromServer: () => Promise<void>;
}

/**
 * Hook for managing message drafts with localStorage auto-save and server persistence.
 */
export function useDraft({ ticketId, debounceMs = 1000 }: UseDraftOptions): UseDraftReturn {
    const storageKey = `draft_ticket_${ticketId}`;
    const [draft, setDraft] = useState<Draft | null>(null);
    const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load draft from localStorage
    const loadDraft = useCallback((): Draft | null => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored) as Draft;
                setDraft(parsed);
                return parsed;
            }
        } catch {
            localStorage.removeItem(storageKey);
        }
        return null;
    }, [storageKey]);

    // Load draft from server (for cross-device sync)
    const loadFromServer = useCallback(async (): Promise<void> => {
        try {
            const response = await api.get(`/inbox/${ticketId}/draft`);
            const serverDraft = response.data.draft as ServerDraft | null;

            if (serverDraft) {
                const localDraft = loadDraft();

                // Only use server draft if it's newer than local draft
                const serverTime = new Date(serverDraft.updated_at).getTime();
                const localTime = localDraft?.savedAt ?? 0;

                if (serverTime > localTime) {
                    const newDraft: Draft = {
                        body: serverDraft.body,
                        type: serverDraft.type as 'reply' | 'note',
                        savedAt: serverTime,
                    };
                    setDraft(newDraft);
                    localStorage.setItem(storageKey, JSON.stringify(newDraft));
                }
            }
        } catch {
            // Silently fail - localStorage draft will be used
        }
    }, [ticketId, storageKey, loadDraft]);

    // Save draft to localStorage (debounced)
    const saveDraft = useCallback((body: string, type: 'reply' | 'note') => {
        // Clear existing timers
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        if (savedTimeout.current) {
            clearTimeout(savedTimeout.current);
        }

        // If body is empty, clear the draft
        if (!body.trim()) {
            localStorage.removeItem(storageKey);
            setDraft(null);
            setDraftStatus('idle');
            return;
        }

        setDraftStatus('saving');

        // Debounced save
        debounceTimer.current = setTimeout(() => {
            const newDraft: Draft = {
                body,
                type,
                savedAt: Date.now(),
            };

            localStorage.setItem(storageKey, JSON.stringify(newDraft));
            setDraft(newDraft);
            setDraftStatus('saved');

            // Reset status after 2 seconds
            savedTimeout.current = setTimeout(() => {
                setDraftStatus('idle');
            }, 2000);
        }, debounceMs);
    }, [storageKey, debounceMs]);

    // Save draft to server
    const saveToServer = useCallback(async (body: string, type: 'reply' | 'note'): Promise<void> => {
        if (!body.trim()) {
            return;
        }

        try {
            await api.post(`/inbox/${ticketId}/draft`, { body, type });
        } catch {
            // Silently fail - localStorage is the primary storage
        }
    }, [ticketId]);

    // Clear draft from both localStorage and server
    const clearDraft = useCallback(() => {
        // Clear timers
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        if (savedTimeout.current) {
            clearTimeout(savedTimeout.current);
        }

        // Clear localStorage
        localStorage.removeItem(storageKey);
        setDraft(null);
        setDraftStatus('idle');

        // Clear server (fire and forget)
        api.delete(`/inbox/${ticketId}/draft`).catch(() => {
            // Silently fail
        });
    }, [storageKey, ticketId]);

    // Load draft on mount
    useEffect(() => {
        const localDraft = loadDraft();

        // Also check server for a newer draft
        if (localDraft) {
            loadFromServer();
        } else {
            // No local draft, check server
            loadFromServer();
        }
    }, [loadDraft, loadFromServer]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
            if (savedTimeout.current) {
                clearTimeout(savedTimeout.current);
            }
        };
    }, []);

    return {
        draft,
        draftStatus,
        loadDraft,
        saveDraft,
        saveToServer,
        clearDraft,
        loadFromServer,
    };
}
