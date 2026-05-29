'use client';

import { Clock3, ExternalLink } from 'lucide-react';
import type { GulfNewsItem } from '@/lib/gulf/parseRssFeeds';

type GulfNewsCardProps = {
  item: GulfNewsItem;
  marketBadge: string;
  labels: {
    source: string;
    published: string;
    openArticle: string;
  };
  formatDateTime: (value: string) => string;
};

export function GulfNewsCard({ item, marketBadge, labels, formatDateTime }: GulfNewsCardProps) {
  return (
    <article className="gulf-news-card">
      <div className="gulf-news-card-top">
        <span className="gulf-news-market-tag">{marketBadge}</span>
      </div>
      <h2>{item.headline}</h2>
      <p>{item.summary || item.headline}</p>
      <div className="gulf-news-meta">
        <a href={item.url} target="_blank" rel="noreferrer" aria-label={`${labels.openArticle}: ${item.headline}`}>
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

export default GulfNewsCard;

