'use client';

import { useEffect, useRef, useState } from 'react';
import { receiverText } from '@/lib/markets-tv/receiver';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvLanguage, TvNews } from '@/lib/markets-tv/types';
import './under-dollar-headlines.css';

export function TvUnderDollarHeadlines({ stories, language, playing }: {
  stories: TvNews[]; language: TvLanguage; playing: boolean;
}) {
  const first = useRef<HTMLDivElement>(null);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const set = first.current;
    if (!set) return;
    const measure = () => setSeconds(set.getBoundingClientRect().width / 40);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(set);
    return () => observer.disconnect();
  }, []);

  return <section className="tv-under-dollar-headlines" aria-label={receiverText(language, 'underDollarNews')}>
    <strong>{tvText(language, 'news')}</strong>
    <div className="tv-headline-viewport" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {[false, true].map(copy => <div key={String(copy)} ref={copy ? undefined : first}
        className="tv-headline-loop" aria-hidden={copy || undefined}
        style={{ animationDuration: `${seconds}s`, animationPlayState: playing && seconds ? 'running' : 'paused' }}>
        {stories.map(story => <a key={story.url} href={story.url} target="_blank" rel="noopener noreferrer"
          tabIndex={copy ? -1 : 0} data-tv-focus-key={copy ? undefined : `wire:${story.id}`}>
          <bdi className="tv-headline-symbol">{story.stockSymbol}</bdi>
          <bdi>{story.title}</bdi><small dir="auto">{story.source}</small>
        </a>)}
      </div>)}
    </div>
  </section>;
}
