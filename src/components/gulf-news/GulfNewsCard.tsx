'use client';

import { AlertTriangle, Clock3, ExternalLink, Newspaper, ShieldCheck } from 'lucide-react';
import type { GulfNewsItem } from '@/lib/gulf/parseRssFeeds';

type EvidenceLabels = {
  official: string;
  confirmed: string;
  singleSource: string;
  conflicting: string;
  unverified: string;
  confirmations: string;
  singleSourceDetail: string;
  conflictDetail: string;
  sourceReliability: string;
  whyItMatters: string;
  importance: string;
  impactTitle: string;
  impactDisclaimer: string;
  supportingSources: string;
  updated: string;
  eventLabel: (eventType: GulfNewsItem['eventType']) => string;
  impactLabel: (impact: GulfNewsItem['expectedImpact']) => string;
  sentimentLabel: (sentiment: GulfNewsItem['sentiment']) => string;
};

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
    evidence: EvidenceLabels;
  };
  formatDateTime: (value: string) => string;
};

export function GulfNewsCard({ item, marketBadge, variant = 'standard', labels, formatDateTime }: GulfNewsCardProps) {
  const displayTitle = item.title || item.headline;
  const displaySummary = item.summary || displayTitle;
  const evidence = labels.evidence;
  const independentCount = Math.max(1, item.independentSourceCount ?? 0);
  const isConflicting = item.verificationStatus === 'conflicting';
  const isOfficial = item.isOfficial || item.verificationStatus === 'official';
  const verificationLabel = isConflicting
    ? evidence.conflicting
    : isOfficial
      ? evidence.official
      : item.verificationStatus === 'confirmed'
        ? evidence.confirmed
        : item.verificationStatus === 'single_source'
          ? evidence.singleSource
          : evidence.unverified;
  const verificationDetail = isConflicting
    ? evidence.conflictDetail
    : independentCount > 1
      ? evidence.confirmations.replace('{count}', String(independentCount))
      : isOfficial
        ? verificationLabel
        : evidence.singleSourceDetail;
  const supportingSources = (item.supportingSources ?? []).filter(source => source.originalUrl !== item.url);
  const eventLabel = evidence.eventLabel(item.eventType);

  return (
    <article className={`gulf-news-card ${variant} ${isConflicting ? 'has-conflict' : isOfficial ? 'is-official' : ''}`}>
      <div className="gulf-news-card-top">
        <span className="gulf-news-market-tag">{marketBadge}</span>
        <span className={`gulf-news-translation-badge ${item.isTranslated ? 'translated' : 'original'}`}>
          {item.isTranslated ? labels.translated : labels.originalLanguage}
        </span>
      </div>
      <div className="gulf-news-card-body">
        <span className="gulf-news-card-kicker" dir="auto">
          <Newspaper size={15} />
          {item.source || labels.source}
          {typeof item.sourceReliability === 'number' ? (
            <small>{evidence.sourceReliability.replace('{score}', String(Math.round(item.sourceReliability)))}</small>
          ) : null}
        </span>
        <h2 dir="auto">{displayTitle}</h2>
        <p dir="auto">{displaySummary}</p>
      </div>
      <div className={`gulf-news-evidence ${isConflicting ? 'conflicting' : isOfficial ? 'official' : ''}`}>
        {isConflicting ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
        <div>
          <strong>{verificationLabel}</strong>
          <span>{verificationDetail}</span>
        </div>
      </div>
      {(item.symbols?.length || item.eventType || item.expectedImpact) ? (
        <div className="gulf-news-facts" aria-label={evidence.whyItMatters}>
          {item.symbols?.slice(0, 4).map(symbol => <bdi key={symbol}>{symbol}</bdi>)}
          {item.eventType ? <span>{eventLabel}</span> : null}
          {item.sentiment ? <span>{evidence.sentimentLabel(item.sentiment)}</span> : null}
          {item.expectedImpact ? <span>{evidence.impactTitle}: {evidence.impactLabel(item.expectedImpact)}</span> : null}
        </div>
      ) : null}
      <div className="gulf-news-why">
        <strong>{evidence.whyItMatters}</strong>
        <span>{eventLabel}</span>
        {typeof item.importanceScore === 'number' ? <small>{evidence.importance}: <bdi>{Math.round(item.importanceScore)}/100</bdi></small> : null}
      </div>
      {item.expectedImpact && item.expectedImpact !== 'unknown' ? (
        <small className="gulf-news-impact-disclaimer">{evidence.impactDisclaimer}</small>
      ) : null}
      {supportingSources.length > 0 ? (
        <details className="gulf-news-supporting">
          <summary>{evidence.supportingSources} ({supportingSources.length})</summary>
          <ul>
            {supportingSources.map(source => (
              <li key={`${source.sourceId}-${source.originalUrl}`}>
                <a href={source.originalUrl} target="_blank" rel="noreferrer">
                  <span dir="auto">{source.sourceName}</span>
                  {source.isOfficial ? <ShieldCheck size={13} aria-label={evidence.official} /> : <ExternalLink size={13} />}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <div className="gulf-news-meta">
        <div>
          <span title={labels.published}>
            <Clock3 size={14} />
            <bdi>{formatDateTime(item.publishedAt)}</bdi>
          </span>
          {item.updatedAt && item.updatedAt !== item.publishedAt ? (
            <span><b>{evidence.updated}</b> <bdi>{formatDateTime(item.updatedAt)}</bdi></span>
          ) : null}
        </div>
        <a className="gulf-news-read-link" href={item.url} target="_blank" rel="noreferrer" aria-label={`${labels.openArticle}: ${displayTitle}`}>
          {labels.openArticle}
          <ExternalLink size={14} />
        </a>
      </div>
    </article>
  );
}

export default GulfNewsCard;
