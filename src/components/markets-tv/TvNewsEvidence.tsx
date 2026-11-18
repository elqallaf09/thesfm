import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import { tvQuoteTime } from '@/lib/markets-tv/i18n';
import { receiverText } from '@/lib/markets-tv/receiver';

export function TvNewsEvidence({ story, language, now }: { story: TvNews; language: TvLanguage; now: number }) {
  const label = tvQuoteTime(story.publishedAt, language, now), [date, clock] = label.split(' · ');
  return <small className="tv-news-evidence" data-dated={clock ? 'true' : undefined}>
    <bdi>{story.source}</bdi>
    <time dir={clock ? undefined : 'ltr'} dateTime={story.publishedAt} aria-label={label}>
      {clock ? <><span dir="ltr">{clock}</span><span dir="ltr">{date}</span></> : label}
    </time>
    {story.screening && <span>{receiverText(language, story.screening)}</span>}
  </small>;
}
