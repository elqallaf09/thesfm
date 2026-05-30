'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { GulfMarket } from '@/lib/gulf/gulfMarkets';
import type { GulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';

type GulfMarketSummaryProps = {
  market: GulfMarket;
  marketLabel: string;
  data?: GulfMarketData;
  labels: {
    title: string;
    indexName: string;
    indexValue: string;
    dailyChange: string;
    source: string;
    unavailable: string;
    unavailableHelper: string;
    delayed: string;
  };
  formatNumber: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
};

function changeClass(value: number | null | undefined) {
  if (!value) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

export function GulfMarketSummary({ market, marketLabel, data, labels, formatNumber, formatPercent }: GulfMarketSummaryProps) {
  const value = data?.value ?? null;
  const change = data?.changePercent ?? null;
  const tone = changeClass(change);
  const ChangeIcon = tone === 'down' ? TrendingDown : TrendingUp;

  return (
    <section className="gulf-news-summary">
      <div className="gulf-news-summary-identity">
        <span className="gulf-news-summary-code">{market.code}</span>
        <div>
          <span>{labels.title}</span>
          <h2>{marketLabel}</h2>
          <p>{labels.indexName}: {market.indexName}</p>
        </div>
        <strong>{labels.delayed}</strong>
      </div>
      <div className="gulf-news-summary-market">
        <span>{labels.indexValue}</span>
        <strong>{value === null ? labels.unavailable : formatNumber(value)}</strong>
        {value === null ? (
          <p>{labels.unavailableHelper}</p>
        ) : (
          <em className={`gulf-news-change ${tone}`}>
            <ChangeIcon size={16} />
            {change === null ? labels.unavailable : formatPercent(change)}
          </em>
        )}
        <small>
          {labels.source}: {data?.source ?? labels.unavailable}
          {data?.sourceLabel ? ` / ${data.sourceLabel}` : ''}
        </small>
      </div>
    </section>
  );
}

export default GulfMarketSummary;
