'use client';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { TvNewsEvidence, TvNewsThumbnail } from './TvNewsCard';
import { TvQr } from './TvQr';

export default function TvNewsDetail({ story, language, now }: { story: TvNews; language: TvLanguage; now: number }) {
  const label = tvText(language, 'openStory');
  return <div className="tv-detail"><div className="tv-news-detail"><TvNewsThumbnail imageUrl={story.imageUrl}/><h3>{story.title}</h3><TvNewsEvidence story={story} language={language} now={now}/></div><div className="tv-phone-link"><TvQr value={story.url} label={label}/><p>{label}</p></div></div>;
}
