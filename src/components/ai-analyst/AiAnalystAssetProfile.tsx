'use client';

import { useEffect, useState } from 'react';
import type { CanonicalAssetIdentity } from '@/domain/intelligence/contracts';
import { useLanguage } from '@/hooks/useLanguage';
import { ASSET_PROFILE_COPY } from './assetProfileCopy';
import { readAnalystAssetProfile, type AnalystAssetProfile } from './assetProfilePresentation';
import { aiAnalystLocale, aiAnalystTimestamp } from './copy';
import styles from './AiAnalystWorkspace.module.css';
import detailStyles from './AiAnalystAssetDetails.module.css';

type ProfileState = { identity: string; status: 'loading' | 'ready' | 'error'; profile: AnalystAssetProfile | null };

export function AssetProfileFields({ assetType, profile, locale }: {
  assetType: CanonicalAssetIdentity['assetType']; profile: AnalystAssetProfile | null; locale: 'ar' | 'en' | 'fr';
}) {
  const copy = ASSET_PROFILE_COPY[locale];
  const fields = assetType === 'FUND'
    ? ['issuer', 'objective', 'indexTracked'] as const
    : ['sector', 'industry', 'description', 'website'] as const;
  return <dl className={detailStyles.facts}>
    {fields.map(field => <div key={field} data-profile-field={field} className={field === 'objective' || field === 'description' ? detailStyles.wideFact : undefined}>
      <dt>{copy[field]}</dt>
      <dd dir="auto">{field === 'website' && profile?.website
        ? <a className={styles.linkAction} href={profile.website} target="_blank" rel="noopener noreferrer">{profile.website}</a>
        : profile?.[field] ?? copy.unavailable}</dd>
    </div>)}
  </dl>;
}

/** Profile reads are independent of quotes and AI execution. A failed profile
 * must not hide an available quote or trigger an analysis/usage charge. */
export function AiAnalystAssetProfile({ asset }: { asset: CanonicalAssetIdentity }) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = ASSET_PROFILE_COPY[locale];
  const { displaySymbol, providerSymbol, assetType, exchange } = asset;
  const identity = `${displaySymbol}:${providerSymbol}:${assetType}:${exchange ?? ''}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ProfileState>({ identity, status: 'loading', profile: null });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 65_000);
    setState({ identity, status: 'loading', profile: null });
    const params = new URLSearchParams({ symbol: displaySymbol, providerSymbol, type: assetType === 'FUND' ? 'etf' : 'stock' });
    if (exchange) params.set('exchange', exchange);
    async function load() {
      try {
        const response = await fetch(`/api/market/asset-profile?${params}`, { credentials: 'same-origin', signal: controller.signal, headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error('asset_profile_unavailable');
        const payload: unknown = await response.json();
        const profile = readAnalystAssetProfile(payload, { displaySymbol, providerSymbol, assetType });
        if (active) setState({ identity, status: 'ready', profile });
      } catch { if (active) setState({ identity, status: 'error', profile: null }); }
      finally { clearTimeout(timer); }
    }
    void load();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [assetType, displaySymbol, exchange, identity, providerSymbol, revision]);

  const current = state.identity === identity ? state : { status: 'loading', profile: null };
  const profile = current.profile;
  const values = assetType === 'FUND'
    ? [profile?.issuer, profile?.objective, profile?.indexTracked]
    : [profile?.sector, profile?.industry, profile?.description, profile?.website];
  return <section className={detailStyles.profile} aria-label={copy.title} aria-busy={current.status === 'loading'} data-testid="ai-analyst-asset-profile">
    <h3 className={styles.panelTitle}>{copy.title}</h3>
    {current.status === 'loading' ? <p className={styles.statusRail} role="status">{copy.loading}</p> : <>
      {current.status === 'error'
        ? <div className={styles.statusRail} role="alert">{copy.error}<button className={styles.linkAction} type="button" onClick={() => setRevision(value => value + 1)}>{copy.retry}</button></div>
        : values.some(value => !value) ? <p className={styles.mutedText} role="status">{values.some(Boolean) ? copy.partial : copy.empty}</p> : null}
      <AssetProfileFields assetType={assetType} profile={profile} locale={locale} />
      {profile?.source ? <div className={styles.statusRail}>
        <span>{copy.source}: <bdi>{profile.source}</bdi></span>
        <span>{copy.retrieved}: {profile.retrievedAt ? aiAnalystTimestamp(locale, profile.retrievedAt) : copy.unavailable}</span>
      </div> : null}
      {profile?.source ? <p className={styles.mutedText}>{copy.provenance}</p> : null}
    </>}
  </section>;
}
