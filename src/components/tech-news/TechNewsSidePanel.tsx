'use client';

import { BarChart3, Clock3, ExternalLink, Newspaper, ShieldCheck, TrendingUp } from 'lucide-react';
import type { TechNewsItem } from '@/lib/market/fetchTechNews';
import type { MentionedTicker, SourceCount } from '@/lib/tech-news/newsProcessing';

type TechNewsSidePanelProps = {
  latestItems: TechNewsItem[];
  mentionedTickers: MentionedTicker[];
  sourceCounts: SourceCount[];
  labels: {
    latest: string;
    mentioned: string;
    sources: string;
    articles: string;
    mentions: string;
    source: string;
    sourceTransparency: string;
    sourceTransparencyText: string;
  };
  formatDateTime: (value: string) => string;
};

export function TechNewsSidePanel({
  latestItems,
  mentionedTickers,
  sourceCounts,
  labels,
  formatDateTime,
}: TechNewsSidePanelProps) {
  return (
    <aside className="tech-news-side-panel">
      <details className="tech-side-card" open>
        <summary><Newspaper size={16} />{labels.latest}</summary>
        <div className="tech-side-list">
          {latestItems.map(item => {
            const itemTitle = item.title || item.headline;
            const content = (
              <>
                <span className="tech-side-source">{item.source || labels.source}</span>
                <strong>{itemTitle}</strong>
                <small><Clock3 size={12} />{formatDateTime(item.publishedAt)}</small>
              </>
            );
            return item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" key={`latest-${item.id}`} aria-label={`${labels.latest}: ${itemTitle}`}>
                {content}
              </a>
            ) : (
              <span className="tech-side-news-item unavailable" key={`latest-${item.id}`}>
                {content}
              </span>
            );
          })}
        </div>
      </details>

      {mentionedTickers.length > 0 ? (
        <details className="tech-side-card" open>
          <summary><TrendingUp size={16} />{labels.mentioned}</summary>
          <ol className="tech-side-ranked-list">
            {mentionedTickers.map((item, index) => (
              <li key={item.ticker}>
                <span className="tech-side-rank">{index + 1}</span>
                <div>
                  <b dir="ltr">{item.ticker}</b>
                  <small>{item.companyName}</small>
                </div>
                <em>{item.count} {labels.mentions}</em>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {sourceCounts.length > 0 ? (
        <details className="tech-side-card" open>
          <summary><BarChart3 size={16} />{labels.sources}</summary>
          <div className="tech-side-source-list">
            {sourceCounts.map(([source, count]) => (
              <span key={source}>
                <b>{source}</b>
                <small>{count} {labels.articles}</small>
              </span>
            ))}
          </div>
        </details>
      ) : null}

      <section className="tech-side-card tech-source-note">
        <h3><ShieldCheck size={16} />{labels.sourceTransparency}</h3>
        <p>{labels.sourceTransparencyText}</p>
        <span>
          <ExternalLink size={13} />
          {labels.source}
        </span>
      </section>
    </aside>
  );
}

export default TechNewsSidePanel;
