'use client';

import { Database, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

type Entry = {
  workspace: 'finance' | 'trader' | 'business';
  source: string;
  recordCount: number | null;
  asOf: string | null;
  ageDays: number | null;
  stale: boolean;
  veryStale: boolean;
  readinessScore: number;
};
type Provenance = { generatedAt: string; entries: Entry[] };

const LABELS: Record<string, string> = {
  monthly_income_sources: 'Income', expense_items: 'Expenses', debts: 'Debts', savings_items: 'Savings', investment_items: 'Investments',
  market_watchlist: 'Watchlist', market_price_alerts: 'Market alerts', projects: 'Projects', project_funding_readiness: 'Funding readiness',
};

export function EconomicEvidenceProvenance() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const [data, setData] = useState<Provenance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const locale = lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'ar-KW';
  const text = useMemo(() => lang === 'fr'
    ? { title: 'Sources des analyses', subtitle: 'Sources, volumes et fraîcheur utilisés par SFM — sans exposer les données brutes.', records: 'enregistrements', current: 'à jour', stale: 'ancien', unavailable: 'Source indisponible', loading: 'Chargement des sources...' }
    : lang === 'en'
      ? { title: 'Evidence provenance', subtitle: 'Sources, record counts, and freshness used by SFM — without exposing raw private records.', records: 'records', current: 'current', stale: 'stale', unavailable: 'Source unavailable', loading: 'Loading evidence sources...' }
      : { title: 'مصادر الأدلة', subtitle: 'المصادر وعدد السجلات وحداثتها التي يعتمد عليها SFM — بدون كشف بياناتك الخام.', records: 'سجل', current: 'حديث', stale: 'قديم', unavailable: 'المصدر غير متاح', loading: 'جاري تحميل المصادر...' }, [lang]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(false);
    void fetch('/api/economic-intelligence/provenance', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async response => response.ok ? response.json() : Promise.reject(new Error('failed')))
      .then(payload => { if (!cancelled) { setData(payload.provenance ?? null); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [authLoading, user]);

  if (authLoading || !user) return null;
  if (loading) return <section className="prov loading" dir={dir}><Loader2 className="spin" size={16} />{text.loading}<style jsx>{styles}</style></section>;
  if (error || !data) return <section className="prov" dir={dir}>{text.unavailable}<style jsx>{styles}</style></section>;

  const groups = ['finance', 'trader', 'business'] as const;
  return <section className="prov" dir={dir} aria-label={text.title}>
    <div className="head"><div><span><Database size={15} />Evidence</span><h2>{text.title}</h2><p>{text.subtitle}</p></div></div>
    <div className="groups">
      {groups.map(workspace => <article key={workspace}><h3>{workspace.toUpperCase()}</h3><div className="items">
        {data.entries.filter(entry => entry.workspace === workspace).map(entry => <div className="item" key={entry.source}>
          <div><strong>{LABELS[entry.source] ?? entry.source}</strong><small>{entry.recordCount ?? '—'} {text.records}</small></div>
          <div className="meta"><span>{entry.veryStale || entry.stale ? text.stale : text.current}</span><small>{entry.asOf ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(entry.asOf)) : '—'}</small></div>
        </div>)}
      </div></article>)}
    </div>
    <style jsx>{styles}</style>
  </section>;
}

const styles = `
.prov{display:grid;gap:14px;margin:0 auto 18px;max-width:1440px;padding:18px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);color:var(--foreground)}.loading{display:flex;align-items:center;gap:8px;color:var(--foreground-muted)}.head span{display:flex;align-items:center;gap:6px;color:var(--primary);font-size:12px;font-weight:700;text-transform:uppercase}.head h2{margin:5px 0 4px;font-size:21px}.head p{margin:0;color:var(--foreground-muted);line-height:1.6}.groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.groups>article{padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.groups h3{margin:0 0 10px;font-size:12px;letter-spacing:.05em}.items{display:grid;gap:8px}.item{display:flex;justify-content:space-between;gap:12px;padding:9px;border-radius:var(--radius-control);background:var(--surface)}.item>div{display:grid;gap:3px}.item small{color:var(--foreground-muted);font-size:11px}.meta{text-align:end}.meta span{font-size:11px;font-weight:700;color:var(--foreground-secondary)}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:900px){.groups{grid-template-columns:1fr}}`;
