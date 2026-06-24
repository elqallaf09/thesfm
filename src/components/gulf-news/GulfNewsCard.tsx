'use client';

import { Clock3, ExternalLink, Newspaper } from 'lucide-react';
import type { GulfNewsItem } from '@/lib/gulf/parseRssFeeds';

type GulfNewsCardProps = {
  item: GulfNewsItem;
  marketBadge: string;
  variant?: 'featured' | 'standard' | 'compact';
  labels: {
    source: string;
    published: string;
    openArticle: string;
    translated: string;
    originalLanguage: string;
  };
  formatDateTime: (value: string) => string;
};

export function GulfNewsCard({ item, marketBadge, variant = 'standard', labels, formatDateTime }: GulfNewsCardProps) {
  const displayTitle = item.title || item.headline;
  const displaySummary = item.summary || displayTitle;

  return (
    <article className={`gulf-news-card ${variant}`}>
      <div className="gulf-news-card-top">
        <span className="gulf-news-market-tag">{marketBadge}</span>
        <span className={`gulf-news-translation-badge ${item.isTranslated ? 'translated' : 'original'}`}>
          {item.isTranslated ? labels.translated : labels.originalLanguage}
        </span>
      </div>
      <div className="gulf-news-card-body">
        <span className="gulf-news-card-kicker">
          <Newspaper size={15} />
          {item.source || labels.source}
        </span>
        <h2>{displayTitle}</h2>
        <p>{displaySummary}</p>
      </div>
      <div className="gulf-news-meta">
        <span title={labels.published}>
          <Clock3 size={14} />
          {formatDateTime(item.publishedAt)}
        </span>
        <a className="gulf-news-read-link" href={item.url} target="_blank" rel="noreferrer" aria-label={`${labels.openArticle}: ${displayTitle}`}>
          {labels.openArticle}
          <ExternalLink size={14} />
        </a>
      </div>
    </article>
  );
}

export default GulfNewsCard;
