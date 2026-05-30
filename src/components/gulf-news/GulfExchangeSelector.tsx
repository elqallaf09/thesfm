'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { GulfMarket, GulfMarketId } from '@/lib/gulf/gulfMarkets';
import type { GulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';

type GulfExchangeSelectorProps = {
  markets: GulfMarket[];
  selectedMarket: GulfMarketId;
  labels: Record<GulfMarketId, string>;
  unavailableLabel: string;
  marketData: Partial<Record<GulfMarketId, GulfMarketData>>;
  formatNumber: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
  onSelect: (market: GulfMarketId) => void;
};

function changeTone(value: number | null | undefined) {
  if (!value) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

export function GulfExchangeSelector({
  markets,
  selectedMarket,
  labels,
  unavailableLabel,
  marketData,
  formatNumber,
  formatPercent,
  onSelect,
}: GulfExchangeSelectorProps) {
  return (
    <section className="gulf-news-exchange-grid" aria-label="Gulf markets">
      {markets.map(market => {
        const active = selectedMarket === market.id;
        const data = marketData[market.id];
        const value = data?.value ?? null;
        const change = data?.changePercent ?? null;
        const tone = changeTone(change);
        const Icon = tone === 'down' ? TrendingDown : TrendingUp;

        return (
          <button
            key={market.id}
            type="button"
            className={active ? 'active' : ''}
            aria-pressed={active}
            onClick={() => onSelect(market.id)}
          >
            <span className="gulf-news-exchange-code">{market.code}</span>
            <span className="gulf-news-exchange-name">{labels[market.id]}</span>
            <strong className="gulf-news-exchange-value">{value === null ? unavailableLabel : formatNumber(value)}</strong>
            <span className={`gulf-news-exchange-change ${tone}`}>
              <Icon size={14} />
              {change === null ? unavailableLabel : formatPercent(change)}
            </span>
          </button>
        );
      })}
    </section>
  );
}

export default GulfExchangeSelector;
