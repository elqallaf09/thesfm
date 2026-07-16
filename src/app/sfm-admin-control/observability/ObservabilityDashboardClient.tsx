'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import styles from './observability.module.css';

type Summary = { samples: number; p50: number | null; p75: number | null; p95: number | null; failureRate: number; fallbackRate: number; cacheHitRate: number; lastSeen: string | null };
type Payload = {
  hasData: boolean; configured: boolean; environment: string; rangeHours: number; sampleCount: number; truncated?: boolean; generatedAt: string; lastEventAt?: string | null;
  vitals: Array<{ name: string; samples: number; p75: number | null; good: number; needsImprovement: number; poor: number }>;
  routes: Array<Summary & { route: string; transitionP75: number | null; hydrationProxyP75: number | null; errors: number }>;
  errors: Array<{ signature: string; frequency: number; firstSeen: string | null; lastSeen: string | null; routes: string[]; browsers: string[]; deployments: string[] }>;
  apis: Array<Summary & { route: string }>;
  providers: Array<Summary & { provider: string }>;
  deployments: Array<Summary & { deploymentSha: string }>;
  deploymentComparison: Array<{ metric: string; current: number; previous: number; delta: number; status: 'improved' | 'regressed' | 'stable'; currentSamples: number; previousSamples: number }>;
  distributions: { browsers: Array<{ name: string; samples: number }>; devices: Array<{ name: string; samples: number }>; networks: Array<{ name: string; samples: number }> };
  alerts: Array<{ alert_key: string; severity: string; metric_name: string; observed_value: number; threshold_value: number; sample_count: number; last_seen_at: string }>;
};

const COPY = {
  ar: { title: 'مراقبة الإنتاج', subtitle: 'مقاييس تشغيلية مجمّعة وآمنة للخصوصية من تجارب المستخدمين الحقيقية.', samples: 'العينات', updated: 'آخر تحديث', empty: 'لم تصل بيانات كافية لهذه البيئة والفترة بعد.', unconfigured: 'مخطط المراقبة غير متاح بعد.', offline: 'تعذر تحديث بيانات المراقبة. تحقق من الاتصال ثم أعد المحاولة.', vitals: 'مؤشرات الويب', routes: 'المسارات', errors: 'الأخطاء', apis: 'واجهات API', providers: 'المزوّدون', deployments: 'عمليات النشر', distributions: 'التوزيعات', alerts: 'التنبيهات', route: 'المسار', metric: 'المقياس', p75: 'P75', p95: 'P95', count: 'العدد', failure: 'معدل الفشل', fallback: 'معدل البديل', cache: 'إصابة الذاكرة المؤقتة', refresh: 'تحديث', production: 'الإنتاج', preview: 'المعاينة', insufficient: 'غير كافٍ', proxy: 'مؤشر تقريبي', noAlerts: 'لا توجد تنبيهات نشطة.', privacy: 'لا تعرض هذه اللوحة هويات الحسابات أو القيم المالية أو عناوين URL الخام.', good: 'جيد', needs: 'يحتاج تحسيناً', poor: 'ضعيف' },
  en: { title: 'Production observability', subtitle: 'Aggregated, privacy-safe operational measurements from real user experiences.', samples: 'Samples', updated: 'Updated', empty: 'No sufficient data has arrived for this environment and period yet.', unconfigured: 'The observability schema is not available yet.', offline: 'Observability data could not be refreshed. Check the connection and try again.', vitals: 'Web Vitals', routes: 'Routes', errors: 'Errors', apis: 'APIs', providers: 'Providers', deployments: 'Deployments', distributions: 'Distributions', alerts: 'Alerts', route: 'Route', metric: 'Metric', p75: 'P75', p95: 'P95', count: 'Count', failure: 'Failure rate', fallback: 'Fallback rate', cache: 'Cache hit rate', refresh: 'Refresh', production: 'Production', preview: 'Preview', insufficient: 'Insufficient', proxy: 'Proxy', noAlerts: 'No active alerts.', privacy: 'This dashboard never exposes account identities, financial values, or raw URLs.', good: 'Good', needs: 'Needs improvement', poor: 'Poor' },
  fr: { title: 'Observabilité de production', subtitle: 'Mesures opérationnelles agrégées et respectueuses de la vie privée issues des expériences réelles.', samples: 'Échantillons', updated: 'Mis à jour', empty: 'Aucune donnée suffisante reçue pour cet environnement et cette période.', unconfigured: 'Le schéma d’observabilité n’est pas encore disponible.', offline: 'Impossible d’actualiser les données d’observabilité. Vérifiez la connexion puis réessayez.', vitals: 'Signaux Web', routes: 'Routes', errors: 'Erreurs', apis: 'API', providers: 'Fournisseurs', deployments: 'Déploiements', distributions: 'Répartitions', alerts: 'Alertes', route: 'Route', metric: 'Mesure', p75: 'P75', p95: 'P95', count: 'Nombre', failure: 'Taux d’échec', fallback: 'Taux de secours', cache: 'Taux de cache', refresh: 'Actualiser', production: 'Production', preview: 'Aperçu', insufficient: 'Insuffisant', proxy: 'Indicateur', noAlerts: 'Aucune alerte active.', privacy: 'Ce tableau n’expose jamais les identités, valeurs financières ou URL brutes.', good: 'Bon', needs: 'À améliorer', poor: 'Faible' },
} as const;

