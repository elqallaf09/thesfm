'use client';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvText, tvTime } from '@/lib/markets-tv/i18n';

export function TvHeadlineBand({ news, language, paused, onStory }: { news: TvNews[]; language: TvLanguage; paused: boolean; onStory: (story: TvNews) => void }) {
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
  const move = (step: number) => setIndex((current + step + news.length) % Math.max(1, news.length));
  return <section className="tv-headline-band" aria-label={hallText(language, 'news')} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="tv-headline-label"><strong>{hallText(language, 'news')}</strong><span dir="ltr">{news.length ? current + 1 : 0} / {news.length}</span></div>
    {story ? <button className="tv-headline-story" onClick={() => onStory(story)} data-tv-focus-key="hall-story"><span>{story.title}</span><small>{story.source} · <time dateTime={story.publishedAt}>{tvTime(story.publishedAt, language, true)}</time></small></button> : <p>{hallText(language, 'noNews')}</p>}
    <div className="tv-headline-controls"><button disabled={news.length < 2} aria-label={tvText(language, 'previous')} onClick={() => move(-1)}>{language === 'ar' ? <ChevronRight/> : <ChevronLeft/>}</button><button aria-label={hallText(language, stopped ? 'newsPlay' : 'newsPause')} aria-pressed={stopped} onClick={() => setStopped(value => !value)}>{stopped ? <Play/> : <Pause/>}</button><button disabled={news.length < 2} aria-label={tvText(language, 'next')} onClick={() => move(1)}>{language === 'ar' ? <ChevronLeft/> : <ChevronRight/>}</button></div>
  </section>;
}
