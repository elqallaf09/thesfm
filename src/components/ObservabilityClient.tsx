'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  captureInternalFetches,
  enqueueObservabilityEvent,
  eventTypeSampleRate,
  flushObservabilityQueue,
  updateObservabilityContext,
} from '@/lib/observability/client';
import { errorSignature, isDuplicateError, normalizeRoute, sanitizeErrorText, shouldSample } from '@/lib/observability/core';

type WebVitalMetric = { name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB'; value: number; rating?: 'good' | 'needs-improvement' | 'poor' };
type NetworkInformation = { effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'; addEventListener?: (name: string, listener: () => void) => void; removeEventListener?: (name: string, listener: () => void) => void };
type MemoryPerformance = Performance & { memory?: { usedJSHeapSize: number }; measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }> };

function browserFamily() {
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return 'Edge' as const;
  if (/Firefox/i.test(ua)) return 'Firefox' as const;
  if (/CriOS|Chrome/i.test(ua)) return 'Chrome' as const;
  if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) return 'Safari' as const;
  return 'Other' as const;
}

function coarseDevice() {
  const width = window.innerWidth;
  const touch = navigator.maxTouchPoints > 0;
  if (width < 768) return 'mobile' as const;
  if (touch && width < 1200) return 'tablet' as const;
  return 'desktop' as const;
}

function viewportClass() {
  if (window.innerWidth < 768) return 'small' as const;
  if (window.innerWidth < 1280) return 'medium' as const;
  return 'large' as const;
}

