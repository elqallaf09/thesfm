'use client';

import { RefreshCw } from 'lucide-react';
import { tvText, tvTime } from '@/lib/markets-tv/i18n';
import { tvSceneHasPrice, tvSceneIssue, tvSceneText } from '@/lib/markets-tv/scene-display';
import type { TvLanguage, TvQuote } from '@/lib/markets-tv/types';

/** Transport success and retained prices do not prove the source recovered. */
export function TvDataNotice({ quotes, language, retryAt, now, loading, refresh }: {
  quotes: TvQuote[]; language: TvLanguage; retryAt?: string | null; now: number;
  loading: boolean; refresh: () => void;
}) {
  const waiting = Boolean(retryAt && Date.parse(retryAt) > now);
  if (!quotes.length || !waiting && quotes.some(quote => tvSceneHasPrice(quote) && !quote.issue)) return null;
  const retained = quotes.some(tvSceneHasPrice);
  const issue = quotes[0].issue && quotes.every(quote => quote.issue === quotes[0].issue) ? tvSceneIssue(quotes[0].issue) : retained ? 'updatesUnavailable' : 'noScenePrices';
  return <div className="tv-data-notice" role="status">
    <div><strong>{tvSceneText(language, issue)}</strong>{retained && <small>{tvSceneText(language, 'retainedDuringRetry')}</small>}{waiting && <small>{tvSceneText(language, 'retryAfter')} <time dateTime={retryAt!}>{tvTime(retryAt!, language, true)}</time></small>}</div>
    <button onClick={refresh} disabled={loading || waiting} data-tv-focus-key="source-retry"><RefreshCw aria-hidden="true"/>{tvText(language, loading ? 'loading' : 'retry')}</button>
  </div>;
}
