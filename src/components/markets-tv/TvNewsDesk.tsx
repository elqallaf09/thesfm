'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { TvNewsStatus } from './TvNewsStatus';
import { TvNewsCard } from './TvNewsCard';
import { useTvNewsLayout } from './useTvNewsLayout';
import { useTvBroadcastPage } from './useTvBroadcastPage';
import './news-pages.css';

export function TvNewsDesk({ news, language, now, onStory, playing, onPaginationAvailable }: {
  news: TvNews[]; language: TvLanguage; now: number; playing: boolean;
  onStory: (story: TvNews) => void; onPaginationAvailable?: (available: boolean) => void;
}) {
  const { ref, columns, rows, count } = useTvNewsLayout();
  const [focused, setFocused] = useState(false);
  const pages = Math.max(1, Math.ceil(news.length / count));
  const { current, move } = useTvBroadcastPage(pages, playing && !focused);
  const start = current * count, visible = news.slice(start, start + count);
  useEffect(() => { onPaginationAvailable?.(pages > 1); }, [pages, onPaginationAvailable]);
  const previous = tvText(language, 'previous'), next = tvText(language, 'next');
  return <section className="tv-news-desk tv-news-board" aria-label={tvText(language, 'news')} data-news-count={news.length}
    data-news-page-size={count} data-news-page={current + 1} data-tv-page-fit
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    {news.length ? <>
      <div ref={ref} className="tv-headline-items tv-news-desk-grid tv-news-grid" data-tv-focus-grid
        style={{ '--tv-news-columns': columns, '--tv-news-page-rows': rows } as CSSProperties}>
        {visible.map(story => <TvNewsCard key={story.id} story={story} language={language} now={now} onStory={onStory}/>)}
      </div>
      <nav className="tv-broadcast-pager tv-news-pager" aria-label={tvText(language, 'newsPages')}>
        <button data-tv-focus-key="news-previous" disabled={pages < 2} onClick={() => move((current + pages - 1) % pages)}>
          {language === 'ar' ? <ChevronRight aria-hidden="true"/> : <ChevronLeft aria-hidden="true"/>}{previous}
        </button>
        <span aria-live="polite" aria-atomic="true">{tvText(language, 'batchRange')} <bdi>{start + 1}–{Math.min(start + count, news.length)} / {news.length}</bdi>
          <small>{tvText(language, 'newsPage')} <bdi>{current + 1} / {pages}</bdi></small></span>
        <button data-tv-focus-key="news-next" disabled={pages < 2} onClick={() => move((current + 1) % pages)}>
          {next}{language === 'ar' ? <ChevronLeft aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}
        </button>
      </nav>
    </> : <TvNewsStatus language={language}/>}
  </section>;
}
