'use client';
import type { CSSProperties } from 'react';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { hallText } from '@/lib/markets-tv/hallText';
import { TvNewsStatus } from './TvNewsStatus';
import { TvNewsCard } from './TvNewsCard';

export function TvHeadlineBand({ news, language, now = Date.now(), onStory, newsLoading, newsError, onRetry }: {
  news: TvNews[]; language: TvLanguage; now?: number; paused: boolean; onStory: (story: TvNews) => void;
  newsLoading?: boolean; newsError?: string | null; onRetry?: () => void;
}) {
  return <section className="tv-headline-band tv-news-board" aria-label={hallText(language, 'news')} data-news-count={news.length} style={{ '--tv-news-rows': Math.max(1, Math.ceil(news.length / 4)) } as CSSProperties}>
    <header className="tv-headline-label tv-news-heading"><strong>{hallText(language, 'news')}</strong><bdi>{news.length || ''}</bdi></header>
    <div className="tv-news-grid" data-tv-focus-grid>{news.length
      ? news.map(story => <TvNewsCard key={story.id} story={story} language={language} now={now} onStory={onStory} hall/>)
      : <TvNewsStatus language={language} loading={newsLoading} error={newsError} onRetry={onRetry}/>}</div>
  </section>;
}
