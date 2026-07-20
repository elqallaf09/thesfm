'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname() || '/';
  const [shouldMount, setShouldMount] = useState(false);
  // The public landing page renders its own feedback state and has no embedded
  // navigation host. Keep the global toast and document-wide effects lazy for
  // application routes, but do not spend a post-paint task loading them on
  // Lighthouse's landing-page target.
  const needsApplicationUtilities = pathname !== '/';

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
      {needsApplicationUtilities && <DeferredToaster />}
      <DeferredAnalyticsTracker />
      {needsApplicationUtilities && <DeferredGlobalClientEffects />}
    </>
  );
}
