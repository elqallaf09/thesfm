'use client';

import { ExternalLink } from 'lucide-react';
import type { GulfNewsItem } from '@/lib/gulf/parseRssFeeds';

type GulfNewsCardProps = {
  item: GulfNewsItem;
  marketLabel: string;
  labels: {
    source: string;
    published: string;
    openArticle: string;
  };
  formatDateTime: (value: string) => string;
};

export function GulfNewsCard({ item, marketLabel, labels, formatDateTime }: GulfNewsCardProps) {
  return (
    <article className="gulf-news-card">
      <div className="gulf-news-card-top">
        <span className="gulf-news-market-tag">{marketLabel}</span>
        <span>{item.source}</span>
      </div>
      <h2>{item.headline}</h2>
      <p>{item.summary || item.headline}</p>
      <div className="gulf-news-meta">
        <span>{labels.source}: {item.source}</span>
        <span>{labels.published}: {formatDateTime(item.publishedAt)}</span>
      </div>
      <a href={item.url} target="_blank" rel="noreferrer" className="gulf-news-link" aria-label={`${labels.openArticle}: ${item.headline}`}>
        {labels.openArticle}
        <ExternalLink size={15} />
      </a>
    </article>
  );
}

export default GulfNewsCard;

