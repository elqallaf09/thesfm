'use client';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { receiverText } from '@/lib/markets-tv/receiver';
import './news-desk.css';
import './news-board.css';

export function TvNewsDesk({ news, language, now, onStory }: { news: TvNews[]; language: TvLanguage; now: number; playing: boolean; onStory: (story: TvNews) => void }) {
  return <section className="tv-news-desk tv-news-board" aria-label={tvText(language, 'news')} data-news-count={news.length} data-news-many={news.length > 12} data-news-dense={news.length > 24}>
    <header><strong>{tvText(language, 'news')}</strong><bdi className="tv-news-total">{news.length || ''}</bdi></header>
    {news.length ? <div className="tv-headline-items tv-news-board-grid">
      {news.map(story => <button className="tv-news-board-card" key={story.id} onClick={() => onStory(story)} data-tv-focus-key={`story:${story.id}`}>
        <span className="tv-news-board-title" dir="auto">{story.title}</span>
        <small className="tv-news-evidence"><bdi>{story.source}</bdi>{story.screening && <span>{receiverText(language, story.screening)}</span>}<time dir="ltr" dateTime={story.publishedAt}>{tvQuoteTime(story.publishedAt, language, now)}</time></small>
      </button>)}
    </div> : <p role="status">{tvText(language, 'noNews')}</p>}
  </section>;
}
