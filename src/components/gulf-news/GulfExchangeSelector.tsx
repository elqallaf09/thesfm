'use client';

import type { GulfMarket, GulfMarketId } from '@/lib/gulf/gulfMarkets';

type GulfExchangeSelectorProps = {
  markets: GulfMarket[];
  selectedMarket: GulfMarketId;
  labels: Record<GulfMarketId, string>;
  onSelect: (market: GulfMarketId) => void;
};

export function GulfExchangeSelector({ markets, selectedMarket, labels, onSelect }: GulfExchangeSelectorProps) {
  return (
    <section className="gulf-news-exchange-grid" aria-label="Gulf markets">
      {markets.map(market => {
        const active = selectedMarket === market.id;
        return (
          <button
            key={market.id}
            type="button"
            className={active ? 'active' : ''}
            aria-pressed={active}
            onClick={() => onSelect(market.id)}
          >
            <span className="gulf-news-flag" aria-hidden="true">{market.flag}</span>
            <span>{labels[market.id]}</span>
          </button>
        );
      })}
    </section>
  );
}

export default GulfExchangeSelector;

