'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, DatabaseZap, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import { useLanguage } from '@/hooks/useLanguage';
import { t, type Lang } from '@/lib/translations';

type ProviderStatus = {
  providerId: string;
  providerName: string;
  sourceType: string;
  sourceDomain: string | null;
  reliabilityScore: number;
  priority: number;
  officialSource: boolean;
  supportedMarkets: string[];
  enabled: boolean;
  healthStatus: string;
  lastSuccessfulFetch: string | null;
  lastFailedFetch: string | null;
  averageLatency: number | null;
  failureCount: number;
  rateLimitState: string;
  disabledUntil: string | null;
  latestErrorSummary: string | null;
  latestFetch: {
    startedAt: string | null;
    status: string;
    fetched: number;
    rejected: number;
    deduplicated: number;
    saved: number;
  } | null;
};

type StatusResponse = {
  ok?: boolean;
  available?: boolean;
  generatedAt?: string;
  providers?: ProviderStatus[];
  summary?: {
    total: number;
    enabled: number;
    healthy: number;
    degraded: number;
    attention: number;
  };
};

const SOURCE_TYPES = new Set([
  'official_exchange', 'regulator', 'central_bank', 'government_agency', 'regulatory_filing',
  'company_ir', 'corporate_press_release', 'financial_news_agency', 'financial_publication',
  'market_data_provider', 'regional_market_publication', 'industry_publication', 'public_rss',
  'social_signal', 'other',
]);

const STATUS_VALUES = new Set([
  'healthy', 'degraded', 'unhealthy', 'rate_limited', 'disabled', 'unknown', 'success',
  'completed', 'partial', 'failed', 'skipped', 'available', 'approaching_limit', 'limited',
  'temporarily_limited',
]);

function sourceLabel(sourceType: string, language: Lang) {
  const value = SOURCE_TYPES.has(sourceType) ? sourceType : 'other';
  return t(`admin_news_source_${value}`, language);
}

function statusLabel(status: string | null | undefined, language: Lang, fallback: string) {
  if (!status || !STATUS_VALUES.has(status)) return fallback;
  return t(`admin_news_status_${status}`, language);
}

