'use client';

import { Activity, Clock3, TrendingDown, TrendingUp } from 'lucide-react';
import { AssetAvatar } from '@/components/asset/AssetAvatar';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';

const TICKER_ORDER = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'INTC', 'AVGO'];

type TechTickerStripProps = {
  prices: TechStockPrice[];
  formatPrice: (value: number | null) => string;
  labels: {
    priceUnavailable: string;
    delayedGlobal: string;
    lastUpdated: string;
  };
};

export function TechTickerStrip({ prices, formatPrice, labels }: TechTickerStripProps) {
  const tickerItems = TICKER_ORDER
    .map(ticker => prices.find(item => item.symbol === ticker) ?? {
      symbol: ticker,
      price: null,
      changePercent: null,
      change: null,
      source: 'Finnhub' as const,
      delayed: true as const,
      available: false,
      unavailableReason: 'price_not_fetched',
    });

  return (
    <MarketTickerStrip
      ariaLabel="Tech market ticker"
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
    >
      {tickerItems.map(item => {
        const tone = item.changePercent === null || item.changePercent === 0 ? 'neutral' : item.changePercent > 0 ? 'up' : 'down';
        const Icon = tone === 'down' ? TrendingDown : TrendingUp;
        return (
          <div className={`tech-ticker-item ${tone}`} key={item.symbol}>
            <div className="tech-ticker-identity">
              <AssetAvatar symbol={item.symbol} assetType="stock" size="xs" decorative />
              <div>
                <strong dir="ltr">{item.symbol}</strong>
                <small>
                  <Activity size={10} />
                  {item.available ? labels.lastUpdated : labels.priceUnavailable}
                </small>
              </div>
            </div>
            <span dir="ltr">{item.price === null ? labels.priceUnavailable : formatPrice(item.price)}</span>
            {item.price !== null && item.changePercent !== null ? (
              <b className={tone}>
                <Icon size={11} />
                <span dir="ltr">{`${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`}</span>
              </b>
            ) : null}
          </div>
        );
      })}
    </MarketTickerStrip>
  );
}

export default TechTickerStrip;
