'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Isolates useSearchParams behind a local Suspense boundary in the navigation
 * shells. This keeps query-backed destinations selectable without forcing the
 * entire sidebar or mobile drawer into a client-render bailout.
 */
export function NavigationQueryObserver({
  onQueryChange,
}: {
  onQueryChange: (search: string) => void;
}) {
  const searchParams = useSearchParams();
  const serialized = searchParams?.toString() ?? '';

  useEffect(() => {
    onQueryChange(serialized ? `?${serialized}` : '');
  }, [onQueryChange, serialized]);

  return null;
}

export default NavigationQueryObserver;
