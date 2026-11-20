'use client';
/* eslint-disable @next/next/no-img-element -- The same local art is bundled in the offline TV clients. */
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Navigation2, Pause, Play } from 'lucide-react';
import { ATLAS_INTERVAL, atlasRepresentatives, atlasStep, initialAtlasIndex, TV_ATLAS_CITIES, type TvAtlasCity, type TvAtlasRegion } from '@/lib/markets-tv/atlas';
import { tvOrigin } from '@/lib/markets-tv/client';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvGroup, TvLanguage } from '@/lib/markets-tv/types';
import './market-atlas.css';

type Props = {
  language: TvLanguage;
  group: TvGroup;
  now: number;
  suspended: boolean;
  autoRotate: boolean;
  select: (region: TvAtlasRegion) => void;
};

const subscribeZone = () => () => {};
const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const deviceZone = () => browserZone;
const serverZone = () => 'Asia/Kuwait';

export default function TvMarketMap({ language, group, now, select, suspended, autoRotate }: Props) {
  const id = useId();
  const zone = useSyncExternalStore(subscribeZone, deviceZone, serverZone);
  const initial = initialAtlasIndex(group, zone);
  const [chosen, setIndex] = useState<number | null>(null);
  const index = chosen ?? initial;
  const [playing, setPlaying] = useState(autoRotate);
  useEffect(() => {
    if (!playing || suspended) return;
    const timer = window.setInterval(() => setIndex(current => atlasStep(current ?? initial, 1)), ATLAS_INTERVAL);
    return () => window.clearInterval(timer);
  }, [playing, suspended, initial]);
  function preview(city: TvAtlasCity) {
    setPlaying(false);
    setIndex(TV_ATLAS_CITIES.findIndex(entry => entry.code === city.code));
  }
  function step(direction: -1 | 1) {
    setPlaying(false);
    setIndex(current => atlasStep(current ?? initial, direction));
  }
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
  const active = clocks[index];
  const representatives = atlasRepresentatives(clocks, active);
  const date = useMemo(() => new Intl.DateTimeFormat(`${language}-u-ca-gregory-nu-latn`, {
    timeZone: active.zone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }), [language, active.zone]);

  return <section className="tv-atlas" aria-labelledby={`${id}-title`}>
    <div className="tv-atlas-stage">
      <header className="tv-atlas-cover">
        <img data-country={active.code} src={active.code === 'kw' ? `${assets}/kuwait-atlas.webp` : `${assets}/atlas/${active.code}.jpg`} alt="" draggable={false}/>
        <div className="tv-atlas-heading">
          <span className="tv-atlas-kicker">{tvText(language, 'map')}</span>
          <h1 id={`${id}-title`}>{tvText(language, active.country)}</h1>
          <strong className="tv-atlas-landmark">{tvText(language, active.landmark)}</strong>
          {now > 0 && <time>{date.format(now)}</time>}
        </div>
      </header>
      <div className="tv-atlas-chart">
        <Navigation2 aria-hidden="true" className="tv-atlas-north" strokeWidth={1.4}/>
        <div className="tv-atlas-projection">
          <div className="tv-atlas-land" style={{
            WebkitMaskImage: `url("${assets}/world-atlas.webp")`, maskImage: `url("${assets}/world-atlas.webp")`,
          }}/>
          {clocks.map(city => {
            const labelled = representatives.includes(city);
            return <button key={city.code} type="button" data-tv-focus-key={`atlas-pin-${city.code}`} className="tv-atlas-pin" data-region={city.group} data-country={city.code}
              data-labelled={labelled} data-active={active.code === city.code} style={{ left: `${city.x}%`, top: `${city.y}%` }}
              aria-label={tvText(language, city.country)} aria-pressed={active.code === city.code} onFocus={() => preview(city)} onClick={() => preview(city)}>
              <span className="tv-atlas-dot"/>{labelled && <span className="tv-atlas-pin-name">{tvText(language, city.city)}</span>}
            </button>;
          })}
        </div>
      </div>
    </div>
    <div className="tv-atlas-clock-heading">
      <h2><Clock3 aria-hidden="true"/>{tvText(language, 'localTime')}</h2>
      <div className="tv-atlas-tour">
        <button type="button" data-tv-focus-key="atlas-prev" aria-label={tvText(language, 'previous')} onClick={() => step(-1)}>{rtl ? <ArrowRight/> : <ArrowLeft/>}</button>
        <span dir="ltr">{index + 1} / {clocks.length}</span>
        <button type="button" data-tv-focus-key="atlas-next" aria-label={tvText(language, 'next')} onClick={() => step(1)}>{rtl ? <ArrowLeft/> : <ArrowRight/>}</button>
        <button type="button" data-tv-focus-key="atlas-play" aria-label={tvText(language, playing ? 'pause' : 'resume')} onClick={() => setPlaying(value => !value)}>{playing ? <Pause/> : <Play/>}</button>
      </div>
    </div>
    <div className="tv-atlas-clocks">
      {representatives.map(place => {
        const { group: region, city, clock, weekday } = place;
        return <button type="button" key={region} id={`${id}-${region}`} data-tv-focus-key={`atlas-${region}`}
          className="tv-atlas-clock" data-active={active.group === region} data-region={region}
          onPointerEnter={event => { if (event.pointerType === 'mouse') preview(place); }}
          onFocus={() => preview(place)} onClick={() => select(region)}
          aria-labelledby={`${id}-${region}-name ${id}-${region}-city ${id}-${region}-time ${id}-${region}-day`}>
          <span className="tv-atlas-clock-place">
            <strong id={`${id}-${region}-name`}>{tvText(language, region)}</strong>
            <span id={`${id}-${region}-city`}>{tvText(language, city)}</span>
          </span>
          <Arrow aria-hidden="true"/>
          <time id={`${id}-${region}-time`} dir="ltr">{now > 0 ? clock.format(now) : '—'}</time>
          <span id={`${id}-${region}-day`} className="tv-atlas-weekday">{now > 0 ? weekday.format(now) : ''}</span>
        </button>;
      })}
    </div>
  </section>;
}
