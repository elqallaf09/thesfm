'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  createTraderThemeSetMessage,
  isResolvedTraderTheme,
  isTraderThemePreference,
  isTraderThemeReadyMessage,
  type TraderThemeSetMessage,
} from '@/lib/trader/themeBridge';
import {
  createTraderRouteSetMessage,
  isTraderRouteChangeMessage,
  traderAppRouteFromPublicPath,
} from '@/lib/trader/routeBridge';
import { reportClientRumMetric } from '@/lib/observability/clientRum';

const TRADER_READY_TIMEOUT_MS = 15_000;

function traderStaticTransferBytes(frame: HTMLIFrameElement | null) {
  let timeline: Performance;
  try { timeline = frame?.contentWindow?.performance ?? performance; } catch { timeline = performance; }
  return timeline.getEntriesByType('resource')
    .filter(entry => {
      try { return new URL(entry.name).pathname.startsWith('/thesfm-trader-own/app/'); } catch { return false; }
    })
    .reduce((total, entry) => total + ((entry as PerformanceResourceTiming).transferSize || 0), 0);
}

/**
 * Persistent SFM Smart Analyzer stage. Rendered once by the
 * /thesfm-trader-own layout so the terminal iframe survives route changes:
 * the shared shell sidebar drives navigation by changing the parent
 * pathname, which is bridged into the terminal as a message instead of a
 * reload, and terminal-internal navigation is bridged back into the parent
 * history so the sidebar active state and the URL stay in sync.
 */
export default function TraderShellPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const themeMessageRef = useRef<TraderThemeSetMessage | null>(null);
  const routeRef = useRef<string>('home');
  const requestedAtRef = useRef<number | null>(null);
  const readyReportedRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { theme, resolvedTheme } = useTheme();

  if (typeof window !== 'undefined' && requestedAtRef.current === null) {
    requestedAtRef.current = performance.now();
  }

  // The iframe src is fixed at mount; later route changes travel as messages.
  const [initialSrc] = useState(() =>
    `/thesfm-trader-own/app/index.html?route=${encodeURIComponent(traderAppRouteFromPublicPath(pathname))}`);

  const currentResolvedTheme = isResolvedTraderTheme(resolvedTheme) ? resolvedTheme : null;
  const currentPreference = isTraderThemePreference(theme) ? theme : currentResolvedTheme;
  themeMessageRef.current = currentPreference && currentResolvedTheme
    ? createTraderThemeSetMessage(currentPreference, currentResolvedTheme)
    : null;
  routeRef.current = traderAppRouteFromPublicPath(pathname);

  const postCurrentTheme = useCallback(() => {
    const target = iframeRef.current?.contentWindow;
    const message = themeMessageRef.current;
    if (!target || !message) return;
    target.postMessage(message, window.location.origin);
  }, []);

  const postCurrentRoute = useCallback(() => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(createTraderRouteSetMessage(routeRef.current), window.location.origin);
  }, []);

  useEffect(() => {
    postCurrentTheme();
  }, [currentPreference, currentResolvedTheme, postCurrentTheme]);

  useEffect(() => {
    postCurrentRoute();
  }, [pathname, postCurrentRoute]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (readyReportedRef.current) return;
      reportClientRumMetric({
        id: 'err_trader_ready_timeout',
        label: 'custom',
        name: 'Trader-ready-timeout',
        type: 'client_error',
        value: 1,
      });
    }, TRADER_READY_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const handleTraderMessage = (event: MessageEvent<unknown>) => {
      const traderWindow = iframeRef.current?.contentWindow;
      if (!traderWindow) return;
      if (event.origin !== window.location.origin || event.source !== traderWindow) return;

      if (isTraderThemeReadyMessage(event.data)) {
        if (!readyReportedRef.current) {
          readyReportedRef.current = true;
          reportClientRumMetric({
            id: `trader_ready_${Date.now()}`,
            label: 'custom',
            name: 'Trader-ready',
            type: 'route_transition',
            value: Math.max(0, performance.now() - (requestedAtRef.current ?? performance.now())),
          });
        }
        postCurrentTheme();
        postCurrentRoute();
        return;
      }

      if (isTraderRouteChangeMessage(event.data)) {
        const target = event.data.path;
        const current = `${window.location.pathname}${window.location.search}`;
        if (target !== current) router.push(target, { scroll: false });
      }
    };

    window.addEventListener('message', handleTraderMessage);
    return () => window.removeEventListener('message', handleTraderMessage);
  }, [postCurrentRoute, postCurrentTheme, router]);

  return (
    <main className="trader-shell-page" aria-label="SFM Smart Analyzer">
      <iframe
        ref={iframeRef}
        title="SFM Smart Analyzer"
        src={initialSrc}
        allow="microphone; clipboard-write"
        className="trader-shell-frame"
        onLoad={() => {
          const loadDuration = Math.max(0, performance.now() - (requestedAtRef.current ?? performance.now()));
          reportClientRumMetric({
            id: `trader_load_${Date.now()}`,
            label: 'custom',
            name: 'Trader-iframe-load',
            type: 'route_transition',
            value: loadDuration,
          });
          window.setTimeout(() => reportClientRumMetric({
            id: `trader_transfer_${Date.now()}`,
            label: 'custom',
            name: 'Trader-static-transfer-bytes',
            type: 'route_transition',
            value: traderStaticTransferBytes(iframeRef.current),
          }), 0);
          postCurrentTheme();
          postCurrentRoute();
        }}
        onError={() => reportClientRumMetric({
          id: 'err_trader_iframe_load',
          label: 'custom',
          name: 'Trader-iframe-error',
          type: 'client_error',
          value: 1,
        })}
      />
      <style>{`
        .trader-shell-page {
          position: relative;
          min-width: 0;
          width: 100%;
          height: calc(
            100dvh - var(--app-header-height) -
            var(--workspace-page-padding-block, 24px) -
            var(--workspace-page-padding-block, 24px)
          );
          min-height: 520px;
          border: 1px solid var(--border);
          border-radius: var(--radius-panel);
          background: var(--background);
          overflow: hidden;
          color-scheme: light dark;
        }
        .trader-shell-frame {
          display: block;
          width: 100%;
          height: 100%;
          min-height: inherit;
          border: 0;
          background: var(--background);
        }
        @media (max-width: 767px) {
          .trader-shell-page {
            height: calc(
              100dvh - var(--app-header-height) -
              var(--workspace-page-padding-block, 16px) -
              var(--workspace-page-padding-block, 16px)
            );
            min-height: 480px;
            border-radius: var(--radius-control);
          }
        }
      `}</style>
    </main>
  );
}
