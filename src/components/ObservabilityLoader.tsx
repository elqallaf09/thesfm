'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const ObservabilityClient = dynamic(
  () => import('@/components/ObservabilityClient').then(module => module.ObservabilityClient),
  { ssr: false },
);

export function ObservabilityLoader() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED !== 'true') return;
    const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(() => setReady(true), { timeout: 2_000 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  return ready ? <ObservabilityClient /> : null;
}
