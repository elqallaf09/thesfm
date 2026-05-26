'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type ViewMode = 'simple' | 'professional';

const STORE_KEY = 'sfm_view_mode';
const EVENT_NAME = 'sfm:view-mode-change';

function normalizeViewMode(value: unknown): ViewMode {
  return value === 'simple' ? 'simple' : 'professional';
}

function readStoredMode(): ViewMode {
  if (typeof window === 'undefined') return 'professional';
  return normalizeViewMode(window.localStorage.getItem(STORE_KEY));
}

export function useViewMode() {
  const { user } = useAuth();
  const [viewMode, setViewModeState] = useState<ViewMode>('professional');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMode() {
      const stored = readStoredMode();
      setViewModeState(stored);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from('profiles')
          .select('view_mode')
          .eq('id', user.id)
          .maybeSingle();

        if (!cancelled && !error && data?.view_mode) {
          const nextMode = normalizeViewMode(data.view_mode);
          setViewModeState(nextMode);
          window.localStorage.setItem(STORE_KEY, nextMode);
        }
      } catch {
        // The app can still use the local preference if the profile column is not available yet.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMode();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const syncFromStorage = () => setViewModeState(readStoredMode());
    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(EVENT_NAME, syncFromStorage);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(EVENT_NAME, syncFromStorage);
    };
  }, []);

  const setViewMode = useCallback(async (nextMode: ViewMode) => {
    const normalized = normalizeViewMode(nextMode);
    setViewModeState(normalized);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORE_KEY, normalized);
      window.dispatchEvent(new Event(EVENT_NAME));
    }

    if (!user) return;

    try {
      await (supabase as any)
        .from('profiles')
        .update({ view_mode: normalized, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch {
      // The local preference remains active if the profile migration has not been applied yet.
    }
  }, [user]);

  return { viewMode, setViewMode, loading };
}
