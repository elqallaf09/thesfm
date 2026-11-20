'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Building2, ListTree, ImageIcon, ChartNoAxesCombined, Clock3, Coins, Globe2, Landmark, LogIn, LogOut, Map, Monitor, Newspaper,
  Rows3, Settings2, SlidersHorizontal, Star, Tv, UserRound, WalletCards, Wrench, X,
  type LucideIcon,
} from 'lucide-react';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvText } from '@/lib/markets-tv/i18n';
import { receiverText, TV_RECEIVER_CHANNELS, type TvReceiverChannel } from '@/lib/markets-tv/receiver';
import type { TvChannel } from '@/lib/markets-tv/channels';
import { tvSceneText } from '@/lib/markets-tv/scene-display';
import type { TvLanguage } from '@/lib/markets-tv/types';
import './side-menu.css';

export type TvSideDestination = 'hall' | 'allStocks' | 'strips' | 'world' | 'gulf' | 'assets' | 'kuwait' | 'news' | 'sessions' | 'watchlist' | 'investments' | 'brief' | 'map';

type Props = {
  language: TvLanguage;
  open: boolean;
  active?: TvSideDestination;
  activeBroadcast?: TvReceiverChannel;
  paired: boolean;
  deviceName?: string;
  onClose: () => void;
  onNavigate: (destination: TvSideDestination) => void;
  channels: TvChannel[];
  onBroadcast: (channel: TvReceiverChannel) => void;
  onSavedChannel: (channel: TvChannel) => void;
  onCustomize: () => void;
  onWallpapers: () => void;
  onSettings: () => void;
  onMyAccount: () => void;
  onAccount: () => void;
  onSwitchAccount: () => void;
  onTools: () => void;
};

const COPY = {
  ar: { sections: 'الأقسام', wallpapers: 'خلفية الشاشة', overview: 'نظرة عامة', markets: 'الأسواق', broadcasts: 'الأخبار والقنوات', library: 'مكتبتي', display: 'إعدادات العرض', accountHeading: 'الحساب', back: 'رجوع', menu: 'القائمة', world: 'أسواق العالم', strips: 'أشرطة الأسعار', news: 'الأخبار', signIn: 'تسجيل الدخول', signOut: 'تسجيل الخروج', guest: 'المشاهدة العامة', account: 'الحساب مرتبط', myAccount: 'حسابي', tools: 'أدوات الشاشة' },
  en: { sections: 'Sections', wallpapers: 'Wallpaper', overview: 'Overview', markets: 'Markets', broadcasts: 'News and channels', library: 'My library', display: 'Display settings', accountHeading: 'Account', back: 'Back', menu: 'Menu', world: 'World markets', strips: 'Price strips', news: 'News', signIn: 'Sign in', signOut: 'Sign out', guest: 'Public viewing', account: 'Account linked', myAccount: 'My account', tools: 'Screen tools' },
  fr: { sections: 'Rubriques', wallpapers: 'Fond d’écran', overview: 'Vue d’ensemble', markets: 'Marchés', broadcasts: 'Actualités et chaînes', library: 'Ma bibliothèque', display: 'Réglages d’affichage', accountHeading: 'Compte', back: 'Retour', menu: 'Menu', world: 'Marchés mondiaux', strips: 'Bandes de cours', news: 'Actualités', signIn: 'Se connecter', signOut: 'Se déconnecter', guest: 'Affichage public', account: 'Compte lié', myAccount: 'Mon compte', tools: 'Outils de l’écran' },
} satisfies Record<TvLanguage, Record<string, string>>;

export const tvMenuText = (language: TvLanguage, key: keyof typeof COPY.ar) => COPY[language][key];

type MenuItem = { key: string; label: string; icon: LucideIcon; destination?: TvSideDestination; action: () => void };

