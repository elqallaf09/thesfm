'use client';
import { memo, useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { tvSceneText } from '@/lib/markets-tv/scene-display';
import { tvOrigin } from '@/lib/markets-tv/client';
import { TvBrandMark } from './TvBrandMark';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { tvMenuText } from './tvMenuCopy';

// Clock updates stay inside this leaf; quote cards never subscribe to its timer.
export const TvClock = memo(function TvClock({ language }: { language: TvLanguage }) {
  const [instant, setInstant] = useState(0);
  const formats = useMemo(() => ({
    clock: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    date: new Intl.DateTimeFormat(`${language}-u-nu-latn`, { timeZone: 'Asia/Kuwait', weekday: 'short', day: 'numeric', month: 'short' }),
  }), [language]);
  useEffect(() => {
    const update = () => { if (!document.hidden) setInstant(Date.now()); };
    update();
    const timer = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  return <div className="tv-unified-clock"><strong dir="ltr">{instant ? formats.clock.format(instant) : '—'}</strong>
    <small>{tvSceneText(language, 'kuwaitTime')}<span>{instant ? formats.date.format(instant) : '—'}</span></small></div>;
});

type Props = {
  language: TvLanguage; ready: boolean; hidden: boolean; menuOpen: boolean; openMenu: () => void;
};

export function TvHeader({ language, ready, hidden, menuOpen, openMenu }: Props) {
  return <header className="tv-unified-header tv-side-menu-header" data-controls-hidden={hidden}>
    <button className="tv-menu-toggle" data-tv-focus-key="menu-toggle" onClick={openMenu}
      aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls={menuOpen ? 'tv-side-menu' : undefined}>
      <Menu aria-hidden="true"/><span>{tvMenuText(language, 'menu')}</span>
    </button>
    <div className="tv-unified-brand"><TvBrandMark packaged={ready && tvOrigin() !== window.location.origin}/><div><strong dir="ltr">THE SFM</strong><span dir="ltr">MARKETS TV</span></div></div>
    <TvClock language={language}/>
  </header>;
}
