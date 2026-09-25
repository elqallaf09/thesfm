'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { tvText, tvTime } from '@/lib/markets-tv/i18n';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { useTvResource } from './useTvResource';
export function TvAccount() {
  const [language, setLanguage] = useState<TvLanguage>('ar'), [code, setCode] = useState(''), [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'approveSuccess' | 'invalidCode' | 'error' | null>(null), [revision, setRevision] = useState(0);
  const resource = useTvResource<{ devices: { id: string; name: string; expires_at: string }[] }>('/api/tv/account', 60000, '', revision);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  useEffect(() => {
    let candidate = window.location.hash.slice(1);
    try { candidate ||= sessionStorage.getItem('sfm-tv-pair-code') || ''; } catch { /* Manual entry remains available. */ }
    if (/^[A-Fa-f0-9]{12}$/.test(candidate)) {
      setCode(candidate.toUpperCase());
      try { sessionStorage.setItem('sfm-tv-pair-code', candidate.toUpperCase()); } catch { /* Manual entry after login. */ }
    }
  }, []);
  async function approve(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setResult(null);
    try {
      const response = await fetch('/api/tv/account', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) });
      setResult(response.ok ? 'approveSuccess' : response.status === 400 ? 'invalidCode' : 'error');
      if (response.ok) { try { sessionStorage.removeItem('sfm-tv-pair-code'); } catch { /* No persistent state. */ } setCode(''); history.replaceState(null, '', '/tv/pair'); setRevision(v => v + 1); }
    } catch { setResult('error'); } finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true);
    try {
      const response = await fetch('/api/tv/account', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!response.ok) setResult('error'); else setRevision(v => v + 1);
    } catch { setResult('error'); } finally { setBusy(false); }
  }
  return <div className="tv-screen tv-dark tv-pair-page" dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language}>
    <header className="tv-header"><Link href="/tv">THE SFM MARKETS TV</Link><div className="tv-segment">{(['ar','en','fr'] as const).map((lang,i) => <button key={lang} aria-pressed={language === lang} onClick={() => setLanguage(lang)}>{['العربية','English','Français'][i]}</button>)}</div></header>
    <main className="tv-account"><h1>{t('pair')}</h1><p>{t('onlyOwnTv')}</p>
      {(resource.error === 'UNAUTHORIZED' || resource.error === 'MFA_REQUIRED') ? <Link href={'/login?next=%2Ftv%2Fpair'}>{t('signIn')}</Link> : <form onSubmit={event => void approve(event)}><label>{t('code')}<input value={code} onChange={event => setCode(event.target.value.toUpperCase())} dir="ltr" autoComplete="off" maxLength={16} required pattern="[A-Fa-f0-9 -]{12,16}"/></label><button type="submit" disabled={busy || code.replace(/[ -]/g,'').length !== 12}>{t('approve')}</button></form>}
      {result && <p role="status">{t(result)}</p>}
      <h2>{t('devices')}</h2>{resource.loading ? <p>{t('loading')}</p> : resource.error && resource.error !== 'UNAUTHORIZED' ? <p role="status">{t('error')}</p> : resource.data?.devices.length ? resource.data.devices.map(device => <div className="tv-device-row" key={device.id}><div><strong>{device.name}</strong><p className="tv-muted">{tvTime(device.expires_at,language,true)}</p></div><button disabled={busy} onClick={() => void revoke(device.id)}>{t('revoke')}</button></div>) : <p>{t('noDevices')}</p>}
    </main>
  </div>;
}
