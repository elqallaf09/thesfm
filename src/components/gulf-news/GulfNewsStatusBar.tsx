'use client';

import { useEffect, useState } from 'react';

type GulfNewsStatusBarProps = {
  labels: {
    lastUpdated: string;
    nextUpdate: string;
    delayed: string;
    source: string;
  };
  lastUpdated: string;
  lastLoadedAt: number;
  formatDateTime: (value: string) => string;
};

function getSecondsUntilNextRefresh(lastLoadedAt: number) {
  const elapsed = Math.floor((Date.now() - lastLoadedAt) / 1000);
  return Math.max(0, 300 - elapsed);
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function GulfNewsStatusBar({ labels, lastUpdated, lastLoadedAt, formatDateTime }: GulfNewsStatusBarProps) {
  const [nextUpdate, setNextUpdate] = useState(() => getSecondsUntilNextRefresh(lastLoadedAt));

  useEffect(() => {
    const updateCountdown = () => setNextUpdate(getSecondsUntilNextRefresh(lastLoadedAt));
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [lastLoadedAt]);

  return (
    <section className="gulf-news-status-bar">
      <span className="gulf-news-status-health" aria-hidden="true" />
      <span>{labels.lastUpdated}: {lastUpdated ? formatDateTime(lastUpdated) : '-'}</span>
      <span>{labels.nextUpdate}: {formatCountdown(nextUpdate)}</span>
      <strong>{labels.delayed}</strong>
      <span>{labels.source}</span>
    </section>
  );
}

export default GulfNewsStatusBar;

