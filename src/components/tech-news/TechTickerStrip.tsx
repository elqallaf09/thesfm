'use client';

import { Clock3 } from 'lucide-react';
import { StockTickerStrip } from '@/components/market/StockTickerStrip';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';

const TICKER_ITEMS = [
  { symbol: 'AAPL', companyName: 'Apple' },
  { symbol: 'MSFT', companyName: 'Microsoft' },
  { symbol: 'NVDA', companyName: 'NVIDIA' },
  { symbol: 'GOOGL', companyName: 'Alphabet' },
  { symbol: 'META', companyName: 'Meta' },
  { symbol: 'TSLA', companyName: 'Tesla' },
  { symbol: 'AMD', companyName: 'AMD' },
  { symbol: 'INTC', companyName: 'Intel' },
  { symbol: 'AVGO', companyName: 'Broadcom' },
  { symbol: 'ORCL', companyName: 'Oracle' },
  { symbol: 'CRM', companyName: 'Salesforce' },
] as const;

type TechTickerStripProps = {
  prices: TechStockPrice[];
  formatPrice: (value: number | null) => string;
  direction?: 'ltr' | 'rtl';
  labels: {
    priceUnavailable: string;
    unavailable: string;
    delayedGlobal: string;
    lastUpdated: string;
    sourceLabel: string;
  };
};

export function TechTickerStrip({ prices, formatPrice, labels }: TechTickerStripProps) {
  const tickerItems = TICKER_ITEMS.map(({ symbol, companyName }) => {
    const livePrice = prices.find(item => item.symbol === symbol);
    if (livePrice) return { ...livePrice, companyName };

    return {
      symbol,
      companyName,
      price: null,
      changePercent: null,
      change: null,
      source: 'Finnhub' as const,
      delayed: true as const,
      available: false,
      unavailableReason: 'price_not_fetched',
    };
  });

  return (
    <StockTickerStrip
      ariaLabel="Tech market ticker"
      items={tickerItems.map(item => ({
        symbol: item.symbol,
        name: item.companyName,
        price: item.price,
        currency: 'USD',
        changePercent: item.changePercent,
        source: item.source,
        available: item.available,
      }))}
      locale="en-US"
      unavailableLabel={labels.unavailable}
      sourceLabel={labels.sourceLabel}
      direction="ltr"
      className="tech-ticker-strip"
      viewportClassName="tech-ticker-viewport"
      trackClassName="tech-ticker-track"
      setClassName="tech-ticker-set"
      status={(
        <span className="tech-ticker-delay-badge">
          <Clock3 size={12} />
          {labels.delayedGlobal}
        </span>
      )}
      formatPrice={value => formatPrice(value)}
    />
  );
}

export default TechTickerStrip;

