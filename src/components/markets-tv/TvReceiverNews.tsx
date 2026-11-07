'use client';
import { useMemo } from 'react';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { receiverNewsPath, receiverNewsPayload, type TvReceiverNewsChannel } from '@/lib/markets-tv/newsReceiver';
import { receiverText } from '@/lib/markets-tv/receiver';
import { tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { useTvResource } from './useTvResource';
import { TvHeadlines } from './TvSceneSidebar';

export function TvReceiverNews({ language, channel, now, revision, onStory, onRefresh, playing }: {
  language: TvLanguage; channel: TvReceiverNewsChannel; now: number; revision: number; playing: boolean;
  onStory: (story: TvNews) => void; onRefresh: () => void;
}) {
  // Only the selected feed is fetched. Changing channels cancels its subscription.
  const news = useTvResource<unknown>(receiverNewsPath(channel, language), 180000, '', revision);
  const feed = useMemo(() => receiverNewsPayload(news.data, channel), [news.data, channel]);
  return <aside className="tv-receiver-news" aria-busy={news.loading}>
    {news.loading && !news.data ? <p role="status">{tvText(language, 'loading')}</p> : <>
      {(news.error || feed.invalid) && <p role="status">{tvText(language, 'error')} <button onClick={onRefresh}>{tvText(language, 'retry')}</button></p>}
      <p className="tv-receiver-notice">
        {tvText(language, 'available')}: {feed.updatedAt ? <time dateTime={feed.updatedAt}>{tvQuoteTime(feed.updatedAt, language, now)}</time> : '—'}
        {feed.partial && ` · ${receiverText(language, 'partial')}`}{feed.stored && ` · ${receiverText(language, 'stored')}`}
      </p>
      <TvHeadlines news={feed.stories} language={language} now={now} onStory={onStory} playing={playing}/>
    </>}
  </aside>;
}
