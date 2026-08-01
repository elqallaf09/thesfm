'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import type { ObservabilityEvent } from '@/lib/observability/core';
import { errorSignature, isDuplicateError } from '@/lib/observability/core';
import {
  browserFamily,
  createRumMetricEvent,
  deviceClass,
  isSampledRumSession,
  normalizeRumSampleRate,
  observabilityEnvironment,
  subscribeClientRumMetric,
  viewportClass,
  type ClientRumContext,
} from '@/lib/observability/clientRum';

const OBSERVABILITY_ENABLED = process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED === 'true';
const DEFAULT_SAMPLE_RATE = 0.1;
const MAX_QUEUE_SIZE = 40;
const BATCH_SIZE = 20;
const FLUSH_DELAY_MS = 1_000;

let pendingEvents: ObservabilityEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function sessionId() {
  const storageKey = 'sfm_observability_session';
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored && /^[a-zA-Z0-9_-]{8,80}$/.test(stored)) return stored;
    const created = globalThis.crypto?.randomUUID?.() ?? `rum_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return `rum_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function networkClass(): ObservabilityEvent['networkClass'] {
  if (!navigator.onLine) return 'offline';
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const type = connection?.effectiveType;
  return type === 'slow-2g' || type === '2g' || type === '3g' || type === '4g' ? type : 'unknown';
}

function sendBatch(events: ObservabilityEvent[], beacon = false) {
  if (!events.length) return;
  const body = JSON.stringify({ events });
  if (beacon && navigator.sendBeacon?.('/api/observability', new Blob([body], { type: 'application/json' }))) return;
  void fetch('/api/observability', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {
    if (!navigator.onLine) pendingEvents = [...events, ...pendingEvents].slice(-MAX_QUEUE_SIZE);
  });
}

function flush(beacon = false) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  while (pendingEvents.length) sendBatch(pendingEvents.splice(0, BATCH_SIZE), beacon);
}

function enqueue(event: ObservabilityEvent) {
  pendingEvents.push(event);
  pendingEvents = pendingEvents.slice(-MAX_QUEUE_SIZE);
  if (pendingEvents.length >= BATCH_SIZE) return flush();
  if (!flushTimer) flushTimer = setTimeout(() => flush(), FLUSH_DELAY_MS);
}

function normalizedTheme(value: string | undefined): ClientRumContext['theme'] {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'unknown';
}

export function WebVitalsReporter() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { resolvedTheme, theme } = useTheme();
  const rumSession = useRef<string | null>(null);
  const sampled = useRef<boolean | null>(null);
  const context = useRef<ClientRumContext | null>(null);

  if (typeof window !== 'undefined' && !rumSession.current) {
    rumSession.current = sessionId();
    const rate = normalizeRumSampleRate(process.env.NEXT_PUBLIC_OBSERVABILITY_SAMPLE_RATE, DEFAULT_SAMPLE_RATE);
    sampled.current = isSampledRumSession(rumSession.current, rate);
  }

  if (typeof window !== 'undefined' && rumSession.current) {
    context.current = {
      authenticated: Boolean(user),
      browserFamily: browserFamily(navigator.userAgent),
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION || 'client',
      deploymentSha: process.env.NEXT_PUBLIC_DEPLOYMENT_SHA || 'client',
      deviceClass: deviceClass(window.innerWidth),
      environment: observabilityEnvironment(window.location.hostname),
      locale: lang,
      networkClass: networkClass(),
      route: pathname || '/',
      sessionId: rumSession.current,
      theme: normalizedTheme(resolvedTheme || theme),
      viewportClass: viewportClass(window.innerWidth),
    };
  }

  const reportMetric = useCallback((metric: Parameters<Parameters<typeof useReportWebVitals>[0]>[0]) => {
    if (!OBSERVABILITY_ENABLED || !sampled.current || !context.current) return;
    enqueue(createRumMetricEvent(metric, context.current));
  }, []);

  useReportWebVitals(reportMetric);

  useEffect(() => subscribeClientRumMetric(metric => {
    if (!OBSERVABILITY_ENABLED || !sampled.current || !context.current) return;
    enqueue(createRumMetricEvent(metric, context.current));
  }), []);

  useEffect(() => {
    if (!OBSERVABILITY_ENABLED || !sampled.current) return undefined;
    const seenErrors = new Map<string, number>();
    const captureError = (value: unknown, name: string) => {
      if (!context.current) return;
      const signature = errorSignature(value);
      if (isDuplicateError(seenErrors, signature)) return;
      enqueue(createRumMetricEvent({
        id: signature,
        label: 'custom',
        name,
        type: 'client_error',
        value: 1,
      }, context.current));
    };
    const onError = (event: ErrorEvent) => captureError(event.error ?? event.message, 'window-error');
    const onUnhandledRejection = (event: PromiseRejectionEvent) => captureError(event.reason, 'unhandled-rejection');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    let longTaskObserver: PerformanceObserver | null = null;
    if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      longTaskObserver = new PerformanceObserver(list => {
        if (!context.current) return;
        for (const entry of list.getEntries()) {
          enqueue(createRumMetricEvent({
            id: `longtask_${Math.round(entry.startTime)}`,
            label: 'custom',
            name: 'browser-long-task',
            type: 'long_task',
            value: entry.duration,
          }, context.current));
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    }

    const memory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
    if (context.current && Number.isFinite(memory?.usedJSHeapSize)) {
      enqueue(createRumMetricEvent({
        id: `memory_${Date.now()}`,
        label: 'custom',
        name: 'used-js-heap-bytes',
        type: 'memory',
        value: memory?.usedJSHeapSize ?? 0,
      }, context.current));
    }

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      longTaskObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!OBSERVABILITY_ENABLED || !sampled.current) return undefined;
    const flushOnline = () => flush();
    const flushHidden = () => {
      if (document.visibilityState === 'hidden') flush(true);
    };
    window.addEventListener('online', flushOnline);
    window.addEventListener('pagehide', flushHidden);
    document.addEventListener('visibilitychange', flushHidden);
    return () => {
      window.removeEventListener('online', flushOnline);
      window.removeEventListener('pagehide', flushHidden);
      document.removeEventListener('visibilitychange', flushHidden);
    };
  }, []);

  return null;
}
