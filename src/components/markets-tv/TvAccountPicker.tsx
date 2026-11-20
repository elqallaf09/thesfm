'use client';
import { useEffect, useRef } from 'react';
import { UserPlus, Users } from 'lucide-react';
import type { TvLocalProfile } from '@/lib/markets-tv/localProfiles';
import type { TvLanguage } from '@/lib/markets-tv/types';
import './account-picker.css';

const COPY = {
  ar: { title: 'من يشاهد الآن؟', choose: 'اختيار الحساب', guest: 'المشاهدة كضيف', add: 'إضافة حساب', account: 'الحساب' },
  en: { title: 'Who is watching?', choose: 'Choose account', guest: 'Watch as guest', add: 'Add account', account: 'Account' },
  fr: { title: 'Qui regarde ?', choose: 'Choisir un compte', guest: 'Regarder en invité', add: 'Ajouter un compte', account: 'Compte' },
};

export function TvAccountPicker({ language, profiles, onSelect, onGuest, onAdd }: {
  language: TvLanguage; profiles: TvLocalProfile[]; onSelect: (profile: TvLocalProfile) => void; onGuest: () => void; onAdd: () => void;
}) {
  const copy = COPY[language];
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[data-tv-initial-focus]')?.focus({ preventScroll: true });
  }, []);
  return <div className="tv-side-menu-backdrop tv-account-backdrop">
    <section ref={panel} className="tv-account-picker" data-tv-dialog data-tv-focus-scope role="dialog" aria-modal="true" aria-labelledby="tv-accounts-title">
      <h2 id="tv-accounts-title">{copy.title}</h2>
      <nav aria-label={copy.choose} className="tv-account-list">
        {profiles.map((profile, index) => <button type="button" key={index} data-tv-focus-key={`account-${index}`}
          data-tv-initial-focus={index === 0 ? '' : undefined} onClick={() => onSelect(profile)}>
          <span className="tv-account-avatar" aria-hidden="true">{profile.name.slice(0, 1).toUpperCase()}</span>
          <span><bdi>{profile.name}</bdi><small>{copy.account} <bdi>{index + 1}</bdi></small></span>
        </button>)}
      </nav>
      <div className="tv-account-actions">
        <button type="button" data-tv-focus-key="account-guest" data-tv-initial-focus={!profiles.length ? '' : undefined} onClick={onGuest}><Users aria-hidden="true"/><span>{copy.guest}</span></button>
        <button type="button" data-tv-focus-key="account-add" onClick={onAdd}><UserPlus aria-hidden="true"/><span>{copy.add}</span></button>
      </div>
    </section>
  </div>;
}
