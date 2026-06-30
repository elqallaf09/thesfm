'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';
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

export function TechTickerStrip({ prices, formatPrice, direction, labels }: TechTickerStripProps) {
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
    <MarketTickerStrip
      ariaLabel="Tech market ticker"
      direction={direction}
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
        const hasQuote = item.available && item.price !== null && item.changePercent !== null;
        const tone = !hasQuote || item.changePercent === 0 ? 'neutral' : item.changePercent > 0 ? 'up' : 'down';
        const Icon = tone === 'down' ? TrendingDown : TrendingUp;
        const symbolLabel = item.companyName || item.symbol;
        const providerLabel = item.available ? `${labels.sourceLabel}: ${item.source}` : labels.unavailable;

        return (
          <div className={`tech-ticker-item ${tone}`} key={item.symbol}>
            <div className="tech-ticker-identity">
              <AssetIdentity
                variant="badge"
                symbol={item.symbol}
                companyName={symbolLabel}
                assetType="stock"
                size="xs"
                showName
              />
              <div>
                <small>
                  {providerLabel}
                </small>
                <strong dir="ltr">{item.symbol}</strong>
              </div>
            </div>
            <span className="tech-ticker-price" dir="ltr">
              {item.price === null ? labels.unavailable : formatPrice(item.price)}
            </span>
            {hasQuote ? (
              <b className={`tech-ticker-change ${tone}`}>
                <Icon size={11} />
                <span dir="ltr">{`${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`}</span>
              </b>
            ) : (
              <b className="tech-ticker-change neutral">{labels.unavailable}</b>
            )}
          </div>
        );
      })}
    </MarketTickerStrip>
  );
}

export default TechTickerStrip;

