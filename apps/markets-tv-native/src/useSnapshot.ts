import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { readSnapshot, SnapshotError, type Scene, type Snapshot } from './api';

export function useSnapshot(scene: Scene, revision: number) {
  const cache = useRef(new Map<Scene, Snapshot>());
  const [state, setState] = useState<{ scene: Scene; data: Snapshot | null; loading: boolean; error: boolean }>({ scene, data: null, loading: true, error: false });
  useEffect(() => {
    let stopped = false, busy = false, failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    const active = () => !stopped && !['background', 'inactive'].includes(AppState.currentState);
    setState({ scene, data: cache.current.get(scene) || null, loading: true, error: false });
    async function load() {
      if (!active() || busy) return;
      busy = true;
      const request = new AbortController(); controller = request;
      const timeout = setTimeout(() => request.abort(), 14_000);
      let delay = scene === 'assets' ? 15_000 : 30_000;
      try {
        const data = await readSnapshot(scene, request.signal);
        failures = 0; cache.current.set(scene, data);
        const retry = Date.parse(data.retryAt || '') - Date.now();
        if (Number.isFinite(retry) && ![...data.summary, ...data.quotes].some(q => q.price !== null && !q.issue)) delay = Math.max(delay, retry);
        if (active()) setState({ scene, data, loading: false, error: false });
      } catch (error) {
        delay = Math.max(error instanceof SnapshotError ? error.retryAfterMs : 0, Math.min(300_000, delay * 2 ** Math.min(++failures, 4)));
        if (active()) setState({ scene, data: cache.current.get(scene) || null, loading: false, error: true });
      } finally {
        clearTimeout(timeout); busy = false;
        if (controller === request) controller = null;
        if (active()) timer = setTimeout(() => { void load(); }, delay);
      }
    }
    const subscription = AppState.addEventListener('change', next => {
      clearTimeout(timer);
      if (next !== 'active') controller?.abort(); else void load();
    });
    void load();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); subscription.remove(); };
  }, [scene, revision]);
  return state.scene === scene ? state : { scene, data: cache.current.get(scene) || null, loading: true, error: false };
}
