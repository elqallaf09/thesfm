'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ListTree, Bitcoin, Building2, ChartNoAxesCombined, Clock3, Coins, DollarSign, Globe2, Landmark, LogIn, LogOut, Map, Monitor, Newspaper,
  Rows3, Settings2, SlidersHorizontal, Star, Tv, UserRound, WalletCards, X,
  type LucideIcon,
} from 'lucide-react';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvText } from '@/lib/markets-tv/i18n';
import { TV_EXTRA_NEWS_CHANNELS, type TvExtraNewsChannel } from '@/lib/markets-tv/newsReceiver';
import { receiverText } from '@/lib/markets-tv/receiver';
import type { TvChannel } from '@/lib/markets-tv/channels';
import { tvSceneText } from '@/lib/markets-tv/scene-display';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { tvMenuCopy } from './tvMenuCopy';

export type TvSideDestination = 'hall' | 'allStocks' | 'strips' | 'world' | 'gulf' | 'assets' | 'crypto' | 'forex' | 'kuwait' | 'news' | 'sessions' | 'watchlist' | 'investments' | 'brief' | 'map' | 'technology' | TvExtraNewsChannel;

type Props = {
  language: TvLanguage;
  open: boolean;
  active?: TvSideDestination;
  paired: boolean;
  deviceName?: string;
  onClose: () => void;
  onNavigate: (destination: TvSideDestination) => void;
  channels: TvChannel[];
  onSavedChannel: (channel: TvChannel) => void;
  onCustomize: () => void;
  onSettings: () => void;
  onMyAccount: () => void;
  onAccount: () => void;
  onSwitchAccount: () => void;
};

type MenuItem = { key: string; label: string; icon: LucideIcon; destination?: TvSideDestination; action: () => void };

export function TvSideMenu({ language, open, active, paired, deviceName, onClose, onNavigate, channels, onSavedChannel, onCustomize, onSettings, onMyAccount, onAccount, onSwitchAccount }: Props) {
  const panel = useRef<HTMLElement>(null);
  const [showSections, setShowSections] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const jumpTarget = useRef<string | null>(null);
  const copy = tvMenuCopy[language];
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
      route('assets', tvSceneText(language, 'assets'), Coins), route('crypto', tvSceneText(language, 'crypto'), Bitcoin),
      route('forex', receiverText(language, 'forex'), DollarSign), route('strips', copy.strips, Rows3),
    ] },
    { id: 'news', label: copy.broadcasts, icon: Newspaper, items: [
      route('news', copy.news, Newspaper),
      route('technology', receiverText(language, 'technology'), Tv),
      ...TV_EXTRA_NEWS_CHANNELS.map(channel => route(channel, receiverText(language, channel), Tv)),
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
  const accountActions: MenuItem[] = paired ? [
    { key: 'my-account', label: copy.myAccount, icon: UserRound, action: onMyAccount },
    { key: 'switch-account', label: language === 'ar' ? 'تبديل / إضافة حساب' : language === 'fr' ? 'Changer / ajouter un compte' : 'Switch / add account', icon: LogIn, action: onSwitchAccount },
    { key: 'pair', label: copy.signOut, icon: LogOut, action: onAccount },
  ] : [{ key: 'pair', label: copy.signIn, icon: LogIn, action: onAccount }];
  const keys = showSections ? ['menu-close', ...sections.map(section => `jump:${section.id}`), 'jump:account']
    : showAccount ? ['menu-close', ...accountActions.map(action => action.key)]
    : ['menu-close', 'sections', ...items.map(item => item.key), 'account'];
  const selectedKey = `menu:${active || 'hall'}`;
  const neighbors = (key: string) => {
    const index = keys.indexOf(key);
    return {
      'data-tv-nav-up': keys[Math.max(0, index - 1)],
      'data-tv-nav-down': keys[Math.min(keys.length - 1, index + 1)],
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
  }, [open, active, showSections, showAccount]);

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
  }, [open, showSections, showAccount]);

  function leave(action: () => void) {
    // A global dialog must remember this durable handle, not a drawer row
    // which disappears when its action closes the menu in the same update.
    document.querySelector<HTMLElement>('[data-tv-focus-key="menu-toggle"]')?.focus({ preventScroll: true });
    setShowSections(false);
    setShowAccount(false);
    action();
  }

  function jumpTo(key: string) {
    jumpTarget.current = key;
    setShowSections(false);
    setShowAccount(false);
  }

  function enterAccount() {
    jumpTarget.current = accountActions[0].key;
    setShowSections(false);
    setShowAccount(true);
  }

  function exitAccount() {
    jumpTarget.current = 'account';
    setShowAccount(false);
  }

  if (!open) return null;
  return <div className="tv-side-menu-backdrop" onClick={event => { if (event.target === event.currentTarget) leave(onClose); }}>
    <section ref={panel} id="tv-side-menu" className="tv-side-menu" data-index={showSections || showAccount} role="dialog" aria-modal="true" aria-labelledby="tv-side-menu-title" data-tv-focus-scope dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="tv-side-menu-heading">
        <div><strong dir="ltr">SFM TV</strong><h2 id="tv-side-menu-title">{copy.menu}</h2></div>
        <button type="button" className="tv-side-menu-close" onClick={() => showSections ? jumpTo('sections') : showAccount ? exitAccount() : leave(onClose)} data-tv-focus-key="menu-close" data-tv-back {...neighbors('menu-close')}><X aria-hidden="true"/><span>{showSections || showAccount ? copy.back : t('close')}</span></button>
      </header>
      {showSections ? <nav className="tv-side-menu-items tv-side-menu-index" aria-label={copy.sections}>
        <h3>{copy.sections}</h3>
        {[...sections.map(section => ({ ...section, first: section.items[0].key })),
          { id: 'account', label: copy.accountHeading, icon: UserRound, first: 'account' }]
          .map(({ id, label, icon: Icon, first }, i) => <button key={id} type="button"
            data-tv-focus-key={`jump:${id}`} data-tv-initial-focus={i === 0 ? '' : undefined}
            {...neighbors(`jump:${id}`)} onClick={() => jumpTo(first)}><Icon aria-hidden="true"/><span>{label}</span></button>)}
      </nav> : showAccount ? <nav className="tv-side-menu-items tv-side-menu-index" aria-label={copy.accountHeading}>
        <h3>{paired && deviceName ? deviceName : copy.accountHeading}</h3>
        {accountActions.map(({ key, label, icon: Icon, action }, index) =>
          <button key={key} type="button" data-tv-focus-key={key}
            data-tv-initial-focus={index === 0 ? '' : undefined} {...neighbors(key)} onClick={() => leave(action)}>
            <Icon aria-hidden="true"/><span>{label}</span>
          </button>)}
      </nav> : <>
      <div className="tv-menu-shortcuts">
        <button type="button" data-tv-focus-key="sections" {...neighbors('sections')} onClick={() => setShowSections(true)}>
          <ListTree aria-hidden="true"/><span>{copy.sections}</span>
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
        <button type="button" onClick={() => paired ? enterAccount() : leave(onAccount)}
          data-tv-focus-key="account" {...neighbors('account')}><UserRound aria-hidden="true"/><span>{paired ? copy.myAccount : copy.signIn}</span></button>
      </footer></>}
    </section>
  </div>;
}

