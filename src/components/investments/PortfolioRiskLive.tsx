'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isCurrentRiskSnapshot, type CurrentRiskSnapshot, type RiskLocale } from '@/lib/portfolio-risk/current';
import { currentRiskText, riskUnavailableText } from '@/lib/portfolio-risk/advisor';
import { simulatePortfolioShock } from '@/lib/portfolio-risk/stress';
import { RISK_COPY } from './portfolioRiskCopy';
import styles from './PortfolioRisk.module.css';

type LoadState =
  | { kind: 'loading'; owner: string }
  | { kind: 'ready'; owner: string; data: CurrentRiskSnapshot }
  | { kind: 'error'; owner: string; code: string };

export function PortfolioRiskLive({ locale = 'ar' }: { locale?: RiskLocale }) {
  const { user, session, isGuest } = useAuth();
  const owner = !isGuest && user?.id ? user.id : '';
  const token = session?.access_token;
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<LoadState>({ kind: 'loading', owner: '' });
  const copy = RISK_COPY[locale];
  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    let active = true;
    setState({ kind: 'loading', owner });
    const timer = setTimeout(() => controller.abort(), 15_000);
    async function load() {
      try {
        const response = await fetch('/api/portfolio/risk', {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
          headers: { accept: 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        });
        const data: unknown = await response.json();
        if (!active) return;
        if (response.ok && isCurrentRiskSnapshot(data)) {
          setState({ kind: 'ready', owner, data });
          return;
        }
        const code = data && typeof data === 'object' && 'code' in data && typeof data.code === 'string' ? data.code : 'INVALID_RISK_RESPONSE';
        setState({ kind: 'error', owner, code });
      } catch {
        if (active) setState({ kind: 'error', owner, code: 'RISK_DATA_UNAVAILABLE' });
      } finally {
        clearTimeout(timer);
      }
    }
    void load();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [owner, token, reload]);

  // Never render another account's previous response during a session change.
  const visible = owner && state.owner === owner ? state : null;
  const data = visible?.kind === 'ready' ? visible.data : null;
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
  const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });
  const exporting = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'sfm-recorded-portfolio-risk.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className={styles.panel} dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label={copy.title}>
    {!owner ? <p role="status">{riskUnavailableText('UNAUTHENTICATED', locale)}</p> :
      !visible || visible.kind === 'loading' ? <p role="status">{copy.loading}</p> :
      visible.kind === 'error' ? <p role="status">{riskUnavailableText(visible.code, locale)}</p> : null}
    {data ? <>
      <p className={styles.notice}>{copy.partial}</p>
      <dl className={styles.metrics}>
        {[
          [copy.value, `${number.format(data.totalValue)} ${data.currency}`],
          [copy.largest, percent.format(data.concentration.largestWeight)],
          [copy.concentration, data.concentration.hhi.toFixed(3)],
          [copy.holdings, String(data.holdingsCount)],
          [copy.assets, String(data.assetsCount)],
        ].map(([label, value]) => <div className={styles.metric} key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}
      </dl>
      <p className={styles.detail}>{copy.asOf}: <bdi>{data.asOf}</bdi></p>
      <h2>{copy.explanation}</h2>
      <p className={styles.explanation}>{currentRiskText(data, locale)}</p>
      <RiskScenario key={`${owner}:${data.calculatedAt}`} snapshot={data} locale={locale} />
    </> : null}
    <div className={styles.actions}>
      <button type="button" className={styles.button} disabled={!owner || visible?.kind === 'loading'} onClick={() => setReload(value => value + 1)}>{copy.refresh}</button>
      {data ? <button type="button" className={styles.button} onClick={exporting}>{copy.export}</button> : null}
    </div>
  </section>;
}

function RiskScenario({ snapshot, locale }: { snapshot: CurrentRiskSnapshot; locale: RiskLocale }) {
  const copy = RISK_COPY[locale];
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ change: number; ending: number } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const money = (value: number) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value)} ${snapshot.currency}`;
  function calculate() {
    const shock = input.trim() ? Number(input) / 100 : NaN;
    const outcome = simulatePortfolioShock(snapshot.totalValue, [{ id: 'user-input', labelAr: '', labelEn: '', shock }]);
    if ('error' in outcome || !Number.isFinite(outcome[0]?.hypotheticalEndingValue) || !Number.isFinite(outcome[0]?.hypotheticalChange)) {
      setInvalid(true); setResult(null); return;
    }
    setInvalid(false); setResult({ change: outcome[0].hypotheticalChange, ending: outcome[0].hypotheticalEndingValue });
  }
  return <div className={styles.scenario}>
    <h3>{copy.stress}</h3>
    <label htmlFor="portfolio-risk-shock">{copy.shock}</label>
    <div className={styles.actions}>
      <input id="portfolio-risk-shock" className={styles.input} type="number" min={-100} max={1000} step="any" dir="ltr" value={input} aria-describedby="portfolio-risk-shock-help" aria-invalid={invalid} onChange={event => { setInput(event.target.value); setResult(null); setInvalid(false); }} />
      <button type="button" className={styles.button} onClick={calculate}>{copy.simulate}</button>
    </div>
    <p id="portfolio-risk-shock-help" className={styles.detail}>{copy.example}</p>
    {invalid ? <p role="alert">{copy.invalid}</p> : null}
    {result ? <p role="status">{copy.change}: <bdi>{money(result.change)}</bdi> · {copy.ending}: <bdi>{money(result.ending)}</bdi></p> : null}
    <p className={styles.detail}>{copy.hypothetical}</p>
  </div>;
}
