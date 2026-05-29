'use client';

import { ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';
import type { TechNewsItem } from '@/lib/market/fetchTechNews';

type TechNewsCardProps = {
  item: TechNewsItem;
  labels: {
    source: string;
    published: string;
    openArticle: string;
    priceUnavailable: string;
  };
  formatDateTime: (value: string) => string;
  formatPrice: (value: number | null) => string;
};

function changeClass(value: number | null) {
  if (value === null || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

export function TechNewsCard({ item, labels, formatDateTime, formatPrice }: TechNewsCardProps) {
  const tone = changeClass(item.changePercent);
  const ChangeIcon = tone === 'down' ? TrendingDown : TrendingUp;
  return (
    <article className="tech-news-card">
      <div className="tech-news-card-top">
        <span className="tech-news-company">{item.companyName}</span>
        <span className="tech-news-ticker">{item.ticker}</span>
      </div>
      <h2>{item.headline}</h2>
      <p>{item.summary || item.headline}</p>
      <div className="tech-news-price-row">
        <strong>{item.price === null ? labels.priceUnavailable : formatPrice(item.price)}</strong>
        <span className={`tech-news-change ${tone}`}>
          <ChangeIcon size={15} />
          {item.changePercent === null ? '—' : `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`}
        </span>
      </div>
      <div className="tech-news-meta">
        <span>{labels.source}: {item.source}</span>
        <span>{labels.published}: {formatDateTime(item.publishedAt)}</span>
      </div>
      <a href={item.url} target="_blank" rel="noreferrer" className="tech-news-link">
        {labels.openArticle}
        <ExternalLink size={15} />
      </a>
    </article>
  );
}

export default TechNewsCard;
