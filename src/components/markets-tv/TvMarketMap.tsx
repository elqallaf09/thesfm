'use client';
/* eslint-disable @next/next/no-img-element -- The same local art is bundled in the offline TV clients. */
import { useId, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Navigation2 } from 'lucide-react';
import { TV_ATLAS_CITIES, type TvAtlasRegion } from '@/lib/markets-tv/atlas';
import { tvOrigin } from '@/lib/markets-tv/client';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvGroup, TvLanguage } from '@/lib/markets-tv/types';
import './market-atlas.css';

type Props = {
  language: TvLanguage;
  group: TvGroup;
  now: number;
  select: (region: TvAtlasRegion) => void;
};

export default function TvMarketMap({ language, group, now, select }: Props) {
  const id = useId();
  const [pointed, setPointed] = useState<TvAtlasRegion | null>(null);
  const [focused, setFocused] = useState<TvAtlasRegion | null>(null);
  const rtl = language === 'ar';
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const base = typeof window !== 'undefined' && tvOrigin() !== window.location.origin ? '.' : '';
  const assets = `${base}/markets-tv/assets`;
  const clocks = useMemo(() => TV_ATLAS_CITIES.map(city => ({
    ...city,
    weekday: new Intl.DateTimeFormat(language, { timeZone: city.zone, weekday: 'long' }),
    clock: new Intl.DateTimeFormat(`${language}-u-nu-latn`, {
      timeZone: city.zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }),
  })), [language]);
  const date = useMemo(() => new Intl.DateTimeFormat(`${language}-u-ca-gregory-nu-latn`, {
    timeZone: 'Asia/Kuwait', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }), [language]);
  const active = focused || pointed || group;

  return <section className="tv-atlas" aria-labelledby={`${id}-title`}>
    <div className="tv-atlas-stage">
      <header className="tv-atlas-cover">
        <img src={`${assets}/kuwait-atlas.webp`} width="1280" height="716" alt="" draggable={false}/>
        <div className="tv-atlas-heading">
          <h1 id={`${id}-title`}>{tvText(language, 'map')}</h1>
          {now > 0 && <time>{date.format(now)}</time>}
        </div>
      </header>
      <div className="tv-atlas-chart" aria-hidden="true">
        <Navigation2 className="tv-atlas-north" strokeWidth={1.4}/>
        <div className="tv-atlas-projection">
          <div className="tv-atlas-land" style={{
            WebkitMaskImage: `url("${assets}/world-atlas.webp")`, maskImage: `url("${assets}/world-atlas.webp")`,
          }}/>
          {clocks.map(({ group: region, city, x, y }) =>
            <label key={region} htmlFor={`${id}-${region}`} className="tv-atlas-pin" data-region={region}
              data-active={active === region} style={{ left: `${x}%`, top: `${y}%` }}
              onPointerEnter={() => setPointed(region)} onPointerLeave={() => setPointed(null)}>
              <span className="tv-atlas-dot"/><span className="tv-atlas-pin-name">{tvText(language, city)}</span>
            </label>)}
        </div>
      </div>
    </div>
    <div className="tv-atlas-clock-heading">
      <h2><Clock3 aria-hidden="true"/>{tvText(language, 'localTime')}</h2>
      <p>{tvText(language, 'atlasHint')}</p>
    </div>
    <div className="tv-atlas-clocks">
      {clocks.map(({ group: region, city, clock, weekday }) =>
        <button type="button" key={region} id={`${id}-${region}`} data-tv-focus-key={`atlas-${region}`}
          className="tv-atlas-clock" data-active={active === region} data-region={region}
          onPointerEnter={() => setPointed(region)} onPointerLeave={() => setPointed(null)}
          onFocus={() => setFocused(region)} onBlur={() => setFocused(null)} onClick={() => select(region)}
          aria-labelledby={`${id}-${region}-name ${id}-${region}-city ${id}-${region}-time ${id}-${region}-day`}>
          <span className="tv-atlas-clock-place">
            <strong id={`${id}-${region}-name`}>{tvText(language, region)}</strong>
            <span id={`${id}-${region}-city`}>{tvText(language, city)}</span>
          </span>
          <Arrow aria-hidden="true"/>
          <time id={`${id}-${region}-time`} dir="ltr">{now > 0 ? clock.format(now) : '—'}</time>
          <span id={`${id}-${region}-day`} className="tv-atlas-weekday">{now > 0 ? weekday.format(now) : ''}</span>
        </button>)}
    </div>
  </section>;
}
