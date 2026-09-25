'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

/** Results from a previous identity or request can never populate the current view. */
export function usePrivateResource<T>(load: (userId: string) => Promise<T>) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const generation = useRef(0);
  const [state, setState] = useState<{ owner?: string; data?: T; loading: boolean; error: boolean }>({ loading: true, error: false });
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    if (!userId) { setState({ loading: false, error: false }); return; }
    setState({ owner: userId, loading: true, error: false });
    const retryDelaysMs = [0, 400, 1_200] as const;
    for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelaysMs[attempt]));
        if (ticket !== generation.current) return;
      }
      try {
        const data = await load(userId);
        if (ticket === generation.current) setState({ owner: userId, data, loading: false, error: false });
        return;
      } catch {
        if (attempt === retryDelaysMs.length - 1 && ticket === generation.current) {
          setState({ owner: userId, loading: false, error: true });
        }
      }
    }
  }, [load, userId]);
  useEffect(() => {
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]);
  return { userId, data: state.owner === userId ? state.data : undefined,
    loading: authLoading || state.loading, error: state.owner === userId && state.error, refresh };
}
