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
      <div className="gulf-news-summary-head">
        <div>
          <span>{labels.title}</span>
          <h2>{market.flag} {marketLabel}</h2>
        </div>
        <strong>{labels.delayed}</strong>
      </div>
      <div className="gulf-news-summary-grid">
        <div>
          <span>{labels.indexName}</span>
          <strong>{market.indexName}</strong>
        </div>
        <div>
          <span>{labels.indexValue}</span>
          <strong>{value === null ? labels.unavailable : formatNumber(value)}</strong>
        </div>
        <div>
          <span>{labels.dailyChange}</span>
          <strong className={`gulf-news-change ${tone}`}>
            <ChangeIcon size={15} />
            {change === null ? labels.unavailable : formatPercent(change)}
          </strong>
        </div>
        <div>
          <span>{labels.source}</span>
          <strong>{data?.source ?? labels.unavailable}</strong>
        </div>
      </div>
    </section>
  );
}

export default GulfMarketSummary;

