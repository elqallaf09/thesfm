'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { EUROPE_MARKETS, type EuropeMarketId } from '@/lib/europe/europeMarkets';
import type { EuropeMarketData } from '@/lib/europe/fetchEuropeDelayedMarketData';

type EuropeTickerStripProps = {
  marketLabels: Record<EuropeMarketId, string>;
  indexLabels: Record<EuropeMarketId, string>;
  unavailableLabel: string;
  marketData: Partial<Record<EuropeMarketId, EuropeMarketData>>;
  formatNumber: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
};

function changeTone(value: number | null | undefined) {
  if (!value) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

export function EuropeTickerStrip({ marketLabels, indexLabels, unavailableLabel, marketData, formatNumber, formatPercent }: EuropeTickerStripProps) {
  const tickerItems = EUROPE_MARKETS.map(market => {
    const data = marketData[market.id];
    const value = data?.value ?? null;
    const change = data?.changePercent ?? null;
    const tone = changeTone(change);
    const Icon = tone === 'down' ? TrendingDown : TrendingUp;

    return {
      market,
      value,
      change,
      tone,
      Icon,
      displayValue: value === null ? unavailableLabel : formatNumber(value),
      displayChange: change === null ? unavailableLabel : formatPercent(change),
    };
  });

  return (
    <section className="europe-ticker-strip" aria-label="European market ticker" dir="ltr">
      <div className="europe-ticker-viewport">
        <div className="europe-ticker-track">
          {[0, 1].map(copy => (
            <div className="europe-ticker-set" key={copy} aria-hidden={copy === 1}>
              {tickerItems.map(({ market, displayValue, displayChange, tone, Icon }) => (
                <div className="europe-ticker-item" key={`${copy}-${market.id}`}>
                  <strong>{market.code}</strong>
                  <span>{marketLabels[market.id]} / {indexLabels[market.id]}</span>
                  <b>{displayValue}</b>
                  <em className={tone}>
                    <Icon size={13} />
                    {displayChange}
                  </em>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default EuropeTickerStrip;
