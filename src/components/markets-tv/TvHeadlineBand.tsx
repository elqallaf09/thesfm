'use client';
import { useEffect, useState } from 'react';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvTime } from '@/lib/markets-tv/i18n';
import { TvNewsStatus } from './TvNewsStatus';

export function TvHeadlineBand({ news, language, paused, onStory, newsLoading, newsError, onRetry }: { news: TvNews[]; language: TvLanguage; paused: boolean; onStory: (story: TvNews) => void; newsLoading?: boolean; newsError?: string | null; onRetry?: () => void }) {
  const [index, setIndex] = useState(0), [stopped, setStopped] = useState(false), [focused, setFocused] = useState(false), [reduced, setReduced] = useState(false);
  const identity = news.map(story => story.id).join('|');
  const current = news.length ? index % news.length : 0, story = news[current];
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReduced(media.matches); update(); media.addListener(update); return () => media.removeListener(update); }, []);
  useEffect(() => {
    if (paused || stopped || focused || reduced || news.length < 2) return;
    // Each complete headline gets a reading interval. Never rotate under a remote focus.
    const timer = setInterval(() => { if (!document.hidden) setIndex(value => (value + 1) % news.length); }, 12000);
    return () => clearInterval(timer);
  }, [paused, stopped, focused, reduced, news.length, identity, current]);
  return <section className="tv-headline-band" aria-label={hallText(language, 'news')} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <button className="tv-headline-label" title={hallText(language, stopped ? 'newsPlay' : 'newsPause')} aria-label={hallText(language, stopped ? 'newsPlay' : 'newsPause')} aria-pressed={stopped} onClick={() => setStopped(value => !value)}><strong>{hallText(language, 'news')}</strong><span dir="ltr">{news.length ? current + 1 : 0} / {news.length}</span></button>
    {story ? <button className="tv-headline-story" onClick={() => onStory(story)} data-tv-focus-key="hall-story"><span>{story.title}</span><small>{story.source} · <time dateTime={story.publishedAt}>{tvTime(story.publishedAt, language, true)}</time></small></button> : <TvNewsStatus language={language} loading={newsLoading} error={newsError} onRetry={onRetry}/>}
  </section>;
}
