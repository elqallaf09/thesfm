'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import {
  Building2, ChartNoAxesCombined, Clock3, Coins, Globe2, Landmark, LogIn, LogOut, Map, Monitor, Newspaper,
  Rows3, Settings2, SlidersHorizontal, Star, Tv, WalletCards, Wrench, X,
  type LucideIcon,
} from 'lucide-react';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvText } from '@/lib/markets-tv/i18n';
import { receiverText } from '@/lib/markets-tv/receiver';
import { tvSceneText } from '@/lib/markets-tv/scene-display';
import type { TvLanguage } from '@/lib/markets-tv/types';
import './side-menu.css';

export type TvSideDestination = 'hall' | 'allStocks' | 'strips' | 'world' | 'gulf' | 'assets' | 'kuwait' | 'news' | 'sessions' | 'watchlist' | 'investments' | 'brief' | 'map';

type Props = {
  language: TvLanguage;
  open: boolean;
  active?: TvSideDestination;
  paired: boolean;
  deviceName?: string;
  onClose: () => void;
  onNavigate: (destination: TvSideDestination) => void;
  onChannels: () => void;
  onCustomize: () => void;
  onSettings: () => void;
  onAccount: () => void;
  onTools: () => void;
};

const COPY = {
  ar: { menu: 'القائمة', world: 'أسواق العالم', strips: 'أشرطة الأسعار', news: 'الأخبار', signIn: 'تسجيل الدخول', signOut: 'تسجيل الخروج', guest: 'المشاهدة العامة', account: 'الحساب مرتبط', tools: 'أدوات الشاشة' },
  en: { menu: 'Menu', world: 'World markets', strips: 'Price strips', news: 'News', signIn: 'Sign in', signOut: 'Sign out', guest: 'Public viewing', account: 'Account linked', tools: 'Screen tools' },
  fr: { menu: 'Menu', world: 'Marchés mondiaux', strips: 'Bandes de cours', news: 'Actualités', signIn: 'Se connecter', signOut: 'Se déconnecter', guest: 'Affichage public', account: 'Compte lié', tools: 'Outils de l’écran' },
} satisfies Record<TvLanguage, { menu: string; world: string; strips: string; news: string; signIn: string; signOut: string; guest: string; account: string; tools: string }>;

export const tvMenuText = (language: TvLanguage, key: keyof typeof COPY.ar) => COPY[language][key];

type MenuItem = { key: string; label: string; icon: LucideIcon; destination?: TvSideDestination; action: () => void };

export function TvSideMenu({ language, open, active, paired, deviceName, onClose, onNavigate, onChannels, onCustomize, onSettings, onAccount, onTools }: Props) {
  const panel = useRef<HTMLElement>(null);
  const copy = COPY[language];
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const route = (destination: TvSideDestination, label: string, icon: LucideIcon): MenuItem => ({
    key: `menu:${destination}`, label, icon, destination, action: () => onNavigate(destination),
  });
  const items: MenuItem[] = [
    route('hall', hallText(language, 'hall'), Monitor),
    route('allStocks', hallText(language, 'allStocks'), ChartNoAxesCombined),
    route('strips', copy.strips, Rows3),
    route('world', copy.world, Globe2),
    route('gulf', tvSceneText(language, 'gulf'), Landmark),
    route('assets', tvSceneText(language, 'assets'), Coins),
    route('kuwait', receiverText(language, 'kuwait'), Building2),
    route('news', copy.news, Newspaper),
    route('sessions', receiverText(language, 'sessions'), Clock3),
    route('watchlist', tvSceneText(language, 'watchlist'), Star),
    route('investments', t('investments'), WalletCards),
    route('brief', t('brief'), Newspaper),
    route('map', t('map'), Map),
    { key: 'channels', label: t('channels'), icon: Tv, action: onChannels },
    { key: 'customize', label: t('customizeMarkets'), icon: SlidersHorizontal, action: onCustomize },
    { key: 'settings', label: t('settings'), icon: Settings2, action: onSettings },
  ];
  const keys = ['menu-close', ...items.map(item => item.key), 'pair', 'more'];
  const neighbors = (key: string) => {
    const index = keys.indexOf(key);
    return { 'data-tv-nav-up': keys[Math.max(0, index - 1)], 'data-tv-nav-down': keys[Math.min(keys.length - 1, index + 1)] };
  };

  useEffect(() => {
    if (!open) return;
    const target = panel.current?.querySelector<HTMLElement>('[data-tv-initial-focus]');
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }, [open, active]);

  function leave(action: () => void) {
    // A global dialog must remember this durable handle, not a drawer row
    // which disappears when its action closes the menu in the same update.
    document.querySelector<HTMLElement>('[data-tv-focus-key="menu-toggle"]')?.focus({ preventScroll: true });
    action();
  }

  if (!open) return null;
  const AccountIcon = paired ? LogOut : LogIn;
  return <div className="tv-side-menu-backdrop" onClick={event => { if (event.target === event.currentTarget) leave(onClose); }}>
    <section ref={panel} id="tv-side-menu" className="tv-side-menu" role="dialog" aria-modal="true" aria-labelledby="tv-side-menu-title" data-tv-focus-scope dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="tv-side-menu-heading">
        <div><strong dir="ltr">SFM TV</strong><h2 id="tv-side-menu-title">{copy.menu}</h2></div>
        <button type="button" className="tv-side-menu-close" onClick={() => leave(onClose)} data-tv-focus-key="menu-close" data-tv-back {...neighbors('menu-close')}><X aria-hidden="true"/><span>{t('close')}</span></button>
      </header>
      <nav className="tv-side-menu-items" aria-label={copy.menu} style={{ '--tv-menu-rows': items.length } as CSSProperties}>
        {items.map(({ key, label, icon: Icon, destination, action }) => <button key={key} type="button" onClick={() => leave(action)} data-tv-focus-key={key} {...neighbors(key)}
          aria-current={destination && active === destination ? 'page' : undefined}
          data-tv-initial-focus={destination === (active || 'hall') ? '' : undefined}>
          <Icon aria-hidden="true"/><span>{label}</span>
        </button>)}
      </nav>
      <footer className="tv-side-menu-account">
        <p className="tv-side-menu-account-name" title={paired && deviceName ? deviceName : undefined}>{paired && deviceName ? <bdi>{deviceName}</bdi> : paired ? copy.account : copy.guest}</p>
        <button type="button" onClick={() => leave(onAccount)} data-tv-focus-key="pair" {...neighbors('pair')}><AccountIcon aria-hidden="true"/><span>{paired ? copy.signOut : copy.signIn}</span></button>
        <button type="button" onClick={() => leave(onTools)} data-tv-focus-key="more" {...neighbors('more')}><Wrench aria-hidden="true"/><span>{copy.tools}</span></button>
      </footer>
    </section>
  </div>;
}