export function ObservabilityClient() {
  const pathname = usePathname() || '/';
  const { lang } = useLanguage();
  const { session, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigation = useRef<{ started: number; requested: string } | null>(null);
  const previousPath = useRef(normalizeRoute(pathname));
  const routeCount = useRef(1);

  useReportWebVitals((metric: WebVitalMetric) => {
    if (!shouldSample(eventTypeSampleRate('web_vital'))) return;
    enqueueObservabilityEvent({ type: 'web_vital', name: metric.name, value: metric.value, rating: metric.rating ?? 'unknown' });
  });

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    const updateContext = () => updateObservabilityContext({
      authenticated: !loading && Boolean(session),
      locale: lang === 'ar' || lang === 'en' || lang === 'fr' ? lang : 'unknown',
      theme: resolvedTheme === 'light' || resolvedTheme === 'dark' ? resolvedTheme : 'system',
      viewportClass: viewportClass(),
      deviceClass: coarseDevice(),
      browserFamily: browserFamily(),
      networkClass: navigator.onLine ? connection?.effectiveType ?? 'unknown' : 'offline',
    });
    updateContext();
    const resize = () => updateContext();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('online', updateContext);
    window.addEventListener('offline', updateContext);
    connection?.addEventListener?.('change', updateContext);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('online', updateContext);
      window.removeEventListener('offline', updateContext);
      connection?.removeEventListener?.('change', updateContext);
    };
  }, [lang, loading, resolvedTheme, session]);

  useEffect(() => {
    const markStart = performance.now();
    performance.mark('sfm-shell-hydration-proxy-start');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      performance.mark('sfm-shell-hydration-proxy-complete');
      enqueueObservabilityEvent({ type: 'hydration', name: 'shell_interactive_proxy', value: performance.now() - markStart, proxy: true });
    }));
  }, []);

  useEffect(() => {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigationEntry?.type === 'reload' && shouldSample(eventTypeSampleRate('route_transition'))) {
      enqueueObservabilityEvent({ type: 'route_transition', name: 'hard_reload', value: navigationEntry.duration, navigationKind: 'hard_reload' });
    }
    const started = performance.now();
    const reportSession = () => enqueueObservabilityEvent({ type: 'session_stability', name: 'page_session_duration', value: Math.max(0, performance.now() - started), count: routeCount.current });
    window.addEventListener('pagehide', reportSession);
    return () => window.removeEventListener('pagehide', reportSession);
  }, []);

  useEffect(() => {
    const nextRoute = normalizeRoute(pathname);
    const pending = navigation.current;
    if (nextRoute !== previousPath.current) routeCount.current += 1;
    if (pending && nextRoute !== previousPath.current && shouldSample(eventTypeSampleRate('route_transition'))) {
      const navigationKind = pending.requested === nextRoute
        ? (navigator.onLine ? 'normal' : 'offline')
        : nextRoute.startsWith('/login') ? 'auth_redirect'
          : nextRoute === '/dashboard' ? 'guest_redirect' : 'redirect';
      enqueueObservabilityEvent({ type: 'route_transition', name: 'route_shell_ready', value: performance.now() - pending.started, route: nextRoute, navigationKind });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const duration = performance.now() - pending.started;
        enqueueObservabilityEvent({ type: 'route_transition', name: 'meaningful_content_ready_proxy', value: duration, route: nextRoute, navigationKind, proxy: true });
        if (document.querySelector('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')) {
          enqueueObservabilityEvent({ type: 'hydration', name: 'route_controls_ready_proxy', value: duration, route: nextRoute, proxy: true });
        }
      }));
      navigation.current = null;
    }
    previousPath.current = nextRoute;
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.origin !== window.location.origin || anchor.target || anchor.hasAttribute('download')) return;
      const requested = normalizeRoute(anchor.pathname);
      if (requested === normalizeRoute(window.location.pathname)) return;
      if (navigation.current && shouldSample(eventTypeSampleRate('route_transition'))) {
        enqueueObservabilityEvent({ type: 'route_transition', name: 'cancelled_navigation', value: performance.now() - navigation.current.started, route: navigation.current.requested, navigationKind: 'cancelled' });
      }
      navigation.current = { started: performance.now(), requested };
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    const initializationStarted = performance.now();
    performance.mark('sfm-observability-init-start');
    const teardownFetch = captureInternalFetches();
    const seen = new Map<string, number>();
    const reportError = (kind: string, reason: unknown) => {
      const safe = sanitizeErrorText(reason);
      const signature = errorSignature(safe);
      const now = Date.now();
      if (isDuplicateError(seen, signature, now)) return;
      enqueueObservabilityEvent({ type: 'client_error', name: kind, value: 1, errorSignature: signature, failureClass: /chunk/i.test(safe) ? 'chunk_load' : /hydration/i.test(safe) ? 'hydration' : navigator.onLine ? 'runtime' : 'offline' });
    };
    const onError = (event: ErrorEvent) => reportError('javascript_error', event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => reportError('unhandled_rejection', event.reason);
    const onOnline = () => void flushObservabilityQueue();
    const onVisibility = () => { if (document.visibilityState === 'hidden') void flushObservabilityQueue(); };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    performance.mark('sfm-observability-init-complete');
    enqueueObservabilityEvent({ type: 'hydration', name: 'observability_initialization_proxy', value: performance.now() - initializationStarted, proxy: true });
    return () => {
      teardownFetch();
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!shouldSample(eventTypeSampleRate('long_task')) || !('PerformanceObserver' in window)) return;
    let count = 0;
    let total = 0;
    let longest = 0;
    let observer: PerformanceObserver | null = null;
    let timer = 0;
    try {
      observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          count += 1; total += entry.duration; longest = Math.max(longest, entry.duration);
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
      timer = window.setInterval(() => {
        if (!count) return;
        enqueueObservabilityEvent({ type: 'long_task', name: 'long_task_aggregate', value: total, count, totalDuration: total, longestDuration: longest });
        count = 0; total = 0; longest = 0;
      }, 30_000);
    } catch { observer = null; }
    return () => { observer?.disconnect(); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!shouldSample(eventTypeSampleRate('memory'))) return;
    const memoryPerformance = performance as MemoryPerformance;
    let initial: number | null = null;
    const sample = async (name: string) => {
      try {
        const bytes = memoryPerformance.measureUserAgentSpecificMemory
          ? (await memoryPerformance.measureUserAgentSpecificMemory()).bytes
          : memoryPerformance.memory?.usedJSHeapSize;
        if (typeof bytes !== 'number') {
          enqueueObservabilityEvent({ type: 'memory', name: 'memory_support', value: 0, supportState: 'unsupported' });
          return;
        }
        if (initial == null) initial = bytes;
        enqueueObservabilityEvent({ type: 'memory', name, value: bytes, totalDuration: Math.max(0, bytes - initial), supportState: 'supported', proxy: true });
      } catch (error) {
        enqueueObservabilityEvent({ type: 'memory', name: 'memory_support', value: 0, supportState: error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'failed' });
      }
    };
    void sample('initial_memory_sample');
    const delayed = window.setTimeout(() => void sample('delayed_memory_sample'), 60_000);
    const longSession = window.setTimeout(() => void sample('long_session_memory_sample'), 15 * 60_000);
    return () => { window.clearTimeout(delayed); window.clearTimeout(longSession); };
  }, []);

  useEffect(() => {
    if (shouldSample(eventTypeSampleRate('memory'))) {
      const memory = (performance as MemoryPerformance).memory?.usedJSHeapSize;
      if (typeof memory === 'number') enqueueObservabilityEvent({ type: 'memory', name: 'route_change_memory_sample', value: memory, supportState: 'supported', proxy: true });
    }
  }, [pathname]);

  return null;
}
