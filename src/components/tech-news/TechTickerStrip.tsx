'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { TechNewsItem } from '@/lib/market/fetchTechNews';

const TICKER_ORDER = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'TSLA', 'AMD', 'AVGO'];

type TechTickerStripProps = {
  items: TechNewsItem[];
  formatPrice: (value: number | null) => string;
};

export function TechTickerStrip({ items, formatPrice }: TechTickerStripProps) {
  const tickerItems = TICKER_ORDER
    .map(ticker => items.find(item => item.ticker === ticker && item.price !== null))
    .filter((item): item is TechNewsItem => Boolean(item))
    .filter((item, index, list) => list.findIndex(match => match.ticker === item.ticker) === index);

  if (tickerItems.length === 0) return null;

  return (
    <section className="tech-ticker-strip" aria-label="Tech market ticker">
      <div className="tech-ticker-track">
        {tickerItems.map(item => {
          const tone = item.changePercent === null || item.changePercent === 0 ? 'neutral' : item.changePercent > 0 ? 'up' : 'down';
          const Icon = tone === 'down' ? TrendingDown : TrendingUp;
          return (
            <div className="tech-ticker-item" key={item.ticker}>
              <strong>{item.ticker}</strong>
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

