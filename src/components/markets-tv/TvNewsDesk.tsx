'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { receiverText } from '@/lib/markets-tv/receiver';
import { TvBroadcastPager } from './TvBroadcastPager';
import { useTvBroadcastPage } from './useTvBroadcastPage';
import './news-desk.css';

export function TvNewsDesk({ news, language, now, playing, onStory }: { news: TvNews[]; language: TvLanguage; now: number; playing: boolean; onStory: (story: TvNews) => void }) {
  const [size, setSize] = useState(6), [focused, setFocused] = useState(false);
  useEffect(() => { const media = window.matchMedia('(max-height: 650px)'); const update = () => setSize(media.matches ? 3 : 6); update(); media.addListener(update); return () => media.removeListener(update); }, []);
  const pages = Math.max(1, Math.ceil(news.length / size));
  const { current, move } = useTvBroadcastPage(pages, playing && !focused, news.map(story => story.id).join('|'));
  const batch = news.slice(current * size, (current + 1) * size);
  const label = language === 'ar' ? 'في الواجهة' : language === 'fr' ? 'À la une' : 'In focus';
  return <section className="tv-news-desk" aria-label={tvText(language, 'news')} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <header><strong>{tvText(language, 'news')} <bdi>{news.length}</bdi></strong><TvBroadcastPager page={current} pages={pages} language={language} move={move}/></header>
    {batch.length ? <div className="tv-headline-items tv-news-desk-grid" data-solo={batch.length === 1} style={{ '--news-rows': Math.max(1, batch.length - 1) } as CSSProperties}>
      {batch.map((story, index) => <button className={index === 0 ? 'tv-news-lead' : 'tv-news-queue-item'} key={story.id} onClick={() => onStory(story)} data-tv-focus-key={`story:${story.id}`}>
        <small className="tv-news-position"><bdi>{String(current * size + index + 1).padStart(2, '0')}</bdi>{index === 0 && <span>{label}</span>}</small>
        <span className="tv-news-title" dir="auto">{story.title}</span>
        <small className="tv-news-evidence"><bdi>{story.source}</bdi>{story.screening && <span>{receiverText(language, story.screening)}</span>}<time dir="ltr" dateTime={story.publishedAt}>{tvQuoteTime(story.publishedAt, language, now)}</time></small>
        {index === 0 && <small className="tv-news-open">{tvText(language, 'openStory')} <span aria-hidden="true">↗</span></small>}
      </button>)}
    </div> : <p role="status">{tvText(language, 'noNews')}</p>}
  </section>;
}
