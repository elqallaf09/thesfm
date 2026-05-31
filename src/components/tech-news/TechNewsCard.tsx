'use client';

import { Clock3, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';
import type { TechNewsItem } from '@/lib/market/fetchTechNews';

type TechNewsCardProps = {
  item: TechNewsItem;
  labels: {
    source: string;
    published: string;
    openArticle: string;
    priceUnavailable: string;
    translated: string;
    originalLanguage: string;
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
  const hasPrice = item.price !== null;
  const displayTitle = item.title || item.headline;
  const displaySummary = item.summary || displayTitle;
  const contentDir = item.isTranslated && item.translatedTo === 'ar' ? 'rtl' : item.isTranslated ? 'ltr' : 'auto';

  return (
    <article className="tech-news-card" dir={contentDir}>
      <div className="tech-news-card-top">
        <div className="tech-news-company-wrap">
          <span className="tech-news-company">{item.companyName}</span>
          <span className="tech-news-ticker">{item.ticker}</span>
          <span className={`tech-news-translation-badge ${item.isTranslated ? 'translated' : 'original'}`}>
            {item.isTranslated ? labels.translated : labels.originalLanguage}
          </span>
        </div>
        {hasPrice ? (
          <div className="tech-news-card-price">
            <strong>{formatPrice(item.price)}</strong>
            {item.changePercent !== null ? (
              <span className={`tech-news-change ${tone}`}>
                <ChangeIcon size={15} />
                {`${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="tech-news-card-price unavailable">
            <strong>{labels.priceUnavailable}</strong>
          </div>
        )}
      </div>
      <h2 dir={contentDir}>{displayTitle}</h2>
      <p dir={contentDir}>{displaySummary}</p>
      <div className="tech-news-meta">
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

export default TechNewsCard;
