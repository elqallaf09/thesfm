import { tvQuoteTime, tvText, tvTime } from '@/lib/markets-tv/i18n';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { tvSceneHasPrice, tvSceneIssue, tvSceneText } from '@/lib/markets-tv/scene-display';
import type { TvLanguage, TvQuote } from '@/lib/markets-tv/types';

export function TvQuoteEvidence({ quote, language, now, compact = false, className = '' }: {
  quote: TvQuote; language: TvLanguage; now: number; compact?: boolean; className?: string;
}) {
  const status = tvSceneHasPrice(quote) ? quoteStatus(quote, now) : 'unavailable';
  const label = status === 'unavailable' ? tvSceneText(language, tvSceneIssue(quote.issue))
    : status === 'available' ? tvSceneText(language, 'latestQuote') : tvText(language, status);
  return <span className={`tv-quote-evidence ${compact ? 'tv-evidence-inline' : 'tv-evidence-stacked tv-scene-evidence'} ${className}`} data-status={status} dir={language === 'ar' ? 'rtl' : 'ltr'}>
    <span className="tv-evidence-origin">{status !== 'unavailable' && <bdi className="tv-scene-source">{quote.source}</bdi>}<span className="tv-status" data-status={status}>{label}</span></span>
    {status !== 'unavailable' && <time dateTime={quote.observedAt || undefined} dir="ltr" title={tvTime(quote.observedAt, language, true)}>{tvQuoteTime(quote.observedAt, language, now)}</time>}
  </span>;
}
