'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const DeferredToaster = dynamic(
  () => import('@/components/ui/sonner').then(module => module.Toaster),
  { ssr: false },
);

const DeferredAnalyticsTracker = dynamic(
  () => import('@/components/AnalyticsTracker').then(module => module.AnalyticsTracker),
  { ssr: false },
);

const DeferredGlobalClientEffects = dynamic(
  () => import('@/components/GlobalClientEffects'),
  { ssr: false },
);

export function DeferredGlobalUtilities() {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    const mountUtilities = () => setShouldMount(true);
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(mountUtilities, { timeout: 1500 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(mountUtilities, 0);
    return () => window.clearTimeout(handle);
  }, []);

  if (!shouldMount) return null;

  return (
    <>
      <DeferredToaster />
      <DeferredAnalyticsTracker />
      <DeferredGlobalClientEffects />
    </>
  );
}
