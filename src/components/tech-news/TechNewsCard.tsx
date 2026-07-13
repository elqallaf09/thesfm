'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Clock3,
  ExternalLink,
  Languages,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { TechNewsItem } from '@/lib/market/fetchTechNews';

type TechNewsCardVariant = 'featured' | 'standard' | 'compact' | 'list';

type TechNewsCardProps = {
  item: TechNewsItem;
  variant?: TechNewsCardVariant;
  labels: {
    source: string;
    published: string;
    openArticle: string;
    readMore: string;
    priceUnavailable: string;
    translated: string;
    originalLanguage: string;
    linkUnavailable: string;
    showOriginal: string;
    showTranslation: string;
    automatedTranslation: string;
    stockMove: string;
    delayedQuote: string;
  };
  formatDateTime: (value: string) => string;
  formatPrice: (value: number | null) => string;
};

function changeClass(value: number | null) {
  if (value === null || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

function cleanText(value: string | null | undefined) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function hasDifferentOriginal(item: TechNewsItem) {
  const title = cleanText(item.title || item.headline).toLowerCase();
  const original = cleanText(item.titleOriginal).toLowerCase();
  return Boolean(item.isTranslated && original && original !== title);
}

function imageStyle(imageUrl: string | null | undefined) {
  const safeUrl = cleanText(imageUrl);
  if (!safeUrl || !/^https?:\/\//i.test(safeUrl)) return undefined;
  return { backgroundImage: `url("${safeUrl}")` };
}

export function TechNewsCard({
  item,
  variant = 'standard',
  labels,
  formatDateTime,
  formatPrice,
}: TechNewsCardProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const tone = changeClass(item.changePercent);
  const ChangeIcon = tone === 'down' ? TrendingDown : TrendingUp;
  const hasPrice = item.price !== null;
  const canToggleOriginal = hasDifferentOriginal(item);
  const displayTitle = cleanText(showOriginal ? item.titleOriginal : item.title || item.headline) || cleanText(item.headline);
  const displaySummary = cleanText(showOriginal ? item.summaryOriginal : item.summary) || displayTitle;
  const contentDir = showOriginal ? 'ltr' : item.isTranslated && item.translatedTo === 'ar' ? 'rtl' : 'auto';
  const hasArticleUrl = Boolean(item.url);
  const imageBackground = useMemo(() => imageStyle(item.image), [item.image]);

  return (
    <article className={`tech-news-card ${variant}`} dir={contentDir}>
      {variant === 'featured' ? (
        <div className={`tech-news-card-media ${imageBackground ? 'has-image' : ''}`} style={imageBackground}>
          <span dir="ltr">{item.ticker}</span>
        </div>
      ) : null}

      <div className="tech-news-card-body">
        <div className="tech-news-card-top">
          <div className="tech-news-card-kicker">
            <span className="tech-news-source-badge">{item.source || labels.source}</span>
            <span className="tech-news-date-meta">
              <Clock3 size={14} />
              {formatDateTime(item.publishedAt)}
            </span>
          </div>
          <div className="tech-news-symbol-chip" dir="ltr">{item.ticker}</div>
        </div>

        <div className="tech-news-title-stack">
          <h2 dir={contentDir}>{displayTitle}</h2>
          {canToggleOriginal ? (
            <button
              type="button"
              className="tech-news-translation-toggle"
              onClick={() => setShowOriginal(current => !current)}
              aria-pressed={showOriginal}
            >
              <Languages size={14} />
              {showOriginal ? labels.showTranslation : labels.showOriginal}
            </button>
          ) : (
            <span className={`tech-news-translation-badge ${item.isTranslated ? 'translated' : 'original'}`}>
              {item.isTranslated ? labels.automatedTranslation : labels.originalLanguage}
            </span>
          )}
        </div>

        <p dir={contentDir}>{displaySummary}</p>

        <div className="tech-news-context-row">
          <span>{item.companyName}</span>
          <span>{item.sector}</span>
          {item.isTranslated && canToggleOriginal ? <span>{labels.automatedTranslation}</span> : null}
        </div>

        <div className="tech-news-stock-context" aria-label={labels.stockMove}>
          <div>
            <small>{labels.stockMove}</small>
            <strong dir="ltr">{item.ticker}</strong>
          </div>
          {hasPrice ? (
            <div className="tech-news-price-stack">
              <b dir="ltr">{formatPrice(item.price)}</b>
              {item.changePercent !== null ? (
                <span className={`tech-news-change ${tone}`}>
                  <ChangeIcon size={15} />
                  <span dir="ltr">{`${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`}</span>
                </span>
              ) : null}
            </div>
          ) : (
            <div className="tech-news-price-stack unavailable">
              <b>{labels.priceUnavailable}</b>
            </div>
          )}
        </div>
      </div>

      <div className="tech-news-card-footer">
        <span className="tech-news-quote-note">{labels.delayedQuote}</span>
        {hasArticleUrl ? (
          <a
            className="tech-news-read-link"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${labels.openArticle}: ${displayTitle}`}
          >
            {labels.readMore}
            <ArrowUpRight size={15} />
          </a>
        ) : (
          <span className="tech-news-read-link disabled" aria-disabled="true">
            {labels.linkUnavailable}
            <ExternalLink size={15} />
          </span>
        )}
      </div>
    </article>
  );
}

export default TechNewsCard;
