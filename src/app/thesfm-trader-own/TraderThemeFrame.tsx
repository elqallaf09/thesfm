'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import {
  createTraderThemeSetMessage,
  isResolvedTraderTheme,
  isTraderThemePreference,
  isTraderThemeReadyMessage,
  type TraderThemeSetMessage,
} from '@/lib/trader/themeBridge';

type TraderThemeFrameProps = {
  src: string;
};

export default function TraderThemeFrame({ src }: TraderThemeFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentMessageRef = useRef<TraderThemeSetMessage | null>(null);
  const { theme, resolvedTheme } = useTheme();

  const currentResolvedTheme = isResolvedTraderTheme(resolvedTheme) ? resolvedTheme : null;
  const currentPreference = isTraderThemePreference(theme)
    ? theme
    : currentResolvedTheme;

  currentMessageRef.current = currentPreference && currentResolvedTheme
    ? createTraderThemeSetMessage(currentPreference, currentResolvedTheme)
    : null;

  const postCurrentTheme = useCallback(() => {
    const target = iframeRef.current?.contentWindow;
    const message = currentMessageRef.current;
    if (!target || !message) return;

    target.postMessage(message, window.location.origin);
  }, []);

  useEffect(() => {
    postCurrentTheme();
  }, [currentPreference, currentResolvedTheme, postCurrentTheme]);

  useEffect(() => {
    const handleTraderMessage = (event: MessageEvent<unknown>) => {
      const traderWindow = iframeRef.current?.contentWindow;
      if (!traderWindow) return;
      if (event.origin !== window.location.origin || event.source !== traderWindow) return;
      if (!isTraderThemeReadyMessage(event.data)) return;

      postCurrentTheme();
    };

    window.addEventListener('message', handleTraderMessage);
    return () => window.removeEventListener('message', handleTraderMessage);
  }, [postCurrentTheme]);

  return (
    <iframe
      ref={iframeRef}
      title="SFM Smart Analyzer"
      src={src}
      allow="microphone; clipboard-write"
      className="trader-shell-frame"
      onLoad={postCurrentTheme}
    />
  );
}
