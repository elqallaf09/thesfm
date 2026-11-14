import type { TvLanguage } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';

/** An empty feed is different from a pending or failed request. */
export function TvNewsStatus({ language, loading = false, error, onRetry }: {
  language: TvLanguage; loading?: boolean; error?: string | null; onRetry?: () => void;
}) {
  return <p className="tv-news-status" role="status" aria-busy={loading}>
    {tvText(language, loading ? 'loading' : error ? 'error' : 'noNews')}
    {!loading && error && onRetry && <> <button onClick={onRetry}>{tvText(language, 'retry')}</button></>}
  </p>;
}
