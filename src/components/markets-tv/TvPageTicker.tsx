'use client';
import { useContext, useMemo } from 'react';
import { TvTickerContext } from './tvTickerContext';
import type { TvQuote } from '@/lib/markets-tv/types';
import { channelTickerQuotes } from '@/lib/markets-tv/channelTicker';
import { tvSceneHasPrice } from '@/lib/markets-tv/scene-display';
import { tvText } from '@/lib/markets-tv/i18n';
import { TvQuoteMarquee } from './TvQuoteMarquee';
import { useTvResource } from './useTvResource';

export function TvPageTicker({ quotes, path, loading = false, select, paused = false }: {
  quotes?: TvQuote[]; path?: string | null; loading?: boolean;
  select?: (quote: TvQuote) => void; paused?: boolean;
}) {
  const playback = useContext(TvTickerContext);
  const remote = useTvResource<unknown>(playback?.enabled && path ? path : null, 60000, '', playback?.revision);
  const rows = useMemo(() => quotes ?? channelTickerQuotes(path ?? null, remote.data), [quotes, path, remote.data]);
  if (!playback?.enabled) return null;
  if (!rows.some(tvSceneHasPrice)) return <p className="tv-channel-ticker-status" role="status">
    {tvText(playback.language, loading || remote.loading ? 'loading' : 'noPrices')}
  </p>;
  return <TvQuoteMarquee {...playback} quotes={rows} paused={paused || playback.paused} select={select ?? playback.select}/>;
}
