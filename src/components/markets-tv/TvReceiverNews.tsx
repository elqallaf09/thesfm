'use client';
import { useEffect, useMemo } from 'react';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { receiverNewsPath, receiverNewsPayload, TV_EXTRA_NEWS_CHANNELS, type TvReceiverNewsChannel } from '@/lib/markets-tv/newsReceiver';
import { receiverText } from '@/lib/markets-tv/receiver';
import { tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { useTvResource } from './useTvResource';
import { TvHeadlines } from './TvSceneSidebar';
import { TvNewsDesk } from './TvNewsDesk';
import { TvNewsStatus } from './TvNewsStatus';
import { requestTvResource } from './tvResourceCache';

export function TvReceiverNews({ language, channel, now, revision, onStory, onRefresh, playing }: {
  language: TvLanguage; channel: TvReceiverNewsChannel; now: number; revision: number; playing: boolean;
  onStory: (story: TvNews) => void; onRefresh: () => void;
}) {
  // Fetch the selected feed first, then warm at most one adjacent public channel.
  const news = useTvResource<unknown>(receiverNewsPath(channel, language), 180000, '', revision);
  const feed = useMemo(() => receiverNewsPayload(news.data, channel), [news.data, channel]);
  useEffect(()=>{
    if(!news.data||news.error)return;
    const order:TvReceiverNewsChannel[]=['technology','kuwait',...TV_EXTRA_NEWS_CHANNELS];
    const next=order[(order.indexOf(channel)+1)%order.length];
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      if(document.hidden||navigator.onLine===false)return;
      void requestTvResource(receiverNewsPath(next,language),{signal:controller.signal,ttlMs:180000}).catch(()=>{});
    },2000);
    return()=>{clearTimeout(timer);controller.abort();};
  },[channel,language,news.data,news.error]);
  return <aside className="tv-receiver-news" aria-busy={news.loading}>
    {news.loading && !news.data ? <p role="status">{tvText(language, 'loading')}</p> : <>
      {(news.error || feed.invalid) && feed.stories.length > 0 && <p role="status">{tvText(language, 'error')} <button onClick={onRefresh}>{tvText(language, 'retry')}</button></p>}
      <p className="tv-receiver-notice">
        {tvText(language, 'available')}: {feed.updatedAt ? <time dateTime={feed.updatedAt}>{tvQuoteTime(feed.updatedAt, language, now)}</time> : '—'}
        {feed.partial && ` · ${receiverText(language, 'partial')}`}{feed.stored && ` · ${receiverText(language, 'stored')}`}
      </p>
      {!feed.stories.length && (news.error || feed.invalid) ? <div className="tv-headline-items"><TvNewsStatus language={language} error={news.error || 'INVALID_FEED'} onRetry={onRefresh}/></div>
        : channel === 'kuwait' ? <TvHeadlines news={feed.stories} language={language} now={now} onStory={onStory} playing={playing}/> : <TvNewsDesk news={feed.stories} language={language} now={now} onStory={onStory} playing={playing}/>}
    </>}
  </aside>;
}
