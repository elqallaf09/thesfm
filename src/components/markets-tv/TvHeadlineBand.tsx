'use client';
import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvTime } from '@/lib/markets-tv/i18n';
import { TvNewsStatus } from './TvNewsStatus';
import { useTvPlayback } from './useTvPlayback';
import './headline-motion.css';

export function TvHeadlineBand({ news, language, paused, onStory, newsLoading, newsError, onRetry }: { news: TvNews[]; language: TvLanguage; paused: boolean; onStory: (story: TvNews) => void; newsLoading?: boolean; newsError?: string | null; onRetry?: () => void }) {
  const [index, setIndex] = useState(0), [focused, setFocused] = useState(false);
  const playback = useTvPlayback('news');
  const stopped = paused || playback.paused;
  const identity = news.map(story => story.id).join('|');
  const current = news.length ? index % news.length : 0, story = news[current];
  useEffect(() => {
    if (stopped || focused || news.length < 2) return;
    // Hold the story while it has remote focus. The Play control itself must
    // remain focusable without immediately suspending the playback it starts.
    const timer = setInterval(() => { if (!document.hidden) setIndex(value => (value + 1) % news.length); }, 12000);
    return () => clearInterval(timer);
  }, [stopped, focused, news.length, identity]);
  return <section className="tv-headline-band" aria-label={hallText(language, 'news')} data-paused={stopped || focused}
    onFocusCapture={event => setFocused(Boolean(event.target.closest('.tv-headline-story')))}
    onBlurCapture={event => setFocused(event.relatedTarget instanceof Element && Boolean(event.relatedTarget.closest('.tv-headline-story')))}>
    <button className="tv-headline-label" title={hallText(language, stopped ? 'newsPlay' : 'newsPause')} aria-label={hallText(language, stopped ? 'newsPlay' : 'newsPause')} aria-pressed={stopped} onClick={playback.toggle}>
      <strong>{hallText(language, 'news')}</strong><span className="tv-headline-playback" dir="ltr">{stopped ? <Play aria-hidden="true"/> : <Pause aria-hidden="true"/>}<bdi>{news.length ? current + 1 : 0} / {news.length}</bdi></span>
    </button>
    {story ? <button className="tv-headline-story" onClick={() => onStory(story)} data-tv-focus-key="hall-story"><span key={story.id}>{story.title}</span><small>{story.source} · <time dateTime={story.publishedAt}>{tvTime(story.publishedAt, language, true)}</time></small></button> : <TvNewsStatus language={language} loading={newsLoading} error={newsError} onRetry={onRetry}/>}
  </section>;
}
