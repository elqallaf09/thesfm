'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Newspaper } from 'lucide-react';
import { dedupeNewsItems, safeExternalNewsUrl } from '@/lib/news/clientNewsUtils';
import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';

type GlobalMarketsNewsItem = {
  id?: string | null;
  title?: string | null;
  headline?: string | null;
  summary?: string | null;
  sourceName?: string | null;
  source?: string | null;
  url?: string | null;
  originalUrl?: string | null;
  publishedAt?: string | null;
};

type GlobalMarketsNewsResponse = {
  success: boolean;
  items?: GlobalMarketsNewsItem[];
};

type GlobalMarketsNewsProps = {
  lang: Lang;
  dir: 'rtl' | 'ltr';
};

function localeFor(lang: Lang) {
  return lang === 'ar' ? 'ar-SA-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
}

/**
 * The lower-area "broad market" news section required by the Global
 * Markets Hub spec. This queries the same general-purpose
 * /api/market-news aggregator used across the app with scope=general and
 * no symbol/company filters, which is a genuinely different, broader
 * result set than /api/tech-news's technology-scoped feed -- not a copy
 * of the Tech News page's content.
 */
export function GlobalMarketsNews({ lang, dir }: GlobalMarketsNewsProps) {
  const [items, setItems] = useState<GlobalMarketsNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    fetch(`/api/market-news?scope=general&lang=${encodeURIComponent(lang)}&limit=12`, { signal: controller.signal })
      .then(response => response.json() as Promise<GlobalMarketsNewsResponse>)
      .then(json => {
        if (!json.success) throw new Error('unavailable');
        setItems(json.items ?? []);
      })
      .catch(fetchError => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setItems([]);
        setError(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [lang]);

  const dedupedItems = dedupeNewsItems(
    items.map(item => ({ ...item, url: item.url ?? item.originalUrl })),
  );
  const locale = localeFor(lang);

  return (
    <section className="gm-news" aria-labelledby="gm-news-heading" dir={dir}>
      <h2 className="gm-news-heading" id="gm-news-heading">
        <Newspaper size={18} aria-hidden="true" />
        {t('global_markets_news_heading', lang)}
      </h2>

      {loading ? (
        <div className="gm-news-skeleton" role="status">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="gm-news-skeleton-card" key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="gm-news-empty" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{t('global_markets_news_error', lang)}</span>
        </div>
      ) : dedupedItems.length === 0 ? (
        <div className="gm-news-empty" role="status">
          <Newspaper size={18} aria-hidden="true" />
          <span>{t('global_markets_news_empty', lang)}</span>
        </div>
      ) : (
        <ul className="gm-news-grid">
          {dedupedItems.map((item, index) => {
            const href = safeExternalNewsUrl(item.url);
            const title = item.title || item.headline || '';
            const sourceName = item.sourceName || item.source || '';
            const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
            const publishedLabel = publishedAt && !Number.isNaN(publishedAt.getTime())
              ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(publishedAt)
              : null;

            return (
              <li className="gm-news-card" key={item.id ?? href ?? `${title}-${index}`}>
                <h3 dir="auto">{title}</h3>
                {item.summary ? <p dir="auto">{item.summary}</p> : null}
                <div className="gm-news-card-foot">
                  {sourceName ? <span className="gm-news-source" dir="auto">{sourceName}</span> : null}
                  {publishedLabel ? <span className="gm-news-date" dir="ltr">{publishedLabel}</span> : null}
                </div>
                {href ? (
                  <a className="gm-news-link" href={href} target="_blank" rel="noopener noreferrer nofollow">
                    {t('global_markets_news_open_article', lang)}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="gm-news-link is-disabled">{t('global_markets_news_link_unavailable', lang)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <style jsx>{`
        .gm-news {
          display: grid;
          gap: 12px;
        }

        .gm-news-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: var(--foreground);
          font-size: 16px;
          font-weight: 700;
        }

        .gm-news-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .gm-news-card {
          display: grid;
          align-content: start;
          gap: 6px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
          box-shadow: var(--shadow-card);
        }

        .gm-news-card h3 {
          margin: 0;
          color: var(--foreground);
          font-size: 14px;
          font-weight: 700;
          line-height: 1.35;
        }

        .gm-news-card p {
          margin: 0;
          color: var(--foreground-muted);
          font-size: 12.5px;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .gm-news-card-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: var(--foreground-muted);
          font-size: 11.5px;
          font-weight: 500;
        }

        .gm-news-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
          color: var(--accent);
          font-size: 12.5px;
          font-weight: 600;
          text-decoration: none;
        }

        .gm-news-link:hover {
          text-decoration: underline;
        }

        .gm-news-link.is-disabled {
          color: var(--foreground-muted);
          cursor: not-allowed;
        }

        .gm-news-skeleton {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
        }

        .gm-news-skeleton-card {
          min-height: 128px;
          border-radius: var(--radius-card);
          background: var(--surface-muted);
          animation: gm-news-pulse 1.4s ease-in-out infinite;
        }

        @keyframes gm-news-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .gm-news-empty {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px;
          border: 1px dashed var(--border-strong);
          border-radius: var(--radius-card);
          background: var(--surface-muted);
          color: var(--foreground-muted);
          font-size: 13px;
          font-weight: 500;
        }

        @media (prefers-reduced-motion: reduce) {
          .gm-news-skeleton-card {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

export default GlobalMarketsNews;
