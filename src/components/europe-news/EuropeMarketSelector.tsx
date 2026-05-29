'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { EuropeMarket, EuropeMarketId } from '@/lib/europe/europeMarkets';
import type { EuropeMarketData } from '@/lib/europe/fetchEuropeDelayedMarketData';

type EuropeMarketSelectorProps = {
  markets: EuropeMarket[];
  selectedMarket: EuropeMarketId;
  marketLabels: Record<EuropeMarketId, string>;
  indexLabels: Record<EuropeMarketId, string>;
  unavailableLabel: string;
  marketData: Partial<Record<EuropeMarketId, EuropeMarketData>>;
  formatPercent: (value: number | null) => string;
  onSelect: (market: EuropeMarketId) => void;
};

function changeTone(value: number | null | undefined) {
  if (!value) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

export function EuropeMarketSelector({
  markets,
  selectedMarket,
  marketLabels,
  indexLabels,
  unavailableLabel,
  marketData,
  formatPercent,
  onSelect,
}: EuropeMarketSelectorProps) {
  return (
    <section className="europe-news-market-grid" aria-label="European markets">
      {markets.map(market => {
        const active = selectedMarket === market.id;
        const change = marketData[market.id]?.changePercent ?? null;
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
            <span className="europe-news-market-code">{market.flag} {market.code}</span>
            <span className="europe-news-market-name">{marketLabels[market.id]}</span>
            <span className="europe-news-market-index">{indexLabels[market.id]}</span>
            <span className={`europe-news-market-change ${tone}`}>
              <Icon size={14} />
              {change === null ? unavailableLabel : formatPercent(change)}
            </span>
          </button>
        );
      })}
    </section>
  );
}

export default EuropeMarketSelector;
