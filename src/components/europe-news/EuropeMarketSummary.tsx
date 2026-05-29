'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { EuropeMarket } from '@/lib/europe/europeMarkets';
import type { EuropeMarketData } from '@/lib/europe/fetchEuropeDelayedMarketData';

type EuropeMarketSummaryProps = {
  market: EuropeMarket;
  marketLabel: string;
  indexLabel: string;
  data?: EuropeMarketData;
  labels: {
    indexName: string;
    dailyChange: string;
    source: string;
    unavailable: string;
    unavailableHelper: string;
    delayed: string;
  };
  formatNumber: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
};

function changeTone(value: number | null | undefined) {
  if (!value) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

export function EuropeMarketSummary({ market, marketLabel, indexLabel, data, labels, formatNumber, formatPercent }: EuropeMarketSummaryProps) {
  const value = data?.value ?? null;
  const change = data?.changePercent ?? null;
  const tone = changeTone(change);
  const Icon = tone === 'down' ? TrendingDown : TrendingUp;

  return (
    <section className="europe-news-summary">
      <div className="europe-news-summary-identity">
        <span className="europe-news-summary-code">{market.flag} {market.code}</span>
        <div>
          <span>{marketLabel}</span>
          <h2>{indexLabel}</h2>
          <p>{labels.indexName}: {market.indexName}</p>
        </div>
        <strong>{labels.delayed}</strong>
      </div>
      <div className="europe-news-summary-market">
        <span>{labels.source}: {data?.source ?? 'Yahoo Finance'}</span>
        <strong>{formatNumber(value)}</strong>
        {value === null ? (
          <p>{labels.unavailableHelper}</p>
        ) : (
          <em className={`europe-news-change ${tone}`}>
            <Icon size={14} />
            {labels.dailyChange}: {formatPercent(change)}
          </em>
        )}
        {value === null && <small>{labels.unavailable}</small>}
      </div>
    </section>
  );
}

export default EuropeMarketSummary;
