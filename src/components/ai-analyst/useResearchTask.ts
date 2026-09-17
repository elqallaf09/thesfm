'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisResult, IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { useAuth } from '@/hooks/useAuth';

type IntelligenceResponse = { ok?: boolean; result?: AnalysisResult; error?: { code?: unknown } };
function errorCodeFrom(payload: IntelligenceResponse) {
  return typeof payload.error?.code === 'string' ? payload.error.code : 'INTERNAL_ERROR';
}

/** Read saved evidence on entry; only an explicit user action starts research. */
export function useResearchTask({ symbol, assetType, horizon, locale }: {
  symbol: string; assetType: IntelligenceAssetType; horizon: IntelligenceHorizon; locale: 'ar' | 'en' | 'fr';
}) {
  const { user, isGuest } = useAuth();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);

  const requestRef = useRef<AbortController | null>(null);
  const loadedIdentityRef = useRef('');
  const [taskState, setTaskState] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');

  const requestAnalysis = useCallback(async (forceRefresh = false) => {
    if (requestRef.current) return;
    if (forceRefresh && (!user || isGuest)) { setErrorCode('UNAUTHENTICATED'); return; }
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 65_000);
    setLoading(true);
    setResult(null);
    setErrorCode(null);
    setRetryAfterSeconds(null);
    setTaskState('running');
    try {
      const response = await fetch('/api/intelligence/analyze', {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ asset: { symbol, assetType }, horizon, locale, requestedModules: [], source: 'SMART_MARKET_ANALYSIS', forceRefresh: forceRefresh && Boolean(user && !isGuest) }),
      });
      const payload = await response.json().catch(() => ({})) as IntelligenceResponse;
      if (requestRef.current !== controller) return;
      if (!response.ok || payload.ok !== true || !payload.result) {
        setErrorCode(errorCodeFrom(payload));
        const retryAfter = Number(response.headers.get('retry-after'));
        setRetryAfterSeconds(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
        setTaskState('failed');
        return;
      }
      setResult(payload.result);
      setTaskState('done');
    } catch {
      if (requestRef.current !== controller) return;
      setErrorCode(controller.signal.aborted ? 'PROVIDER_TIMEOUT' : 'NETWORK_ERROR');
      setTaskState('failed');
    } finally {
      clearTimeout(timer);
      if (requestRef.current === controller) { requestRef.current = null; setLoading(false); }
    }
  }, [assetType, horizon, isGuest, locale, symbol, user]);

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 20_000);
    async function loadLatest() {
      const identity = `${symbol}:${assetType}:${horizon}`;
      if (loadedIdentityRef.current !== identity) { setResult(null); loadedIdentityRef.current = identity; }
      setLoading(true); setErrorCode(null); setRetryAfterSeconds(null); setTaskState('idle');
      const params = new URLSearchParams({ symbol, assetType, horizon, locale });
      try {
        const response = await fetch(`/api/intelligence/latest?${params}`, { credentials: 'same-origin', headers: { accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => ({})) as IntelligenceResponse;
        if (requestRef.current !== controller) return;
        if (response.ok && payload.ok === true && payload.result) { setResult(payload.result); return; }
        // Opening details, changing tabs or following old autoRun links is a
        // read-only action. A missing saved analysis never triggers a POST.
        if (response.status !== 404) setErrorCode(errorCodeFrom(payload));
      } catch {
        if (requestRef.current === controller) setErrorCode(controller.signal.aborted ? 'PROVIDER_TIMEOUT' : 'NETWORK_ERROR');
      } finally {
        clearTimeout(timer);
        if (requestRef.current === controller) { requestRef.current = null; setLoading(false); }
      }
    }
    void loadLatest();
    return () => {
      clearTimeout(timer);
      requestRef.current?.abort();
      requestRef.current = null;
      controller.abort();
    };
  }, [assetType, horizon, locale, symbol]);

  return { user, isGuest, result, loading, errorCode, retryAfterSeconds, taskState, requestAnalysis };
}
