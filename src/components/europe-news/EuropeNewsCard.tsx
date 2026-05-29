'use client';

import { Clock3, ExternalLink } from 'lucide-react';
import type { EuropeNewsItem } from '@/lib/europe/parseEuropeRssFeeds';

type EuropeNewsCardProps = {
  item: EuropeNewsItem;
  marketBadge: string;
  labels: {
    source: string;
    openArticle: string;
  };
  formatDateTime: (value: string) => string;
};

export function EuropeNewsCard({ item, marketBadge, labels, formatDateTime }: EuropeNewsCardProps) {
  return (
    <article className="europe-news-card">
      <div className="europe-news-card-top">
        <span className="europe-news-market-tag">{marketBadge}</span>
      </div>
      <h2>{item.headline}</h2>
      <p>{item.summary || item.headline}</p>
      <div className="europe-news-meta">
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

export default EuropeNewsCard;
