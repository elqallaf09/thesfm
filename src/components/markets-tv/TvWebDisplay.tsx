'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MarketsTv } from './MarketsTv';
import { tvDisplayModeFromPath } from '@/lib/markets-tv/display-navigation';

export function TvWebDisplay() {
  const pathname = usePathname() || '/tv';
  // The layout survives browser history traversal. Keep the initial route props
  // stable so route changes cannot rerun MarketsTv's device-settings setup.
  const [initialMode] = useState(() => tvDisplayModeFromPath(pathname) || 'viewing');
  return <MarketsTv initialAllStocks={initialMode === 'browse'} initialStripsOnly={initialMode === 'strips'} />;
}
