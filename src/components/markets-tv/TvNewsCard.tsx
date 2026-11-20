'use client';
/* eslint-disable @next/next/no-img-element -- Photos and bundled artwork also render in the packaged TV WebView. */
import { useState } from 'react';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { tvOrigin } from '@/lib/markets-tv/client';
import { tvQuoteTime } from '@/lib/markets-tv/i18n';
import { tvNewsPhotoPath, tvNewsPhotoUrl } from '@/lib/markets-tv/newsPhoto';
import { receiverText } from '@/lib/markets-tv/receiver';
import './news-cards.css';

export function TvNewsThumbnail({ story }: { story: TvNews }) {
  const photo = tvNewsPhotoUrl(story.imageUrl);
  return <NewsThumbnail key={JSON.stringify([story.id, photo])} photo={photo} articlePath={tvNewsPhotoPath(story.id)}/>;
}

function NewsThumbnail({ photo, articlePath }: { photo: string | null; articlePath: string | null }) {
  const [providerFailed, setProviderFailed] = useState(false);
  const [recovery, setRecovery] = useState<'pending' | 'loaded' | 'failed'>('pending');
  const [brandFailed, setBrandFailed] = useState(false);
  const packaged = typeof window !== 'undefined' && tvOrigin() !== window.location.origin;
  const fallback = `${packaged ? '.' : ''}/markets-tv/sfm-news-fallback.webp`;
  const direct = providerFailed ? null : photo;
  const recover = !direct && articlePath && recovery !== 'failed';
  const available = Boolean(direct || (recover && recovery === 'loaded'));
  return <span className="tv-news-thumbnail" data-news-image={available ? 'available' : 'fallback'} aria-hidden="true">
    {direct && <img src={direct} alt="" width="240" height="180" loading="eager" decoding="async" referrerPolicy="no-referrer" onError={() => setProviderFailed(true)}/>}
    {recover && <img src={`${packaged ? tvOrigin() : ''}${articlePath}`} alt="" width="240" height="180" decoding="async" hidden={recovery !== 'loaded'}
      referrerPolicy="no-referrer" onLoad={() => setRecovery('loaded')} onError={() => setRecovery('failed')}/>}
    {!available && (brandFailed ? <span className="tv-news-fallback-label" dir="ltr">SFM <b>NEWS</b></span>
      : <img src={fallback} alt="" width="960" height="400" loading="eager" decoding="async" onError={() => setBrandFailed(true)}/>)}
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
    <TvNewsThumbnail story={story}/>
    <span className="tv-news-title" dir="auto">{story.title}</span>
    <TvNewsEvidence story={story} language={language} now={now} compact/>
  </button>;
}
