'use client';

import { MarketBaseStyles } from './MarketBaseStyles';
import { MarketTraderStyles } from './MarketTraderStyles';
import { MarketChartStyles } from './MarketChartStyles';

/** Barrel — composes all market style sections */
export function MarketAsyncToolStyles() {
  return (
    <>
      <MarketBaseStyles />
      <MarketTraderStyles />
      <MarketChartStyles />
    </>
  );
}
