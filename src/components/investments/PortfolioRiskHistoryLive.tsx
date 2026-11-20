'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { RiskLocale } from '@/lib/portfolio-risk/current';
import { isHistoricalRiskSnapshot, type HistoricalRiskSnapshot } from '@/lib/portfolio-risk/historyEvidence';
import { sameRiskRequestIdentity } from '@/lib/portfolio-risk/requestIdentity';
import { PortfolioRiskPanel } from './PortfolioRiskPanel';
import { historicalRiskErrorText, RISK_CONNECTION_COPY } from './portfolioRiskConnectionCopy';
import styles from './PortfolioRisk.module.css';

type State = { owner: string; token?: string } & (
  | { kind: 'loading' } | { kind: 'ready'; data: HistoricalRiskSnapshot } | { kind: 'error'; code: string }
);

export function PortfolioRiskHistoryLive({ locale = 'ar' }: { locale?: RiskLocale }) {
  const { user, session, isGuest } = useAuth();
  const owner = !isGuest && user?.id ? user.id : '';
  const token = session?.access_token;
  const [state, setState] = useState<State>({ owner: '', kind: 'loading' });
  const [reload, setReload] = useState(0);
  const copy = RISK_CONNECTION_COPY[locale];
  useEffect(() => {
    if (!owner) { setState({ owner: '', kind: 'loading' }); return; }
    const controller = new AbortController();
    let active = true;
    setState({ owner, token, kind: 'loading' });
    const timer = setTimeout(() => controller.abort(), 15_000);
    async function load() {
      try {
        const response = await fetch('/api/portfolio/risk/history', {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
          headers: { accept: 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        });
        const payload: unknown = await response.json();
        if (!active) return;
        if (response.ok && isHistoricalRiskSnapshot(payload)) {
          setState({ owner, token, kind: 'ready', data: payload }); return;
        }
        const code = payload && typeof payload === 'object' && 'code' in payload && typeof payload.code === 'string' ? payload.code : 'HISTORY_DATA_UNAVAILABLE';
        setState({ owner, token, kind: 'error', code });
      } catch {
        if (active) setState({ owner, token, kind: 'error', code: 'HISTORY_DATA_UNAVAILABLE' });
      } finally { clearTimeout(timer); }
    }
    void load();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [owner, token, reload]);
  const visible = sameRiskRequestIdentity(state, owner, token) ? state : null;
  const data = visible?.kind === 'ready' ? visible.data : null;
  const loading = Boolean(owner) && (!visible || visible.kind === 'loading');
  const error = !owner ? copy.auth : visible?.kind === 'error' ? historicalRiskErrorText(visible.code, locale) : null;
  return <div className={styles.scenario}>
    <PortfolioRiskPanel snapshot={data} loading={loading} error={error} locale={locale} />
    {data ? <>
      <p className={styles.detail}>{copy.source}: {data.evidence.sourceName} · {copy.calendar}: {data.evidence.calendarName} · <bdi>{data.evidence.timeZone}</bdi></p>
      <p className={styles.detail}>{copy.annualization}: <bdi>{data.evidence.periodsPerYear}</bdi> · {copy.verified}: <bdi>{data.evidence.verifiedAt}</bdi></p>
      <p className={styles.detail}>{data.evidence.valuationPolicy} · {data.evidence.fxPolicy}</p>
      <p className={styles.notice}>{copy.limitation}</p>
    </> : null}
    <div className={styles.actions}><button className={styles.button} type="button" disabled={!owner || loading} onClick={() => setReload(value => value + 1)}>{copy.refresh}</button></div>
  </div>;
}
