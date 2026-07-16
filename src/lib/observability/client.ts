'use client';

import type { ObservabilityEvent, ObservabilityEventType } from './core';
import { boundOfflineQueue, normalizeRoute } from './core';

const MAX_QUEUE = 40;
const MAX_BATCH = 20;
const MAX_AGE_MS = 5 * 60 * 1000;
const FLUSH_DELAY_MS = 1_500;
const SESSION_KEY = 'sfm_observability_session';

type ClientContext = Pick<ObservabilityEvent,
  'authenticated' | 'locale' | 'theme' | 'viewportClass' | 'deviceClass' | 'browserFamily' | 'networkClass'
>;
type EventInput = Pick<ObservabilityEvent, 'type' | 'name' | 'value'> & Partial<ObservabilityEvent>;
type QueueEntry = { event: ObservabilityEvent; queuedAt: number };

const queue: QueueEntry[] = [];
let flushTimer: number | undefined;
let flushInProgress = false;
let context: ClientContext = {
  authenticated: false,
  locale: 'unknown',
  theme: 'unknown',
  viewportClass: 'unknown',
  deviceClass: 'unknown',
  browserFamily: 'Unknown',
  networkClass: 'unknown',
};

function configuredEnabled() {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') return false;
  return process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED === 'true';
}

function sessionId() {
  const create = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID().replaceAll('-', '');
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  };
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      const parsed = JSON.parse(existing) as { id?: unknown; createdAt?: unknown };
      if (typeof parsed.id === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(parsed.id)
        && typeof parsed.createdAt === 'number' && parsed.createdAt > Date.now() - 24 * 60 * 60_000) return parsed.id;
    }
    const next = create();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: next, createdAt: Date.now() }));
    return next;
  } catch {
    return create();
  }
}

export function readSampleRate(name: string, fallback: number): number {
  const configured: Record<string, string | undefined> = {
    NEXT_PUBLIC_RUM_SAMPLE_RATE: process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE,
    NEXT_PUBLIC_ROUTE_SAMPLE_RATE: process.env.NEXT_PUBLIC_ROUTE_SAMPLE_RATE,
    NEXT_PUBLIC_LONG_TASK_SAMPLE_RATE: process.env.NEXT_PUBLIC_LONG_TASK_SAMPLE_RATE,
    NEXT_PUBLIC_MEMORY_SAMPLE_RATE: process.env.NEXT_PUBLIC_MEMORY_SAMPLE_RATE,
    NEXT_PUBLIC_API_SUCCESS_SAMPLE_RATE: process.env.NEXT_PUBLIC_API_SUCCESS_SAMPLE_RATE,
  };
  const raw = configured[name];
  const parsed = raw == null || raw === '' ? fallback : Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

export function updateObservabilityContext(next: Partial<ClientContext>) {
  context = { ...context, ...next };
}

function pruneQueue(now = Date.now()) {
  const bounded = boundOfflineQueue(queue, now, MAX_QUEUE, MAX_AGE_MS);
  queue.splice(0, queue.length, ...bounded);
}

async function transmit(events: ObservabilityEvent[]): Promise<boolean> {
  if (!events.length || !navigator.onLine) return false;
  const body = JSON.stringify({ events });
  if (body.length > 60_000) return false;
  try {
    if (document.visibilityState === 'hidden' && typeof navigator.sendBeacon === 'function') {
      return navigator.sendBeacon('/api/observability', new Blob([body], { type: 'application/json' }));
    }
    const response = await fetch('/api/observability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'same-origin',
      cache: 'no-store',
      // Avoid recursively timing the ingestion request in the fetch wrapper.
      observability: 'ignore',
    } as RequestInit & { observability: 'ignore' });
    return response.ok || response.status === 202 || response.status === 204 || response.status === 429;
  } catch {
    return false;
  }
}

export async function flushObservabilityQueue() {
  if (!configuredEnabled() || flushInProgress || !navigator.onLine) return;
  flushInProgress = true;
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = undefined;
  pruneQueue();
  const entries = queue.splice(0, MAX_BATCH);
  const sent = await transmit(entries.map(entry => entry.event));
  if (!sent) queue.unshift(...entries);
  pruneQueue();
  flushInProgress = false;
  if (sent && queue.length) scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer || typeof window === 'undefined') return;
  flushTimer = window.setTimeout(() => void flushObservabilityQueue(), FLUSH_DELAY_MS);
}

