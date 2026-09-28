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
    asOf: string;
    delay: string;
    delayedByMinutes: (minutes: number) => string;
    marketStatus: string;
    marketOpen: string;
    marketClosed: string;
    unavailable: string;
    unavailableHelper: string;
    delayed: string;
  };
  formatNumber: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
  formatDateTime: (value: string) => string;
};

function changeClass(value: number | null | undefined) {
  if (!value) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

function displayMarketStatus(status: string, labels: Pick<GulfMarketSummaryProps['labels'], 'marketOpen' | 'marketClosed'>) {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'open') return labels.marketOpen;
  if (normalized === 'closed') return labels.marketClosed;
  return status;
}

export function GulfMarketSummary({ market, marketLabel, data, labels, formatNumber, formatPercent, formatDateTime }: GulfMarketSummaryProps) {
  const value = data?.value ?? null;
  const change = data?.changePercent ?? null;
  const tone = changeClass(change);
  const ChangeIcon = tone === 'down' ? TrendingDown : TrendingUp;
  const source = data?.sourceLabel ?? data?.source ?? labels.unavailable;
  const sourceAsOf = data?.sourceAsOf ?? data?.marketTime ?? null;
  const sourceDelay = data?.sourceDelayMinutes ?? null;
  const sourceStatus = data?.sourceStatus?.trim() || null;

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
      </div>
      <dl className="gulf-news-summary-provenance" aria-label={labels.source}>
        <div>
          <dt>{labels.source}</dt>
          <dd dir="auto">{source}</dd>
        </div>
        <div>
          <dt>{labels.asOf}</dt>
          <dd>{sourceAsOf ? formatDateTime(sourceAsOf) : labels.unavailable}</dd>
        </div>
        <div>
          <dt>{labels.delay}</dt>
          <dd>{sourceDelay === null ? labels.delayed : labels.delayedByMinutes(sourceDelay)}</dd>
        </div>
        {sourceStatus ? (
          <div>
            <dt>{labels.marketStatus}</dt>
            <dd dir="auto">{displayMarketStatus(sourceStatus, labels)}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

export default GulfMarketSummary;
