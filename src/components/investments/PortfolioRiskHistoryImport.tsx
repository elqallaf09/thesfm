'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { RiskLocale } from '@/lib/portfolio-risk/current';
import { isHistoryImportPreview, isRecord, type HistoryImportPreview } from '@/lib/portfolio-risk/historyEvidence';
import { sameRiskRequestIdentity } from '@/lib/portfolio-risk/requestIdentity';
import { historicalRiskErrorText } from './portfolioRiskConnectionCopy';
import { HISTORY_IMPORT_COPY } from './portfolioRiskImportCopy';
import styles from './PortfolioRisk.module.css';

type Preview = HistoryImportPreview & { sha256: string };
type State = { owner: string; token?: string } & (
  { kind: 'loading' } | { kind: 'error'; code: string } | { kind: 'ready'; preview: Preview }
);
const LIMIT = 2 * 1024 * 1024;

export function PortfolioRiskHistoryImport({ locale = 'ar' }: { locale?: RiskLocale }) {
  const { user, session, isGuest } = useAuth();
  const owner = !isGuest && user?.id ? user.id : '';
  const token = session?.access_token;
  const copy = HISTORY_IMPORT_COPY[locale];
  const fileInput = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const [state, setState] = useState<State | null>(null);
  useEffect(() => {
    if (fileInput.current) fileInput.current.value = '';
    setState(null);
    return () => { active.current?.abort(); active.current = null; };
  }, [owner, token]);
  const visible = state && sameRiskRequestIdentity(state, owner, token) ? state : null;
  const loading = visible?.kind === 'loading';
  const preview = visible?.kind === 'ready' ? visible.preview : null;
  const code = visible?.kind === 'error' ? visible.code : '';
  const error = code === 'HISTORY_IMPORT_TOO_LARGE' ? copy.large
    : code === 'HISTORY_IMPORT_FORMAT' ? copy.format
    : code === 'HISTORY_UNVERIFIED_SOURCE' ? copy.source
    : code ? historicalRiskErrorText(code, locale) : '';

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!owner || !file) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    if (file.size > LIMIT) {
      setState({ owner, token, kind: 'error', code: 'HISTORY_IMPORT_TOO_LARGE' }); return;
    }
    setState({ owner, token, kind: 'loading' });
    const timer = setTimeout(() => {
      controller.abort();
      if (active.current === controller) setState({ owner, token, kind: 'error', code: 'HISTORY_DATA_UNAVAILABLE' });
    }, 15_000);
    try {
      const body = await file.text();
      if (controller.signal.aborted) return;
      const response = await fetch('/api/portfolio/risk/history/preview', {
        method: 'POST', body, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { 'content-type': 'application/json', accept: 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      });
      const payload: unknown = await response.json();
      if (controller.signal.aborted || active.current !== controller) return;
      if (response.ok && isRecord(payload) && payload.ok === true && isHistoryImportPreview(payload.preview) &&
          isRecord(payload.preview) && typeof payload.preview.sha256 === 'string' && /^[a-f0-9]{64}$/.test(payload.preview.sha256)) {
        setState({ owner, token, kind: 'ready', preview: payload.preview as Preview });
      } else {
        setState({ owner, token, kind: 'error', code: isRecord(payload) && typeof payload.code === 'string' ? payload.code : 'HISTORY_DATA_UNAVAILABLE' });
      }
    } catch {
      if (active.current === controller) setState({ owner, token, kind: 'error', code: 'HISTORY_DATA_UNAVAILABLE' });
    } finally { clearTimeout(timer); }
  }

  return <section className={styles.panel} dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-labelledby="history-import-title" data-testid="history-import">
    <h2 id="history-import-title">{copy.title}</h2>
    <p className={styles.detail}>{copy.description}</p>
    <form className={styles.scenario} onSubmit={event => void check(event)}>
      <label htmlFor="history-import-file">{copy.file}</label>
      <input ref={fileInput} id="history-import-file" className={styles.input} type="file" accept=".json,application/json" required disabled={!owner || loading}
        onChange={() => { active.current?.abort(); setState(null); }} />
      <div className={styles.actions}><button className={styles.button} type="submit" disabled={!owner || loading}>{loading ? copy.checking : copy.check}</button></div>
    </form>
    {!owner ? <p role="status">{copy.auth}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {preview ? <div className={styles.scenario} data-testid="history-import-summary">
      <p role="status">{copy.pending}</p>
      <p className={styles.detail}>{preview.sourceName} · {preview.calendarName}</p>
      <p>{copy.period}: <bdi>{preview.periodStart} — {preview.periodEnd}</bdi></p>
      <p>{copy.points}: <bdi>{preview.pointCount}</bdi> · {copy.positions}: <bdi>{preview.positionCount}</bdi> · {copy.currency}: <bdi>{preview.currency}</bdi></p>
      <p className={styles.detail}>{copy.fingerprint}: <bdi>{preview.sha256}</bdi></p>
    </div> : null}
    <p className={styles.notice}>{copy.notice}</p>
  </section>;
}