export function enqueueObservabilityEvent(input: EventInput) {
  if (!configuredEnabled() || typeof window === 'undefined') return;
  const event: ObservabilityEvent = {
    type: input.type,
    name: String(input.name).slice(0, 80),
    value: Number(input.value),
    route: normalizeRoute(input.route ?? window.location.pathname),
    timestamp: new Date().toISOString(),
    sessionId: sessionId(),
    authenticated: context.authenticated,
    locale: context.locale,
    theme: context.theme,
    viewportClass: context.viewportClass,
    deviceClass: context.deviceClass,
    browserFamily: context.browserFamily,
    networkClass: navigator.onLine ? context.networkClass : 'offline',
    deploymentSha: process.env.NEXT_PUBLIC_DEPLOYMENT_SHA || 'unknown',
    buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION || 'unknown',
    environment: (process.env.NEXT_PUBLIC_DEPLOYMENT_ENV as ObservabilityEvent['environment']) || 'development',
  };
  const optionalKeys: Array<keyof ObservabilityEvent> = [
    'rating', 'statusClass', 'method', 'cacheStatus', 'provider', 'endpointClass', 'assetClass', 'fallbackUsed', 'failureClass', 'retryCount',
    'count', 'totalDuration', 'longestDuration', 'supportState', 'navigationKind', 'cached', 'proxy',
    'errorSignature', 'firstSeen', 'lastSeen', 'correlationId',
  ];
  for (const key of optionalKeys) {
    if (input[key] !== undefined) Object.assign(event, { [key]: input[key] });
  }
  queue.push({ event, queuedAt: Date.now() });
  pruneQueue();
  scheduleFlush();
}

export function queuedObservabilityEventCount() {
  pruneQueue();
  return queue.length;
}

declare global {
  interface RequestInit {
    observability?: 'ignore';
  }
}

export function captureInternalFetches() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const parsed = new URL(url, window.location.origin);
    const internalApi = parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/') && parsed.pathname !== '/api/observability';
    if (!internalApi || init?.observability === 'ignore') return originalFetch(input, init);
    const started = performance.now();
    try {
      const response = await originalFetch(input, init);
      const failed = response.status >= 400;
      const successRate = readSampleRate('NEXT_PUBLIC_API_SUCCESS_SAMPLE_RATE', 0.05);
      if (failed || Math.random() < successRate) {
        enqueueObservabilityEvent({
          type: 'api_metric',
          name: 'internal_api_duration',
          value: Math.max(0, performance.now() - started),
          route: parsed.pathname,
          method: String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase() as ObservabilityEvent['method'],
          statusClass: response.status >= 500 ? '5xx' : response.status >= 400 ? '4xx' : response.status >= 300 ? '3xx' : '2xx',
          cacheStatus: /hit/i.test(response.headers.get('x-vercel-cache') || '') ? 'hit' : 'unknown',
          correlationId: response.headers.get('x-request-id')?.slice(0, 80),
        });
      }
      return response;
    } catch (error) {
      enqueueObservabilityEvent({
        type: 'api_metric', name: navigator.onLine ? 'internal_api_failure' : 'offline_api_failure',
        value: Math.max(0, performance.now() - started), route: parsed.pathname,
        method: String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase() as ObservabilityEvent['method'],
        statusClass: 'unknown', failureClass: navigator.onLine ? 'network' : 'offline',
      });
      throw error;
    }
  };
  return () => { window.fetch = originalFetch; };
}

export function eventTypeSampleRate(type: ObservabilityEventType) {
  if (type === 'route_transition') return readSampleRate('NEXT_PUBLIC_ROUTE_SAMPLE_RATE', 0.15);
  if (type === 'long_task') return readSampleRate('NEXT_PUBLIC_LONG_TASK_SAMPLE_RATE', 0.1);
  if (type === 'memory') return readSampleRate('NEXT_PUBLIC_MEMORY_SAMPLE_RATE', 0.02);
  return readSampleRate('NEXT_PUBLIC_RUM_SAMPLE_RATE', 1);
}