export function TvSideMenu({ language, open, active, activeBroadcast, paired, deviceName, onClose, onNavigate, channels, onBroadcast, onSavedChannel, onCustomize, onWallpapers, onSettings, onMyAccount, onAccount, onSwitchAccount, onTools }: Props) {
  const panel = useRef<HTMLElement>(null);
  const [showSections, setShowSections] = useState(false);
  const jumpTarget = useRef<string | null>(null);
  const copy = COPY[language];
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const route = (destination: TvSideDestination, label: string, icon: LucideIcon): MenuItem => ({
    key: `menu:${destination}`, label, icon, destination, action: () => onNavigate(destination),
  });
  const sections: { id: string; label: string; icon: LucideIcon; items: MenuItem[] }[] = [
    { id: 'overview', label: copy.overview, icon: Monitor, items: [
      route('hall', hallText(language, 'hall'), Monitor), route('brief', t('brief'), Newspaper),
      route('map', t('map'), Map), route('sessions', receiverText(language, 'sessions'), Clock3),
    ] },
    { id: 'markets', label: copy.markets, icon: ChartNoAxesCombined, items: [
      route('allStocks', hallText(language, 'allStocks'), ChartNoAxesCombined), route('kuwait', receiverText(language, 'kuwait'), Building2),
      route('gulf', tvSceneText(language, 'gulf'), Landmark), route('world', copy.world, Globe2),
      route('assets', tvSceneText(language, 'assets'), Coins), route('strips', copy.strips, Rows3),
    ] },
    { id: 'news', label: copy.broadcasts, icon: Newspaper, items: [
      route('news', copy.news, Newspaper),
      ...TV_RECEIVER_CHANNELS.filter(channel => !['allStocks', 'kuwait', 'sessions', 'investments'].includes(channel))
        .map(channel => ({ key: `broadcast:${channel}`, label: receiverText(language, channel), icon: Tv, action: () => onBroadcast(channel) })),
    ] },
    { id: 'personal', label: copy.library, icon: Star, items: [
      route('watchlist', tvSceneText(language, 'watchlist'), Star), route('investments', t('investments'), WalletCards),
      ...channels.map(channel => ({ key: `saved:${channel.id}`, label: channel.name, icon: Tv, action: () => onSavedChannel(channel) })),
    ] },
    { id: 'display', label: copy.display, icon: Settings2, items: [
      { key: 'customize', label: t('customizeMarkets'), icon: SlidersHorizontal, action: onCustomize },
      { key: 'settings', label: t('settings'), icon: Settings2, action: onSettings },
    ] },
  ];
  const items = sections.flatMap(section => section.items);
  const accountKeys = ['my-account', 'switch-account', 'pair', 'more'];
  const keys = showSections ? ['menu-close', ...sections.map(section => `jump:${section.id}`), 'jump:account']
    : ['menu-close', 'sections', 'wallpapers', ...items.map(item => item.key), ...accountKeys];
  const selectedKey = activeBroadcast && items.some(item => item.key === `broadcast:${activeBroadcast}`) ? `broadcast:${activeBroadcast}` : `menu:${active || 'hall'}`;
  const neighbors = (key: string) => {
    const index = keys.indexOf(key);
    const pairedRow = [['sections', 'wallpapers'], accountKeys.slice(0, 2), accountKeys.slice(2)].find(row => row.includes(key));
    const rtl = language === 'ar';
    return {
      'data-tv-nav-up': keys[Math.max(0, index - 1)], 'data-tv-nav-down': keys[Math.min(keys.length - 1, index + 1)],
      'data-tv-nav-left': pairedRow?.[pairedRow.indexOf(key) + (rtl ? 1 : -1)],
      'data-tv-nav-right': pairedRow?.[pairedRow.indexOf(key) + (rtl ? -1 : 1)],
    };
  };

  useEffect(() => {
    if (!open) return;
    const pending = jumpTarget.current;
    jumpTarget.current = null;
    const target = (pending && panel.current?.querySelector<HTMLElement>(`[data-tv-focus-key="${pending}"]`))
      || panel.current?.querySelector<HTMLElement>('[data-tv-initial-focus]');
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }, [open, active, activeBroadcast, showSections]);

  useEffect(() => {
    if (!open) return;
    const list = panel.current?.querySelector<HTMLElement>('.tv-side-menu-items');
    const revealFocused = () => {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && list?.contains(focused)) {
        focused.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      }
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(revealFocused);
    if (list) observer?.observe(list);
    window.addEventListener('resize', revealFocused);
    return () => { observer?.disconnect(); window.removeEventListener('resize', revealFocused); };
  }, [open, showSections]);

  function leave(action: () => void) {
    // A global dialog must remember this durable handle, not a drawer row
    // which disappears when its action closes the menu in the same update.
    document.querySelector<HTMLElement>('[data-tv-focus-key="menu-toggle"]')?.focus({ preventScroll: true });
    setShowSections(false);
    action();
  }

  function jumpTo(key: string) {
    jumpTarget.current = key;
    setShowSections(false);
  }

  if (!open) return null;
  const AccountIcon = paired ? LogOut : LogIn;
  return <div className="tv-side-menu-backdrop" onClick={event => { if (event.target === event.currentTarget) leave(onClose); }}>
    <section ref={panel} id="tv-side-menu" className="tv-side-menu" data-index={showSections} role="dialog" aria-modal="true" aria-labelledby="tv-side-menu-title" data-tv-focus-scope dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="tv-side-menu-heading">
        <div><strong dir="ltr">SFM TV</strong><h2 id="tv-side-menu-title">{copy.menu}</h2></div>
        <button type="button" className="tv-side-menu-close" onClick={() => showSections ? jumpTo('sections') : leave(onClose)} data-tv-focus-key="menu-close" data-tv-back {...neighbors('menu-close')}><X aria-hidden="true"/><span>{showSections ? copy.back : t('close')}</span></button>
      </header>
      {showSections ? <nav className="tv-side-menu-items tv-side-menu-index" aria-label={copy.sections}>
        <h3>{copy.sections}</h3>
        {[...sections.map(section => ({ ...section, first: section.items[0].key })),
          { id: 'account', label: copy.accountHeading, icon: UserRound, first: 'my-account' }]
          .map(({ id, label, icon: Icon, first }, i) => <button key={id} type="button"
            data-tv-focus-key={`jump:${id}`} data-tv-initial-focus={i === 0 ? '' : undefined}
            {...neighbors(`jump:${id}`)} onClick={() => jumpTo(first)}><Icon aria-hidden="true"/><span>{label}</span></button>)}
      </nav> : <>
      <div className="tv-menu-shortcuts">
        <button type="button" data-tv-focus-key="sections" {...neighbors('sections')} onClick={() => setShowSections(true)}>
          <ListTree aria-hidden="true"/><span>{copy.sections}</span>
        </button>
        <button type="button" data-tv-focus-key="wallpapers" {...neighbors('wallpapers')} onClick={() => leave(onWallpapers)}>
          <ImageIcon aria-hidden="true"/><span>{copy.wallpapers}</span>
        </button>
      </div>
      <nav className="tv-side-menu-items" aria-label={copy.menu}>
        {sections.map(section => <section className="tv-menu-group" key={section.id} aria-labelledby={`tv-menu-${section.id}`}>
          <h3 id={`tv-menu-${section.id}`}>{section.label}</h3>
          {section.items.map(({ key, label, icon: Icon, action }) => <button key={key} type="button" onClick={() => leave(action)}
            data-tv-focus-key={key} {...neighbors(key)} aria-current={key === selectedKey ? 'page' : undefined}
            data-tv-initial-focus={key === selectedKey ? '' : undefined}><Icon aria-hidden="true"/><span>{label}</span></button>)}
        </section>)}
      </nav>
      <footer className="tv-side-menu-account">
        <p className="tv-side-menu-account-name" title={paired && deviceName ? deviceName : undefined}>{paired && deviceName ? <bdi>{deviceName}</bdi> : paired ? copy.account : copy.guest}</p>
        <button type="button" onClick={() => leave(onMyAccount)} data-tv-focus-key="my-account" {...neighbors('my-account')}><UserRound aria-hidden="true"/><span>{copy.myAccount}</span></button>
        <button type="button" onClick={() => leave(onSwitchAccount)} data-tv-focus-key="switch-account" {...neighbors('switch-account')}><LogIn aria-hidden="true"/><span>{language === 'ar' ? 'تبديل الحساب / إضافة حساب' : language === 'fr' ? 'Changer / ajouter un compte' : 'Switch / add account'}</span></button>
        <button type="button" onClick={() => leave(onAccount)} data-tv-focus-key="pair" {...neighbors('pair')}><AccountIcon aria-hidden="true"/><span>{paired ? copy.signOut : copy.signIn}</span></button>
        <button type="button" onClick={() => leave(onTools)} data-tv-focus-key="more" {...neighbors('more')}><Wrench aria-hidden="true"/><span>{copy.tools}</span></button>
      </footer></>}
    </section>
  </div>;
}
