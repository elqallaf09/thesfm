'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';
import { EUROPE_MARKETS, type EuropeMarketId } from '@/lib/europe/europeMarkets';
import type { EuropeMarketData } from '@/lib/europe/fetchEuropeDelayedMarketData';

type EuropeTickerStripProps = {
  marketLabels: Record<EuropeMarketId, string>;
  indexLabels: Record<EuropeMarketId, string>;
  unavailableLabel: string;
  marketData: Partial<Record<EuropeMarketId, EuropeMarketData>>;
  formatNumber: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
  direction?: 'ltr' | 'rtl';
};

function changeTone(value: number | null | undefined) {
  if (!value) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

export function EuropeTickerStrip({ marketLabels, indexLabels, unavailableLabel, marketData, formatNumber, formatPercent, direction }: EuropeTickerStripProps) {
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
    <MarketTickerStrip
      ariaLabel="European market ticker"
      className="europe-ticker-strip"
      viewportClassName="europe-ticker-viewport"
      trackClassName="europe-ticker-track"
      setClassName="europe-ticker-set"
      direction={direction}
    >
      {tickerItems.map(({ market, displayValue, displayChange, tone, Icon }) => (
        <div className="europe-ticker-item" key={market.id}>
          <AssetIdentity variant="badge" symbol={market.code} name={indexLabels[market.id]} assetType="index" size="sm" showName={false} />
          <span>{marketLabels[market.id]} / {indexLabels[market.id]}</span>
          <b>{displayValue}</b>
          <em className={tone}>
            <Icon size={13} />
            {displayChange}
          </em>
        </div>
      ))}
    </MarketTickerStrip>
  );
}

export default EuropeTickerStrip;

