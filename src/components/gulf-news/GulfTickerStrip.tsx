'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { GULF_MARKETS, type GulfMarketId } from '@/lib/gulf/gulfMarkets';
import type { GulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';

type GulfTickerStripProps = {
  labels: Record<GulfMarketId, string>;
  unavailableLabel: string;
  marketData: Partial<Record<GulfMarketId, GulfMarketData>>;
  formatNumber: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
};

function changeTone(value: number | null | undefined) {
  if (!value) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

export function GulfTickerStrip({ labels, unavailableLabel, marketData, formatNumber, formatPercent }: GulfTickerStripProps) {
  return (
    <section className="gulf-ticker-strip" aria-label="GCC market ticker">
      <div className="gulf-ticker-track">
        {GULF_MARKETS.map(market => {
          const data = marketData[market.id];
          const value = data?.value ?? null;
          const change = data?.changePercent ?? null;
          const tone = changeTone(change);
          const Icon = tone === 'down' ? TrendingDown : TrendingUp;

          return (
            <div className="gulf-ticker-item" key={market.id}>
              <strong>{market.code}</strong>
              <span>{labels[market.id]}</span>
              <b>{value === null ? unavailableLabel : formatNumber(value)}</b>
              <em className={tone}>
                <Icon size={13} />
                {change === null ? unavailableLabel : formatPercent(change)}
              </em>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default GulfTickerStrip;

