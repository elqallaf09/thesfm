'use client';

import { FileText, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import type { GulfNewsItem } from '@/lib/gulf/parseRssFeeds';
import type { GulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';
import { buildGulfDailyMarketBrief } from '@/lib/gulf/dailyMarketBrief';

type GulfDailyMarketBriefProps = {
  marketLabel: string;
  marketData?: GulfMarketData;
  stories: GulfNewsItem[];
  formatNumber: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
  labels: {
    title: string;
    subtitle: string;
    index: (market: string, value: string, movement: string) => string;
    movementUp: (value: string) => string;
    movementDown: (value: string) => string;
    movementFlat: string;
    unavailable: string;
    news: (total: number, official: number) => string;
    noNews: string;
    latest: (title: string) => string;
    source: (source: string) => string;
    disclaimer: string;
  };
};

export function GulfDailyMarketBrief({ marketLabel, marketData, stories, formatNumber, formatPercent, labels }: GulfDailyMarketBriefProps) {
  const brief = useMemo(() => buildGulfDailyMarketBrief(marketData, stories), [marketData, stories]);
  const movement = brief.direction === 'up'
    ? labels.movementUp(formatPercent(brief.changePercent))
    : brief.direction === 'down'
      ? labels.movementDown(formatPercent(brief.changePercent))
      : brief.direction === 'flat'
        ? labels.movementFlat
        : labels.unavailable;
  const TrendIcon = brief.direction === 'down' ? TrendingDown : TrendingUp;
  const latestTitle = brief.latestStory?.title || brief.latestStory?.headline;

  return (
    <section className="gulf-daily-brief" aria-labelledby="gulf-daily-brief-title">
      <div className="gulf-daily-brief-heading">
        <span aria-hidden="true"><FileText size={18} /></span>
        <div>
          <h2 id="gulf-daily-brief-title">{labels.title}</h2>
          <p>{labels.subtitle}</p>
        </div>
      </div>
      <ul>
        <li>
          <TrendIcon size={16} aria-hidden="true" />
          <span>{brief.marketAvailable
            ? labels.index(marketLabel, formatNumber(brief.indexValue), movement)
            : labels.unavailable}</span>
        </li>
        <li>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{brief.recentStoryCount > 0
            ? labels.news(brief.recentStoryCount, brief.officialStoryCount)
            : labels.noNews}</span>
        </li>
        {latestTitle ? <li><FileText size={16} aria-hidden="true" /><span dir="auto">{labels.latest(latestTitle)}</span></li> : null}
        {brief.source ? <li className="gulf-daily-brief-source">{labels.source(brief.source)}</li> : null}
      </ul>
      <small>{labels.disclaimer}</small>
    </section>
  );
}

export default GulfDailyMarketBrief;
