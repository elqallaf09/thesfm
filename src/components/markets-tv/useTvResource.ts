'use client';
import { tvFetch } from '@/lib/markets-tv/client';
import { useEffect, useState } from 'react';
export function useTvResource<T>(path: string | null, interval: number, token = '', revision = 0) {
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null; loading: boolean }>({ key: '', data: null, error: null, loading: false });
  const key = `${path}|${token}`;
  useEffect(() => {
    if (!path) return;
    let stopped = false, running = false; let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    setState(previous => previous.key === key ? { ...previous, error: null, loading: previous.data === null } : { key, data: null, error: null, loading: true });
    async function load() {
      if (stopped || running || document.hidden || !navigator.onLine) return;
      running = true; controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 55000);
      try {
        const response = await tvFetch(path!, { cache: 'no-store', signal: controller.signal, headers: token ? { 'x-sfm-tv-token': token } : {} });
        const body = await response.json();
        if (!response.ok) throw new Error(typeof body.code === 'string' ? body.code : 'UNAVAILABLE');
        if (!stopped) setState({ key, data: body as T, error: null, loading: false });
      } catch (error) {
        if (!stopped) setState(s => ({ key, data: s.key === key ? s.data : null, loading: false, error: error instanceof Error ? error.message : 'UNAVAILABLE' }));
      } finally { clearTimeout(timeout); running = false; if (!stopped) { clearTimeout(timer); timer = setTimeout(() => void load(), interval); } }
    }
    function visibility() { if (document.hidden) { clearTimeout(timer); controller?.abort(); } else { clearTimeout(timer); void load(); } }
    void load(); document.addEventListener('visibilitychange', visibility); window.addEventListener('online', visibility);
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('online', visibility); };
  }, [path, interval, token, key, revision]);
  return state.key === key ? state : { data: null, error: null, loading: Boolean(path) };
}
