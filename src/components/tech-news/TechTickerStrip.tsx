'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';

const TICKER_ORDER = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'INTC', 'AVGO'];

type TechTickerStripProps = {
  prices: TechStockPrice[];
  formatPrice: (value: number | null) => string;
};

export function TechTickerStrip({ prices, formatPrice }: TechTickerStripProps) {
  const tickerItems = TICKER_ORDER
    .map(ticker => prices.find(item => item.symbol === ticker) ?? {
      symbol: ticker,
      price: null,
      changePercent: null,
      change: null,
      source: 'Finnhub' as const,
      delayed: true as const,
    });
  const marqueeItems = [...tickerItems, ...tickerItems];

  return (
    <section className="tech-ticker-strip" aria-label="Tech market ticker">
      <div className="tech-ticker-track">
        {marqueeItems.map((item, index) => {
          const tone = item.changePercent === null || item.changePercent === 0 ? 'neutral' : item.changePercent > 0 ? 'up' : 'down';
          const Icon = tone === 'down' ? TrendingDown : TrendingUp;
          return (
            <div className="tech-ticker-item" key={`${item.symbol}-${index}`}>
              <strong>{item.symbol}</strong>
              <span>{formatPrice(item.price)}</span>
              <b className={tone}>
                <Icon size={13} />
                {item.changePercent === null ? '-' : `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`}
              </b>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default TechTickerStrip;
