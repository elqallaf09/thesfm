'use client';
/* eslint-disable @next/next/no-img-element -- Provider photos also render in the packaged TV WebView. */
import { useState } from 'react';
import { Newspaper } from 'lucide-react';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { tvQuoteTime } from '@/lib/markets-tv/i18n';
import { safeTvUrl } from '@/lib/markets-tv/quotes';
import { receiverText } from '@/lib/markets-tv/receiver';
import './news-cards.css';

export function TvNewsThumbnail({ imageUrl }: { imageUrl?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = imageUrl ? safeTvUrl(imageUrl) : null;
  const available = Boolean(url && url !== failed);
  return <span className="tv-news-thumbnail" data-news-image={available ? 'available' : 'fallback'} aria-hidden="true">
    {available ? <img src={url!} alt="" width="240" height="180" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(url)}/>
      : <Newspaper aria-hidden="true"/>}
  </span>;
}

const SCREENING_LABELS = {
  ar: { compliant: 'متوافق', needs_review: 'يحتاج مراجعة', non_compliant: 'غير متوافق', unclassified: 'غير مصنّف' },
  en: { compliant: 'Compliant', needs_review: 'Review needed', non_compliant: 'Non-compliant', unclassified: 'Unclassified' },
  fr: { compliant: 'Conforme', needs_review: 'À vérifier', non_compliant: 'Non conforme', unclassified: 'Non classé' },
};
export function TvNewsEvidence({ story, language, now, compact = false }: { story: TvNews; language: TvLanguage; now: number; compact?: boolean }) {
  const label = tvQuoteTime(story.publishedAt, language, now), [date, clock] = label.split(' · ');
  return <small className="tv-news-evidence" data-dated={clock ? 'true' : undefined}>
    <bdi title={story.source}>{story.source}</bdi>
    <time dir="ltr" dateTime={story.publishedAt} aria-label={label}>{clock ? <><span>{clock}</span><span>{date}</span></> : label}</time>
    {story.screening && <span className="tv-news-screening" title={receiverText(language, story.screening)}>{compact ? SCREENING_LABELS[language][story.screening] : receiverText(language, story.screening)}</span>}
  </small>;
}

export function TvNewsCard({ story, language, now, onStory, hall = false }: {
  story: TvNews; language: TvLanguage; now: number; onStory: (story: TvNews) => void; hall?: boolean;
}) {
  return <button className={`tv-news-card${hall ? ' tv-headline-story' : ''}`} onClick={() => onStory(story)}
    data-tv-focus-key={`${hall ? 'hall-story' : 'story'}:${story.id}`} title={story.title} data-news-screened={Boolean(story.screening)}>
    <TvNewsThumbnail imageUrl={story.imageUrl}/>
    <span className="tv-news-title" dir="auto">{story.title}</span>
    <TvNewsEvidence story={story} language={language} now={now} compact/>
  </button>;
}
