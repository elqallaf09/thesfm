'use client';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { TvNewsCard } from './TvNewsCard';

export function TvNewsDesk({ news, language, now, onStory }: { news: TvNews[]; language: TvLanguage; now: number; playing: boolean; onStory: (story: TvNews) => void }) {
  return <section className="tv-news-desk tv-news-board" aria-label={tvText(language, 'news')} data-news-count={news.length} data-news-many={news.length > 8} data-news-dense={news.length > 16}>
    <header className="tv-news-heading"><strong>{tvText(language, 'news')}</strong><bdi>{news.length}</bdi></header>
    {news.length ? <div className="tv-headline-items tv-news-desk-grid tv-news-grid" data-tv-focus-grid>
      {news.map(story => <TvNewsCard key={story.id} story={story} language={language} now={now} onStory={onStory}/>)}
    </div> : <p role="status">{tvText(language, 'noNews')}</p>}
  </section>;
}
