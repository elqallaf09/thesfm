'use client';

import Link from 'next/link';
import { CheckCircle2, LogIn, Monitor, ShieldCheck, TvMinimal } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { tvText, tvTime } from '@/lib/markets-tv/i18n';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { useTvResource } from './useTvResource';
import { TvBrandMark } from './TvBrandMark';

const languages = { ar: 'العربية', en: 'English', fr: 'Français' } as const;
const heading = { ar: 'ربط التلفزيون بحسابي', en: 'Link my TV', fr: 'Associer mon téléviseur' };
const linkAnother = { ar: 'ربط تلفزيون آخر', en: 'Link another TV', fr: 'Associer un autre téléviseur' };
const expiry = { ar: 'ينتهي الربط', en: 'Link expires', fr: 'Fin de validité' };
const codeKey = 'sfm-tv-pair-code';
const languageKey = 'sfm-tv-pair-language';
const loginHref = '/login?next=%2Ftv%2Fpair';

export function TvAccount() {
  const [language, setLanguage] = useState<TvLanguage>('ar'), [code, setCode] = useState(''), [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'approveSuccess' | 'invalidCode' | 'error' | null>(null), [revision, setRevision] = useState(0);
  const resource = useTvResource<{ devices: { id: string; name: string; expires_at: string }[] }>('/api/tv/account', 60000, '', revision);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const needsLogin = resource.errorStatus === 401 || resource.error === 'MFA_REQUIRED' || resource.error === 'UNAUTHORIZED';
  const devices = resource.data?.devices;
  const normalized = code.replace(/[ -]/g, '').toUpperCase();
  const valid = /^[A-F0-9]{12}$/.test(normalized);

  useEffect(() => {
    let candidate = window.location.hash.slice(1);
    try {
      candidate ||= sessionStorage.getItem(codeKey) || '';
      const saved = sessionStorage.getItem(languageKey);
      if (saved === 'ar' || saved === 'en' || saved === 'fr') setLanguage(saved);
    } catch { /* Manual entry remains available. */ }
    if (/^[A-Fa-f0-9]{12}$/.test(candidate)) {
      setCode(candidate.toUpperCase());
      try { sessionStorage.setItem(codeKey, candidate.toUpperCase()); } catch { /* Manual entry after login. */ }
    }
  }, []);

  function chooseLanguage(next: TvLanguage) {
    setLanguage(next);
    try { sessionStorage.setItem(languageKey, next); } catch { /* Keep the in-memory selection. */ }
  }

  async function approve(event: FormEvent) {
    event.preventDefault();
    if (busy || !valid || !devices) return;
    setBusy(true); setResult(null);
    try {
      const response = await fetch('/api/tv/account', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: normalized }) });
      if (response.ok) {
        try { sessionStorage.removeItem(codeKey); } catch { /* No persistent state. */ }
        setCode(''); history.replaceState(null, '', '/tv/pair'); setResult('approveSuccess');
        setRevision(v => v + 1);
      } else if (response.status === 401) {
        try { sessionStorage.setItem(codeKey, normalized); } catch { /* Manual entry after login. */ }
        setRevision(v => v + 1);
      } else setResult(response.status === 400 ? 'invalidCode' : 'error');
    } catch { setResult('error'); } finally { setBusy(false); }
  }

  async function revoke(id: string) {
    setBusy(true); setResult(null);
    try {
      const response = await fetch('/api/tv/account', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
      if (response.ok || response.status === 401) setRevision(v => v + 1);
      else setResult('error');
    } catch { setResult('error'); } finally { setBusy(false); }
  }

  return <main className="tv-screen tv-dark tv-pair-page" data-accent="green" dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language}>
    <header className="tv-pair-header">
      <Link href="/tv" className="tv-pair-brand"><TvBrandMark/><span dir="ltr">MARKETS TV</span></Link>
      <div className="tv-pair-languages" role="group" aria-label={t('language')}>
        {(Object.keys(languages) as TvLanguage[]).map(lang => <button type="button" key={lang} lang={lang} aria-pressed={language === lang} onClick={() => chooseLanguage(lang)}>{languages[lang]}</button>)}
      </div>
    </header>
    <div className="tv-account">
      <section className="tv-pair-card" aria-labelledby="tv-pair-title">
        <div className="tv-pair-emblem" aria-hidden="true"><TvMinimal/></div>
        <h1 id="tv-pair-title">{heading[language]}</h1>
        <p>{t('pairScope')}</p>
        {(needsLogin || devices) && result !== 'approveSuccess' && <>
          {needsLogin && valid && <div className="tv-pair-preview"><span>{t('code')}</span><bdi dir="ltr">{normalized.match(/.{4}/g)?.join(' ')}</bdi></div>}
          <p className="tv-pair-guidance"><ShieldCheck aria-hidden="true"/>{t('onlyOwnTv')}</p>
        </>}
        {needsLogin ? <Link className="tv-pair-primary" href={loginHref}><LogIn aria-hidden="true"/>{t('signIn')}</Link>
          : devices && result === 'approveSuccess' ? null
          : devices ? <form onSubmit={approve}><label htmlFor="tv-pair-input">{t('code')}</label>
            <input id="tv-pair-input" value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setResult(null); }}
              dir="ltr" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={16} required pattern="[A-Fa-f0-9\x20\x2D]{12,16}"
              aria-invalid={result === 'invalidCode'} aria-describedby={result === 'invalidCode' ? 'tv-pair-result' : undefined}/>
            <button className="tv-pair-primary" type="submit" disabled={busy || !valid}>{t('approve')}</button>
          </form>
          : resource.error ? <div className="tv-pair-feedback"><p role="status">{t('error')}</p><button type="button" onClick={() => setRevision(v => v + 1)}>{t('retry')}</button></div>
          : <p role="status">{t('loading')}</p>}
        {result && <p id="tv-pair-result" className="tv-pair-result" data-success={result === 'approveSuccess'} role="status">
          {result === 'approveSuccess' && <CheckCircle2 aria-hidden="true"/>}{t(result)}
        </p>}
        {devices && result === 'approveSuccess' && <button type="button" onClick={() => setResult(null)}>{linkAnother[language]}</button>}
      </section>
      {devices && !needsLogin && <section className="tv-pair-devices" aria-labelledby="tv-devices-title">
        <h2 id="tv-devices-title"><Monitor aria-hidden="true"/>{t('devices')}</h2>
        {resource.error && <p role="status">{t('error')}</p>}
        {devices.length ? <ul>{devices.map(device => <li className="tv-device-row" key={device.id}>
          <div><strong dir="auto">{device.name}</strong><p>{expiry[language]} · <time dateTime={device.expires_at}>{tvTime(device.expires_at, language, true)}</time></p></div>
          <button type="button" disabled={busy} onClick={() => void revoke(device.id)}>{t('revoke')}</button>
        </li>)}</ul> : <p>{t('noDevices')}</p>}
      </section>}
    </div>
  </main>;
}
