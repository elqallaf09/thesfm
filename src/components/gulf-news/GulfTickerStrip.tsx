'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';
import { GULF_MARKETS, type GulfMarketId } from '@/lib/gulf/gulfMarkets';
import type { GulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';

type GulfTickerStripProps = {
  labels: Record<GulfMarketId, string>;
  unavailableLabel: string;
  marketData: Partial<Record<GulfMarketId, GulfMarketData>>;
  formatNumber: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
  direction?: 'ltr' | 'rtl';
};

function changeTone(value: number | null | undefined) {
  if (!value) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

export function GulfTickerStrip({ labels, unavailableLabel, marketData, formatNumber, formatPercent, direction }: GulfTickerStripProps) {
  const tickerItems = GULF_MARKETS.map(market => {
    const data = marketData[market.id];
    const value = data?.value ?? null;
    const change = data?.changePercent ?? null;
    const tone = changeTone(change);
    const indexName = data?.indexName ?? market.indexName;
    const Icon = tone === 'down' ? TrendingDown : TrendingUp;

    return {
      market,
      value,
      change,
      tone,
      Icon,
      indexName,
      displayValue: value === null ? unavailableLabel : formatNumber(value),
      displayChange: change === null ? unavailableLabel : formatPercent(change),
    };
  });

  return (
    <MarketTickerStrip
      ariaLabel="GCC market ticker"
      className="gulf-ticker-strip"
      viewportClassName="gulf-ticker-viewport"
      trackClassName="gulf-ticker-track"
      setClassName="gulf-ticker-set"
      direction={direction}
    >
      {tickerItems.map(({ market, indexName, displayValue, displayChange, tone, Icon }) => (
        <div className="gulf-ticker-item" key={market.id}>
          <AssetIdentity variant="badge" symbol={market.code} name={indexName} assetType="index" size="sm" showName={false} />
          <span>{labels[market.id]} / {indexName}</span>
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

export default GulfTickerStrip;

