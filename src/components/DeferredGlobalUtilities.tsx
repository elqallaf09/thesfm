'use client';

import dynamic from 'next/dynamic';

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
  return (
    <>
      <DeferredToaster />
      <DeferredAnalyticsTracker />
      <DeferredGlobalClientEffects />
    </>
  );
}
