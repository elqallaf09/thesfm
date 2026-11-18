'use client';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import './news-desk.css';
import { TvNewsEvidence } from './TvNewsEvidence';
import './news-board.css';

export function TvNewsDesk({ news, language, now, onStory }: { news: TvNews[]; language: TvLanguage; now: number; playing: boolean; onStory: (story: TvNews) => void }) {
  return <section className="tv-news-desk tv-news-board" aria-label={tvText(language, 'news')} data-news-count={news.length} data-news-many={news.length > 12} data-news-dense={news.length > 24}>
    <header><strong>{tvText(language, 'news')}</strong><bdi className="tv-news-total">{news.length || ''}</bdi></header>
    {news.length ? <div className="tv-headline-items tv-news-board-grid">
      {news.map(story => <button className="tv-news-board-card" key={story.id} onClick={() => onStory(story)} data-tv-focus-key={`story:${story.id}`}>
        <span className="tv-news-board-title" dir="auto">{story.title}</span>
        <TvNewsEvidence story={story} language={language} now={now}/>
      </button>)}
    </div> : <p role="status">{tvText(language, 'noNews')}</p>}
  </section>;
}