function number(value: number | null, suffix = ' ms') { return value == null ? '—' : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: value < 10 ? 2 : 0 }).format(value)}${suffix}`; }
function rate(value: number) { return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value); }
function date(value?: string | null) { return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'; }

export default function ObservabilityDashboardClient() {
  const { lang, dir } = useLanguage();
  const text = COPY[lang as keyof typeof COPY] ?? COPY.en;
  const [environment, setEnvironment] = useState<'production' | 'preview'>('production');
  const [range, setRange] = useState<'24h' | '48h' | '7d'>('24h');
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(`/api/admin/observability?environment=${environment}&range=${range}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('load failed');
      setData(await response.json() as Payload);
    } catch { setLoadError(true); } finally { setLoading(false); }
  }, [environment, range]);
  useEffect(() => { void load(); }, [load]);

  return <AdminDashboardShell ariaLabel={text.title} dir={dir} contentStyle={{ maxWidth: 'none', width: '100%' }}>
    <div className={styles.dashboard} aria-busy={loading}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}><Activity aria-hidden="true" /> Phase 5.0B</p><h1>{text.title}</h1><p>{text.subtitle}</p></div>
        <div className={styles.controls}>
          <label><span className="sr-only">Environment</span><select value={environment} onChange={event => setEnvironment(event.target.value as 'production' | 'preview')}><option value="production">{text.production}</option><option value="preview">{text.preview}</option></select></label>
          <label><span className="sr-only">Time range</span><select value={range} onChange={event => setRange(event.target.value as '24h' | '48h' | '7d')}><option value="24h">24 h</option><option value="48h">48 h</option><option value="7d">7 d</option></select></label>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw aria-hidden="true" className={loading ? styles.spin : ''} />{text.refresh}</Button>
        </div>
      </header>
      <div className={styles.privacy}><ShieldCheck aria-hidden="true" /><span>{text.privacy}</span></div>
      {!loading && loadError && <section className={styles.state} role="status"><AlertTriangle aria-hidden="true" /><h2>{text.offline}</h2></section>}
      {data && <div className={styles.meta}><span>{text.samples}: <b>{new Intl.NumberFormat('en-US').format(data.sampleCount)}</b></span><span>{text.updated}: <b>{date(data.generatedAt)}</b></span>{data.truncated && <span>20,000+ samples</span>}</div>}
      {!loading && data && !data.configured && <section className={styles.state}><AlertTriangle aria-hidden="true" /><h2>{text.unconfigured}</h2></section>}
      {!loading && data?.configured && !data.hasData && <section className={styles.state}><Activity aria-hidden="true" /><h2>{text.empty}</h2><p>{environment === 'production' ? text.production : text.preview} · {range}</p></section>}
      {data?.hasData && <>
        <section aria-labelledby="vitals-heading"><h2 id="vitals-heading">{text.vitals}</h2><div className={styles.cards}>{data.vitals.map(vital => <article className={styles.card} key={vital.name}><div><h3>{vital.name}</h3><span>{text.samples}: {vital.samples}</span></div><strong>{number(vital.p75, vital.name === 'CLS' ? '' : ' ms')}</strong><p>P75 · {vital.p75 == null ? text.insufficient : `${text.good} ${vital.good} · ${text.needs} ${vital.needsImprovement} · ${text.poor} ${vital.poor}`}</p></article>)}</div></section>
        <DataSection title={text.routes} rows={data.routes.map(row => [row.route, number(row.transitionP75), `${number(row.hydrationProxyP75)} (${text.proxy})`, String(row.samples), String(row.errors)])} headers={[text.route, text.p75, text.proxy, text.samples, text.errors]} />
        <DataSection title={text.errors} rows={data.errors.map(row => [row.signature, row.routes.join(', '), row.browsers.join(', '), String(row.frequency), date(row.lastSeen)])} headers={['Signature', text.routes, 'Browser', text.count, text.updated]} />
        <DataSection title={text.apis} rows={data.apis.map(row => [row.route, number(row.p75), number(row.p95), rate(row.failureRate), rate(row.cacheHitRate), String(row.samples)])} headers={[text.route, text.p75, text.p95, text.failure, text.cache, text.samples]} />
        <DataSection title={text.providers} rows={data.providers.map(row => [row.provider, number(row.p75), rate(row.failureRate), rate(row.fallbackRate), rate(row.cacheHitRate), String(row.samples)])} headers={[text.providers, text.p75, text.failure, text.fallback, text.cache, text.samples]} />
        <DataSection title={text.deployments} rows={data.deployments.map(row => [row.deploymentSha.slice(0, 12), String(row.samples), number(row.p75), rate(row.failureRate), date(row.lastSeen)])} headers={['SHA', text.samples, text.p75, text.failure, text.updated]} />
        {data.deploymentComparison.length > 0 && <DataSection title={`${text.deployments} · comparison`} rows={data.deploymentComparison.map(row => [row.metric, number(row.current, row.metric.startsWith('CLS') ? '' : ' ms'), number(row.previous, row.metric.startsWith('CLS') ? '' : ' ms'), rate(row.delta), row.status, `${row.currentSamples} / ${row.previousSamples}`])} headers={[text.metric, 'Current', 'Previous', 'Delta', 'Status', text.samples]} />}
        <section aria-labelledby="distribution-heading"><h2 id="distribution-heading">{text.distributions}</h2><div className={styles.cards}>{(['browsers', 'devices', 'networks'] as const).map(kind => <article className={styles.card} key={kind}><h3>{kind}</h3><ul className={styles.list}>{data.distributions[kind].map(item => <li key={item.name}><span>{item.name}</span><b>{item.samples}</b></li>)}</ul></article>)}</div></section>
        <section aria-labelledby="alerts-heading"><h2 id="alerts-heading">{text.alerts}</h2>{data.alerts.length ? <div className={styles.alerts}>{data.alerts.map(alert => <article key={alert.alert_key}><AlertTriangle aria-hidden="true" /><div><h3>{alert.metric_name}</h3><p>{number(alert.observed_value)} / {number(alert.threshold_value)} · n={alert.sample_count} · {date(alert.last_seen_at)}</p></div><b>{alert.severity}</b></article>)}</div> : <p className={styles.state}>{text.noAlerts}</p>}</section>
      </>}
    </div>
  </AdminDashboardShell>;
}

function DataSection({ title, rows, headers }: { title: string; rows: string[][]; headers: string[] }) {
  return <section aria-labelledby={`${title.replace(/\s+/g, '-')}-heading`}><h2 id={`${title.replace(/\s+/g, '-')}-heading`}>{title}</h2><div className={styles.tableWrap}><table><caption className="sr-only">{title}</caption><thead><tr>{headers.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex} dir={cellIndex === 0 ? 'ltr' : undefined}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}
