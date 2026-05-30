'use client';

import { Clock3, ExternalLink } from 'lucide-react';
import type { EuropeNewsItem } from '@/lib/europe/parseEuropeRssFeeds';

type EuropeNewsCardProps = {
  item: EuropeNewsItem;
  marketBadge: string;
  labels: {
    source: string;
    openArticle: string;
    translated: string;
    originalLanguage: string;
  };
  formatDateTime: (value: string) => string;
};

export function EuropeNewsCard({ item, marketBadge, labels, formatDateTime }: EuropeNewsCardProps) {
  const displayTitle = item.title || item.headline;
  const displaySummary = item.summary || displayTitle;

  return (
    <article className="europe-news-card">
      <div className="europe-news-card-top">
        <span className="europe-news-market-tag">{marketBadge}</span>
        <span className={`europe-news-translation-badge ${item.isTranslated ? 'translated' : 'original'}`}>
          {item.isTranslated ? labels.translated : labels.originalLanguage}
        </span>
      </div>
      <h2>{displayTitle}</h2>
      <p>{displaySummary}</p>
      <div className="europe-news-meta">
        <a href={item.url} target="_blank" rel="noreferrer" aria-label={`${labels.openArticle}: ${displayTitle}`}>
          {item.source || labels.source}
          <ExternalLink size={14} />
        </a>
        <span>
          <Clock3 size={14} />
          {formatDateTime(item.publishedAt)}
        </span>
      </div>
    </article>
  );
}

export default EuropeNewsCard;
