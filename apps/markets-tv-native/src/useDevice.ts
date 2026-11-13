import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { parsePair, record, request, validToken, TvRequestError, type Pair } from './receiverApi';

const KEY = 'sfm.tv.device.v1';
export function useDevice() {
  const [token, setToken] = useState<string | null>(null), [pair, setPair] = useState<Pair | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<number | null>(null), [ready, setReady] = useState(false);
  const generation = useRef(0), pending = useRef<AbortController | null>(null);
  useEffect(() => {
    let stopped = false;
    void SecureStore.getItemAsync(KEY).then(value => { if (!stopped && validToken(value)) setToken(value); })
      .catch(() => { if (!stopped) setError(500); }).finally(() => { if (!stopped) setReady(true); });
    return () => { stopped = true; generation.current = -1; pending.current?.abort(); };
  }, []);
  const forget = useCallback(async () => { generation.current++; pending.current?.abort(); setToken(null); setPair(null); await SecureStore.deleteItemAsync(KEY); }, []);
  const cancel = useCallback(() => { generation.current++; pending.current?.abort(); setPair(null); setBusy(false); }, []);
  const create = useCallback(async () => {
    const version = ++generation.current; pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setBusy(true); setPair(null); setError(null); const timeout = setTimeout(() => controller.abort(), 15_000);
    try { const result = parsePair(await request('/api/tv/pair', controller.signal, undefined, 'POST', { name: 'SFM TV Native' })); if (version === generation.current) setPair(result); }
    catch (cause) { if (version === generation.current) setError(cause instanceof TvRequestError ? cause.status : 503); }
    finally { clearTimeout(timeout); if (version === generation.current) setBusy(false); }
  }, []);
  useEffect(() => {
    if (!pair) return;
    let stopped = false, inFlight = false, timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController(), version = generation.current;
    async function poll() {
      if (stopped || inFlight) return;
      if (Date.now() >= Date.parse(pair!.expiresAt)) { setPair(null); setError(410); return; }
      if (AppState.currentState === 'background' || AppState.currentState === 'inactive') { timer = setTimeout(() => { void poll(); }, 5000); return; }
      inFlight = true; let delay = 5000; const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const result = record(await request('/api/tv/pair', controller.signal, pair!.secret));
        if (stopped || version !== generation.current) return;
        if (result.state === 'active' && validToken(result.token)) {
          await SecureStore.setItemAsync(KEY, result.token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
          if (stopped || version !== generation.current) { await SecureStore.deleteItemAsync(KEY); return; }
          if (!stopped && version === generation.current) { setToken(result.token); setPair(null); setError(null); }
          return;
        }
        if (result.state !== 'pending') throw new Error('INVALID_PAIR_STATE');
      } catch (cause) {
        if (!stopped && version === generation.current) {
          const status = cause instanceof TvRequestError ? cause.status : 503; setError(status);
          if (status === 410 || status === 401 || controller.signal.aborted) { setPair(null); return; }
          delay = Math.max(10_000, cause instanceof TvRequestError ? cause.retryAfterMs : 0);
        }
      } finally { clearTimeout(timeout); inFlight = false; }
      if (!stopped) timer = setTimeout(() => { void poll(); }, delay);
    }
    timer = setTimeout(() => { void poll(); }, 5000);
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [pair]);
  const unlink = useCallback(async () => {
    if (!token || busy) return; setBusy(true); setError(null);
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      try { await request('/api/tv/device', controller.signal, token, 'DELETE'); }
      catch (cause) { if (!(cause instanceof TvRequestError && cause.status === 401)) throw cause; }
      await forget();
    } catch (cause) { setError(cause instanceof TvRequestError ? cause.status : 503); }
    finally { clearTimeout(timeout); setBusy(false); }
  }, [token, busy, forget]);
  return { token, pair, busy, error, ready, create, cancel, unlink, forget };
}
