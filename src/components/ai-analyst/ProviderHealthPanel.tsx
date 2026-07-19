'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, Clock3, Database, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_COPY, aiAnalystLocale, aiAnalystNumber, aiAnalystTimestamp } from './copy';
import styles from './AiAnalystWorkspace.module.css';

type ProviderItem = {
  provider: string;
  displayName: string;
  configured: boolean;
  status: string;
  latencyMs: number | null;
  lastCheckedAt: string | null;
};

type ProviderHealthResponse = { ok?: unknown; providers?: unknown };

function providerItem(value: unknown): ProviderItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const provider = typeof row.provider === 'string' ? row.provider.trim() : '';
  const displayName = typeof row.displayName === 'string' ? row.displayName.trim() : '';
  const status = typeof row.status === 'string' ? row.status.trim().toUpperCase() : '';
  const latency = Number(row.latencyMs);
  const lastCheckedAt = typeof row.lastCheckedAt === 'string' && Number.isFinite(Date.parse(row.lastCheckedAt)) ? row.lastCheckedAt : null;
  if (!provider || !displayName || !status || typeof row.configured !== 'boolean') return null;
  return { provider, displayName, configured: row.configured, status, latencyMs: Number.isFinite(latency) ? latency : null, lastCheckedAt };
}

function toneForProvider(item: ProviderItem): 'available' | 'degraded' | 'unavailable' | 'unknown' {
  if (!item.configured || item.status === 'NOT_CONFIGURED') return 'unknown';
  if (item.status === 'HEALTHY') return 'available';
  if (item.status === 'RATE_LIMITED' || item.status === 'MAINTENANCE' || item.status === 'NO_DATA') return 'degraded';
  return 'unavailable';
}

export function ProviderHealthPanel({ className = '' }: { className?: string }) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [providers, setProviders] = useState<ProviderItem[]>([]);

  const load = async () => {
    setState('loading');
    try {
      const response = await fetch('/api/market/providers/health', { credentials: 'same-origin', headers: { accept: 'application/json' } });
      const payload = await response.json().catch(() => ({})) as ProviderHealthResponse;
      if (!response.ok || payload.ok !== true || !Array.isArray(payload.providers)) {
        setState('unavailable');
        return;
      }
      setProviders(payload.providers.map(providerItem).filter((item): item is ProviderItem => item !== null));
      setState('ready');
    } catch {
      setState('unavailable');
    }
  };

  return (
    <section className={`${styles.card} ${className}`} aria-labelledby="ai-analyst-provider-health-title" data-testid="ai-analyst-provider-health">
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{copy.overview.snapshot}</p>
          <h2 id="ai-analyst-provider-health-title">{copy.overview.providerHealth}</h2>
          <p>{copy.overview.snapshotBody}</p>
        </div>
        <Database aria-hidden="true" className={styles.placeholderIcon} />
      </header>
      {state === 'idle' ? <button className={styles.secondaryAction} type="button" onClick={() => void load()}><Activity size={16} aria-hidden="true" />{copy.actions.open}</button> : null}
      {state === 'loading' ? <p className={styles.statusRail} role="status"><Clock3 size={16} aria-hidden="true" />{copy.overview.providersLoading}</p> : null}
      {state === 'unavailable' ? <p className={styles.errorText} role="status"><AlertTriangle size={16} aria-hidden="true" />{copy.overview.providersUnavailable}</p> : null}
      {state === 'unavailable' ? <button className={styles.secondaryAction} type="button" onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />{copy.actions.retry}</button> : null}
      {state === 'ready' && providers.length === 0 ? <p className={styles.statusRail}>{copy.overview.providersNone}</p> : null}
      {state === 'ready' && providers.length > 0 ? (
        <ul className={styles.providerList}>
          {providers.map(provider => {
            const tone = toneForProvider(provider);
            return (
              <li className={styles.providerItem} key={provider.provider}>
                <span className={styles.providerIdentity}>
                  <strong>{provider.displayName}</strong>
                  <small className={styles.numeric} dir="ltr">{provider.lastCheckedAt ? aiAnalystTimestamp(locale, provider.lastCheckedAt) : provider.provider}</small>
                </span>
                <span className={styles.providerMetrics}>
                  <span className={styles.statusPill} data-tone={tone}>{copy.status[tone]}</span>
                  <span className={styles.tag} dir="ltr">{provider.status}</span>
                  {provider.latencyMs !== null ? <span className={styles.metricPill} dir="ltr">{aiAnalystNumber(locale, provider.latencyMs)} ms</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