function dateText(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

const EMPTY_SUMMARY = { total: 0, enabled: 0, healthy: 0, degraded: 0, attention: 0 };

export default function NewsProvidersAdminClient() {
  const { lang, dir } = useLanguage();
  const language = (lang === 'ar' || lang === 'fr' ? lang : 'en') as Lang;
  const text = useMemo(() => ({
    title: t('admin_news_providers_title', language),
    subtitle: t('admin_news_providers_subtitle', language),
    refresh: t('admin_news_providers_refresh', language),
    refreshing: t('admin_news_providers_refreshing', language),
    updated: t('admin_news_providers_updated', language),
    total: t('admin_news_providers_total', language),
    enabled: t('admin_news_providers_enabled', language),
    healthy: t('admin_news_providers_healthy', language),
    attention: t('admin_news_providers_attention', language),
    partial: t('admin_news_providers_partial', language),
    unavailable: t('admin_news_providers_unavailable', language),
    empty: t('admin_news_providers_empty', language),
    official: t('admin_news_providers_official', language),
    active: t('admin_news_providers_active', language),
    disabled: t('admin_news_providers_disabled', language),
    reliability: t('admin_news_providers_reliability', language),
    priority: t('admin_news_providers_priority', language),
    markets: t('admin_news_providers_markets', language),
    allMarkets: t('admin_news_providers_all_markets', language),
    lastSuccess: t('admin_news_providers_last_success', language),
    lastFailure: t('admin_news_providers_last_failure', language),
    averageLatency: t('admin_news_providers_average_latency', language),
    failureCount: t('admin_news_providers_failure_count', language),
    rateLimit: t('admin_news_providers_rate_limit', language),
    disabledUntil: t('admin_news_providers_disabled_until', language),
    latestError: t('admin_news_providers_latest_error', language),
    latestRun: t('admin_news_providers_latest_run', language),
    fetched: t('admin_news_providers_fetched', language),
    rejected: t('admin_news_providers_rejected', language),
    deduplicated: t('admin_news_providers_deduplicated', language),
    saved: t('admin_news_providers_saved', language),
    unknown: t('admin_news_providers_unknown', language),
    never: t('admin_news_providers_never', language),
    milliseconds: t('admin_news_providers_milliseconds', language),
  }), [language]);
  const locale = language === 'ar' ? 'ar-KW-u-nu-latn' : language === 'fr' ? 'fr-FR' : 'en-US';
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch('/api/admin/market-news/providers', { cache: 'no-store', signal });
      const payload = await response.json().catch(() => null) as StatusResponse | null;
      if (!response.ok || !payload?.ok) throw new Error('status_unavailable');
      setData(payload);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setFailed(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const providers = data?.providers ?? [];
  // The server (/api/admin/market-news/providers) always computes `summary` itself — this is
  // just a safe zero-state default for the loading/failed-fetch window, never a recomputation.
  const summary = data?.summary ?? EMPTY_SUMMARY;
  const summaryCards = useMemo(() => [
    { label: text.total, value: summary.total, icon: DatabaseZap },
    { label: text.enabled, value: summary.enabled, icon: ShieldCheck },
    { label: text.healthy, value: summary.healthy, icon: Activity },
    { label: text.attention, value: summary.attention, icon: TriangleAlert },
  ], [summary, text]);

  return (
    <AdminDashboardShell ariaLabel={text.title} contentClassName="news-provider-admin-content" contentStyle={{ width: '100%', maxWidth: '100%' }}>
      <div className="news-provider-admin" dir={dir}>
        <header className="news-provider-hero">
          <div>
            <span className="news-provider-eyebrow"><Activity size={16} /> {text.updated}: {dateText(data?.generatedAt, locale, text.never)}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            {loading ? text.refreshing : text.refresh}
          </button>
        </header>

        <section className="news-provider-summary" aria-label={text.title}>
          {summaryCards.map(card => (
            <article key={card.label}>
              <card.icon size={20} />
              <strong>{card.value.toLocaleString(locale)}</strong>
              <span>{card.label}</span>
            </article>
          ))}
        </section>

        {data?.available === false && providers.length > 0 ? <div className="news-provider-notice warning"><TriangleAlert size={20} /><p>{text.partial}</p></div> : null}
        {failed || (!loading && data?.available === false && providers.length === 0) ? <div className="news-provider-notice danger"><TriangleAlert size={20} /><p>{text.unavailable}</p></div> : null}
        {!loading && !failed && providers.length === 0 && data?.available !== false ? <div className="news-provider-notice"><DatabaseZap size={20} /><p>{text.empty}</p></div> : null}

        <section className="news-provider-grid">
          {providers.map(provider => {
            const providerStatusLabel = statusLabel(provider.healthStatus, language, text.unknown);
            const providerSourceLabel = sourceLabel(provider.sourceType, language);
            return (
              <article className="news-provider-card" key={provider.providerId}>
                <div className="news-provider-card-head">
                  <div>
                    <span className={`health-dot ${provider.healthStatus}`} aria-hidden="true" />
                    <div>
                      <h2 title={provider.providerName}>{provider.providerName}</h2>
                      <p>{providerSourceLabel}{provider.sourceDomain ? ` · ${provider.sourceDomain}` : ''}</p>
                    </div>
                  </div>
                  <span className={`status-chip ${provider.healthStatus}`}>{providerStatusLabel}</span>
                </div>

                <div className="news-provider-flags">
                  <span className={provider.enabled ? 'enabled' : 'disabled'}>{provider.enabled ? text.active : text.disabled}</span>
                  {provider.officialSource ? <span className="official"><ShieldCheck size={14} /> {text.official}</span> : null}
                  <span>{text.reliability}: {(provider.reliabilityScore * 100).toLocaleString(locale, { maximumFractionDigits: 0 })}%</span>
                  <span>{text.priority}: {provider.priority.toLocaleString(locale)}</span>
                </div>

                <div className="news-provider-markets">
                  <strong>{text.markets}</strong>
                  <div>{provider.supportedMarkets.length ? provider.supportedMarkets.map(market => <span key={market}>{market}</span>) : <span>{text.allMarkets}</span>}</div>
                </div>

                <dl className="news-provider-details">
                  <div><dt>{text.lastSuccess}</dt><dd>{dateText(provider.lastSuccessfulFetch, locale, text.never)}</dd></div>
                  <div><dt>{text.lastFailure}</dt><dd>{dateText(provider.lastFailedFetch, locale, text.never)}</dd></div>
                  <div><dt>{text.averageLatency}</dt><dd>{provider.averageLatency == null ? text.unknown : `${provider.averageLatency.toLocaleString(locale)} ${text.milliseconds}`}</dd></div>
                  <div><dt>{text.failureCount}</dt><dd>{provider.failureCount.toLocaleString(locale)}</dd></div>
                  <div><dt>{text.rateLimit}</dt><dd>{statusLabel(provider.rateLimitState, language, text.unknown)}</dd></div>
                  {provider.disabledUntil ? <div><dt>{text.disabledUntil}</dt><dd>{dateText(provider.disabledUntil, locale, text.unknown)}</dd></div> : null}
                </dl>

                {provider.latestFetch ? (
                  <div className="news-provider-run">
                    <div><strong><Clock3 size={15} /> {text.latestRun}</strong><span>{statusLabel(provider.latestFetch.status, language, text.unknown)}</span></div>
                    <ul>
                      <li><b>{provider.latestFetch.fetched.toLocaleString(locale)}</b><span>{text.fetched}</span></li>
                      <li><b>{provider.latestFetch.rejected.toLocaleString(locale)}</b><span>{text.rejected}</span></li>
                      <li><b>{provider.latestFetch.deduplicated.toLocaleString(locale)}</b><span>{text.deduplicated}</span></li>
                      <li><b>{provider.latestFetch.saved.toLocaleString(locale)}</b><span>{text.saved}</span></li>
                    </ul>
                  </div>
                ) : null}

                {provider.latestErrorSummary ? <div className="news-provider-error"><strong>{text.latestError}</strong><p>{provider.latestErrorSummary}</p></div> : null}
              </article>
            );
          })}
        </section>
      </div>

      <style jsx>{`
        :global(.news-provider-admin-content){width:100%!important;max-width:none!important;min-width:0!important}
        .news-provider-admin{width:100%;max-width:1480px;margin:0 auto;padding:clamp(16px,2.4vw,32px);padding-bottom:calc(40px + env(safe-area-inset-bottom));display:grid;gap:18px;color:var(--foreground);font-family:var(--font-ui);overflow-x:hidden}
        .news-provider-hero{display:flex;align-items:center;justify-content:space-between;gap:20px;border:1px solid var(--border);border-radius:var(--radius-panel);padding:clamp(20px,3vw,34px);background:var(--surface);box-shadow:var(--shadow-card)}
        .news-provider-hero>div{min-width:0}.news-provider-eyebrow{display:inline-flex;align-items:center;gap:7px;color:var(--accent);font-size:13px;font-weight:600}.news-provider-hero h1{margin:8px 0 5px;font-size:clamp(25px,3vw,38px);line-height:1.2;font-weight:700}.news-provider-hero p{margin:0;max-width:820px;color:var(--foreground-muted);font-size:15px;line-height:1.75;font-weight:400}
        .news-provider-hero button{min-height:44px;min-width:150px;border:1px solid var(--primary);border-radius:var(--radius-control);padding:0 16px;background:var(--primary);color:var(--primary-foreground);display:inline-flex;align-items:center;justify-content:center;gap:8px;font:600 14px var(--font-ui);cursor:pointer;white-space:nowrap}.news-provider-hero button:hover{background:var(--primary-hover)}.news-provider-hero button:focus-visible{outline:none;box-shadow:var(--focus-shadow)}.news-provider-hero button:disabled{opacity:.65;cursor:wait}.spinning{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .news-provider-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.news-provider-summary article{min-width:0;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);padding:16px;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:center;box-shadow:var(--shadow-card)}.news-provider-summary svg{grid-row:1/3;color:var(--primary)}.news-provider-summary strong{font-family:var(--font-data);font-size:25px;font-weight:600}.news-provider-summary span{color:var(--foreground-muted);font-size:13px;font-weight:500}
        .news-provider-notice{min-height:58px;border:1px solid var(--info);border-radius:var(--radius-card);padding:13px 16px;display:flex;align-items:center;gap:10px;background:var(--info-soft);color:var(--info)}.news-provider-notice.warning{border-color:var(--warning);background:var(--warning-soft);color:var(--warning)}.news-provider-notice.danger{border-color:var(--danger);background:var(--danger-soft);color:var(--danger)}.news-provider-notice p{margin:0;font-size:14px;line-height:1.65;font-weight:500}
        .news-provider-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.news-provider-card{min-width:0;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);padding:18px;display:grid;gap:15px;box-shadow:var(--shadow-card)}
        .news-provider-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.news-provider-card-head>div{display:flex;align-items:flex-start;gap:10px;min-width:0}.health-dot{width:10px;height:10px;border-radius:var(--radius-pill);background:var(--provider-disabled);margin-top:7px;flex:0 0 auto}.health-dot.healthy{background:var(--provider-connected)}.health-dot.degraded,.health-dot.rate_limited{background:var(--provider-degraded)}.health-dot.unhealthy{background:var(--provider-disconnected)}.news-provider-card h2{margin:0;max-width:440px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18px;font-weight:600}.news-provider-card-head p{margin:3px 0 0;overflow-wrap:anywhere;color:var(--foreground-muted);font-size:12px;font-weight:400}.status-chip{flex:0 0 auto;border-radius:var(--radius-pill);background:var(--surface-muted);padding:6px 10px;font-size:12px;font-weight:600}.status-chip.healthy{color:var(--success);background:var(--success-soft)}.status-chip.degraded,.status-chip.rate_limited{color:var(--warning);background:var(--warning-soft)}.status-chip.unhealthy{color:var(--danger);background:var(--danger-soft)}
        .news-provider-flags{display:flex;flex-wrap:wrap;gap:7px}.news-provider-flags span,.news-provider-markets span{min-height:28px;border:1px solid var(--border);border-radius:var(--radius-pill);padding:4px 9px;display:inline-flex;align-items:center;gap:5px;color:var(--foreground-muted);font-size:12px;font-weight:500}.news-provider-flags .enabled{color:var(--success);border-color:var(--success);background:var(--success-soft)}.news-provider-flags .disabled{color:var(--danger);border-color:var(--danger);background:var(--danger-soft)}.news-provider-flags .official{color:var(--info);border-color:var(--info);background:var(--info-soft)}
        .news-provider-markets{display:grid;gap:7px}.news-provider-markets>strong{font-size:12px;font-weight:600}.news-provider-markets>div{display:flex;flex-wrap:wrap;gap:6px}
        .news-provider-details{margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.news-provider-details div{min-width:0;border-radius:var(--radius-control);background:var(--surface-muted);padding:10px}.news-provider-details dt{color:var(--foreground-muted);font-size:12px;font-weight:500}.news-provider-details dd{margin:4px 0 0;overflow-wrap:anywhere;font-size:13px;font-weight:500}
        .news-provider-run{border-top:1px solid var(--border);padding-top:13px;display:grid;gap:10px}.news-provider-run>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.news-provider-run strong{display:inline-flex;align-items:center;gap:6px;font-size:12px}.news-provider-run>div>span{font-size:12px;color:var(--foreground-muted);font-weight:500}.news-provider-run ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.news-provider-run li{min-width:0;border-radius:var(--radius-control);background:var(--primary-soft);padding:8px;display:grid;gap:2px;text-align:center}.news-provider-run b{font-family:var(--font-data);font-size:15px}.news-provider-run li span{overflow:hidden;text-overflow:ellipsis;color:var(--foreground-muted);font-size:12px;font-weight:400}
        .news-provider-error{border:1px solid var(--danger);border-radius:var(--radius-control);background:var(--danger-soft);padding:11px;color:var(--danger)}.news-provider-error strong{font-size:12px}.news-provider-error p{margin:4px 0 0;overflow-wrap:anywhere;font-size:12px;line-height:1.6;font-weight:400}
        @media(max-width:1000px){.news-provider-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.news-provider-grid{grid-template-columns:1fr}}
        @media(max-width:640px){.news-provider-admin{padding:16px}.news-provider-hero{display:grid;padding:20px}.news-provider-hero button{width:100%}.news-provider-summary{grid-template-columns:1fr 1fr}.news-provider-summary article{padding:13px}.news-provider-card{padding:15px}.news-provider-card-head{display:grid}.status-chip{width:max-content}.news-provider-details{grid-template-columns:1fr}.news-provider-run ul{grid-template-columns:1fr 1fr}}
      `}</style>
    </AdminDashboardShell>
  );
}
