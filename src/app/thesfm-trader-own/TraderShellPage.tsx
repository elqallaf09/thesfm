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
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { theme, resolvedTheme } = useTheme();

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
    const handleTraderMessage = (event: MessageEvent<unknown>) => {
      const traderWindow = iframeRef.current?.contentWindow;
      if (!traderWindow) return;
      if (event.origin !== window.location.origin || event.source !== traderWindow) return;

      if (isTraderThemeReadyMessage(event.data)) {
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
          postCurrentTheme();
          postCurrentRoute();
        }}
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
