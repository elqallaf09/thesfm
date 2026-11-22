'use client';
import { useContext, useMemo } from 'react';
import { TvTickerContext } from './tvTickerContext';
import type { TvQuote } from '@/lib/markets-tv/types';
import {
  channelTickerQuotes, GLOBAL_INDEX_TICKER, NEW_LISTINGS_MARKET_FALLBACK, NEW_LISTINGS_TICKER,
} from '@/lib/markets-tv/channelTicker';
import { tvSceneHasPrice } from '@/lib/markets-tv/scene-display';
import { tvText } from '@/lib/markets-tv/i18n';
import { TvQuoteMarquee } from './TvQuoteMarquee';
import { useTvResource } from './useTvResource';

const fallbackCaption = {
  ar: 'أسعار السوق الأمريكي · ليست إدراجات جديدة',
  en: 'US market prices · not new listings',
  fr: 'Cours américains · pas de nouvelles cotations',
} as const;
const indexCaption = {
  ar: 'مؤشرات السوق العالمية · ليست إدراجات جديدة',
  en: 'Global market indices · not new listings',
  fr: 'Indices mondiaux · pas de nouvelles cotations',
} as const;

export function TvPageTicker({ quotes, path, fallbackData, loading = false, select, paused = false }: {
  quotes?: TvQuote[]; path?: string | null; fallbackData?: unknown; loading?: boolean;
  select?: (quote: TvQuote) => void; paused?: boolean;
}) {
  const playback = useContext(TvTickerContext);
  const remote = useTvResource<unknown>(playback?.enabled && path ? path : null, 60000, '', playback?.revision);
  const primary = useMemo(() => {
    if (quotes) return quotes;
    const items = channelTickerQuotes(path ?? null, remote.data);
    return items.length || !fallbackData ? items : channelTickerQuotes(path ?? null, fallbackData);
  }, [quotes, path, remote.data, fallbackData]);

  // New-listing prices are rights- and identity-gated. Keep that safeguard,
  // but don't leave the TV empty when those quotes cannot legally be shown.
  // Fetch only when the primary request has settled, and explicitly mark the
  // independent US market prices as *not* verified newly listed securities.
  const needsFallback = Boolean(
    playback?.enabled && !quotes && path === NEW_LISTINGS_TICKER
    && !loading && !remote.loading && !primary.some(tvSceneHasPrice),
  );
  const market = useTvResource<unknown>(
    needsFallback ? NEW_LISTINGS_MARKET_FALLBACK : null, 60000, '', playback?.revision,
  );
  const marketRows = useMemo(
    () => channelTickerQuotes(NEW_LISTINGS_MARKET_FALLBACK, market.data),
    [market.data],
  );
  const usingFallback = needsFallback && marketRows.some(tvSceneHasPrice);
  // US directory availability is independent of the selected global indices.
  // A second, bounded request keeps a priced market reference visible even when
  // the exchange directory itself has no quotable first page.
  const needsIndex = needsFallback && !market.loading && !usingFallback;
  const indices = useTvResource<unknown>(
    needsIndex ? GLOBAL_INDEX_TICKER : null, 60000, '', playback?.revision,
  );
  const indexRows = useMemo(
    () => channelTickerQuotes(GLOBAL_INDEX_TICKER, indices.data),
    [indices.data],
  );
  const usingIndex = needsIndex && indexRows.some(tvSceneHasPrice);
  const rows = usingFallback ? marketRows : usingIndex ? indexRows : primary;

  if (!playback?.enabled) return null;
  if (!rows.some(tvSceneHasPrice)) return <p className="tv-channel-ticker-status" role="status">
    {tvText(playback.language, loading || remote.loading || (needsFallback && market.loading) || (needsIndex && indices.loading) ? 'loading' : 'noPrices')}
  </p>;
  return <TvQuoteMarquee {...playback} quotes={rows} paused={paused || playback.paused}
    caption={usingFallback ? fallbackCaption[playback.language] : usingIndex ? indexCaption[playback.language] : undefined}
    select={select ?? playback.select}/>;
}
