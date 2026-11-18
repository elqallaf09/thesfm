'use client';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvTime } from '@/lib/markets-tv/i18n';
import { TvNewsStatus } from './TvNewsStatus';
import './news-board.css';

export function TvHeadlineBand({ news, language, onStory, newsLoading, newsError, onRetry }: { news: TvNews[]; language: TvLanguage; paused: boolean; onStory: (story: TvNews) => void; newsLoading?: boolean; newsError?: string | null; onRetry?: () => void }) {
  return <section className="tv-headline-band tv-news-board" aria-label={hallText(language, 'news')} data-news-count={news.length}>
    <header className="tv-headline-label"><strong>{hallText(language, 'news')}</strong><bdi className="tv-news-total">{news.length || ''}</bdi></header>
    <div className="tv-news-board-grid">{news.length ? news.map(story => <button className="tv-headline-story tv-news-board-card" key={story.id} onClick={() => onStory(story)} data-tv-focus-key={`hall-story:${story.id}`}>
      <span className="tv-news-board-title" dir="auto">{story.title}</span><small className="tv-news-evidence"><bdi>{story.source}</bdi><time dir="ltr" dateTime={story.publishedAt}>{tvTime(story.publishedAt, language, true)}</time></small>
    </button>) : <TvNewsStatus language={language} loading={newsLoading} error={newsError} onRetry={onRetry}/>}</div>
  </section>;
}
