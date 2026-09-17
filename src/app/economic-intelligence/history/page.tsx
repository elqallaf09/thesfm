'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Archive, ArrowLeft, ArrowRight, CheckCircle2, Database, History, Loader2, RefreshCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

type Lang = 'ar' | 'en' | 'fr';
type Snapshot = {
  version: 1;
  capturedAt: string;
  readiness: { overall: number; finance: number; trader: number; business: number };
  provenance: Array<{ workspace: string; source: string; recordCount: number | null; asOf: string | null; stale: boolean; veryStale: boolean }>;
};
type Drift = {
  available: boolean;
  readiness: Array<{ workspace: string; historical: number | null; current: number | null; delta: number | null; direction: 'improved' | 'degraded' | 'unchanged' | 'unavailable' }>;
  summary: { improved: number; degraded: number; unchanged: number; unavailable: number };
  causalClaim: false;
};
type Entry = {
  id: string;
  eventKey: string;
  fingerprint: string | null;
  code: string | null;
  severity: string | null;
  actionUrl: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
  sources: string[];
  evidenceSnapshot: Snapshot | null;
  historicalEvidenceAvailable: boolean;
  evidenceDrift?: Drift;
};
type ArchiveState = { key: string; status: 'loading' | 'ready' | 'error'; entries: Entry[] };
const EMPTY_ENTRIES: Entry[] = [];

const TEXT = {
  ar: { title: 'أرشيف الموجز الاقتصادي', subtitle: 'تاريخ التغييرات المادية في الأولويات الاقتصادية. التكرار هنا نمط تنبيه وليس إثبات نتيجة مالية.', back: 'العودة لمركز الذكاء الاقتصادي', active: 'نشط', resolved: 'محلول', recurring: 'الأكثر تكراراً', history: 'التاريخ', empty: 'لا يوجد تاريخ مادي مسجل حتى الآن.', loading: 'جاري تحميل الأرشيف...', error: 'تعذّر تحميل الأرشيف. لا يمكن تحديد ما إذا كانت توجد سجلات الآن.', retry: 'إعادة المحاولة', signIn: 'سجّل الدخول لعرض أرشيفك الاقتصادي.', login: 'تسجيل الدخول', occurrences: 'مرات', finance: 'Finance', trader: 'Trader', business: 'Business', snapshot: 'أدلة وقت الحدث', readiness: 'الجاهزية وقتها', sourcesCount: 'مصادر', snapshotUnavailable: 'لقطة الأدلة التاريخية غير متاحة لهذا السجل القديم.', drift: 'التغير منذ وقت الحدث', now: 'الآن', improved: 'تحسن', degraded: 'تراجع', unchanged: 'ثابت', nonCausal: 'مقارنة وصفية فقط ولا تثبت أن القرار سبب التغير.' },
  en: { title: 'Economic Brief Archive', subtitle: 'History of material economic-priority changes. Recurrence is an alert pattern, not proof of a financial outcome.', back: 'Back to Economic Intelligence', active: 'Active', resolved: 'Resolved', recurring: 'Most recurring', history: 'History', empty: 'No material brief history is recorded yet.', loading: 'Loading archive...', error: 'The archive could not be loaded. Whether records exist is currently unknown.', retry: 'Try again', signIn: 'Sign in to view your economic archive.', login: 'Sign in', occurrences: 'occurrences', finance: 'Finance', trader: 'Trader', business: 'Business', snapshot: 'Evidence at that time', readiness: 'Readiness then', sourcesCount: 'sources', snapshotUnavailable: 'Historical evidence snapshot is unavailable for this older record.', drift: 'Change since that event', now: 'now', improved: 'improved', degraded: 'degraded', unchanged: 'unchanged', nonCausal: 'Descriptive comparison only; it does not prove the decision caused the change.' },
  fr: { title: 'Archive du brief économique', subtitle: 'Historique des changements matériels de priorité économique. La récurrence est un motif d’alerte, pas une preuve de résultat financier.', back: 'Retour à Economic Intelligence', active: 'Actif', resolved: 'Résolu', recurring: 'Plus récurrents', history: 'Historique', empty: 'Aucun historique matériel enregistré pour le moment.', loading: 'Chargement de l’archive...', error: 'Impossible de charger l’archive. La présence de données est actuellement inconnue.', retry: 'Réessayer', signIn: 'Connectez-vous pour consulter votre archive économique.', login: 'Se connecter', occurrences: 'occurrences', finance: 'Finance', trader: 'Trader', business: 'Business', snapshot: 'Preuves à ce moment', readiness: 'Préparation alors', sourcesCount: 'sources', snapshotUnavailable: 'La capture historique des preuves n’est pas disponible pour cet ancien enregistrement.', drift: 'Évolution depuis cet événement', now: 'maintenant', improved: 'améliorées', degraded: 'dégradées', unchanged: 'stables', nonCausal: 'Comparaison descriptive uniquement; elle ne prouve pas que la décision a causé le changement.' },
} as const;

function labelFor(code: string | null, locale: Lang) {
  const map: Record<string, Record<Lang, string>> = {
    market_attention_vs_low_liquidity: { ar: 'السوق مقابل السيولة', en: 'Market vs liquidity', fr: 'Marché vs liquidité' },
    market_attention_vs_debt_pressure: { ar: 'السوق مقابل ضغط الدين', en: 'Market vs debt pressure', fr: 'Marché vs pression de dette' },
    business_funding_vs_personal_liquidity: { ar: 'تمويل الأعمال مقابل السيولة', en: 'Business funding vs liquidity', fr: 'Financement business vs liquidité' },
    business_and_market_compete_for_surplus: { ar: 'الأعمال والسوق يتنافسان على الفائض', en: 'Business and markets compete for surplus', fr: 'Business et marché se disputent le surplus' },
  };
  return code ? map[code]?.[locale] ?? code : '—';
}

function dateText(value: string | null, locale: Lang) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function EconomicBriefHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar') as Lang;
  const text = TEXT[locale];
  const [attempt, setAttempt] = useState(0);
  const requestKey = user ? `${user.id}:${locale}:${attempt}` : '';
  const [archive, setArchive] = useState<ArchiveState>({ key: '', status: 'loading', entries: EMPTY_ENTRIES });
  // Hide a previous owner's or locale's records before the next effect runs.
  const current = archive.key === requestKey;
  const entries = current && archive.status === 'ready' ? archive.entries : EMPTY_ENTRIES;
  const loading = !current || archive.status === 'loading';
  const failed = current && archive.status === 'error';

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    setArchive({ key: requestKey, status: 'loading', entries: EMPTY_ENTRIES });
    void fetch(`/api/economic-intelligence/daily-brief?lang=${locale}`, {
      credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async response => {
        if (!response.ok) throw new Error('history_unavailable');
        const payload = await response.json() as { ok?: boolean; history?: { entries?: Entry[] } } | null;
        if (payload?.ok !== true || !Array.isArray(payload.history?.entries)) throw new Error('history_invalid_response');
        return payload.history.entries;
      })
      .then(loaded => { if (!cancelled) setArchive({ key: requestKey, status: 'ready', entries: loaded }); })
      .catch(() => { if (!cancelled) setArchive({ key: requestKey, status: 'error', entries: EMPTY_ENTRIES }); })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [authLoading, locale, requestKey, user]);

  const trend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) if (entry.code) counts.set(entry.code, (counts.get(entry.code) ?? 0) + 1);
    return [...counts.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  }, [entries]);

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  if (authLoading) return <DashboardPageShell ariaLabel={text.title}><div className="brief-history-loading" role="status"><Loader2 className="spin" size={20} />{text.loading}</div><style>{styles}</style></DashboardPageShell>;
  if (!user) return <DashboardPageShell ariaLabel={text.title}><section className="history-card" dir={dir}><p>{text.signIn}</p><Link href="/login?next=%2Feconomic-intelligence%2Fhistory">{text.login}</Link></section><style>{styles}</style></DashboardPageShell>;
  if (loading) return <DashboardPageShell ariaLabel={text.title}><div className="brief-history-loading" role="status"><Loader2 className="spin" size={20} />{text.loading}</div><style>{styles}</style></DashboardPageShell>;

  return <DashboardPageShell ariaLabel={text.title} contentClassName="brief-history-page">
    <section className="history-hero" dir={dir}><div><span><Archive size={15} />Economic Intelligence</span><h1>{text.title}</h1><p>{text.subtitle}</p></div><Link href="/economic-intelligence"><BackIcon size={15} />{text.back}</Link></section>
    {failed ? <section className="history-card history-error" dir={dir} role="alert"><p>{text.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}><RefreshCcw size={16} aria-hidden="true" />{text.retry}</button></section> : <>
    <section className="history-card" dir={dir}><div className="section-head"><RefreshCcw size={17} /><h2>{text.recurring}</h2></div>{trend.length === 0 ? <p className="empty">{text.empty}</p> : <div className="trend-grid">{trend.slice(0, 6).map(item => <article key={item.code}><strong>{labelFor(item.code, locale)}</strong><span>{item.count} {text.occurrences}</span></article>)}</div>}</section>
    <section className="history-card" dir={dir}><div className="section-head"><History size={17} /><h2>{text.history}</h2></div>{entries.length === 0 ? <p className="empty">{text.empty}</p> : <div className="history-list">{entries.map(entry => {
      const overallDrift = entry.evidenceDrift?.readiness.find(item => item.workspace === 'overall');
      return <article key={entry.id}><div className={`status ${entry.resolvedAt ? 'resolved' : 'active'}`}>{entry.resolvedAt ? <CheckCircle2 size={15} /> : <RefreshCcw size={15} />}{entry.resolvedAt ? text.resolved : text.active}</div><div className="history-main"><strong>{labelFor(entry.code, locale)}</strong><span>{dateText(entry.createdAt, locale)}</span><div className="sources">{entry.sources.map(source => <em key={source}>{text[source as keyof typeof text] ?? source}</em>)}</div>{entry.historicalEvidenceAvailable && entry.evidenceSnapshot ? <><div className="snapshot"><Database size={14} /><div><strong>{text.snapshot}</strong><span>{text.readiness}: {entry.evidenceSnapshot.readiness.overall}% · {entry.evidenceSnapshot.provenance.length} {text.sourcesCount}</span><small>{dateText(entry.evidenceSnapshot.capturedAt, locale)}</small></div></div>{entry.evidenceDrift?.available && overallDrift ? <div className={`drift ${overallDrift.direction}`}><div className="drift-title">{overallDrift.direction === 'degraded' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}<strong>{text.drift}</strong></div><span>{entry.evidenceSnapshot.readiness.overall}% → {overallDrift.current}% {text.now} ({overallDrift.delta !== null && overallDrift.delta > 0 ? '+' : ''}{overallDrift.delta ?? 0})</span><small>{entry.evidenceDrift.summary.improved} {text.improved} · {entry.evidenceDrift.summary.degraded} {text.degraded} · {entry.evidenceDrift.summary.unchanged} {text.unchanged}</small><em>{text.nonCausal}</em></div> : null}</> : <div className="snapshot unavailable"><Database size={14} /><span>{text.snapshotUnavailable}</span></div>}</div>{entry.resolvedAt ? <small>{text.resolved}: {dateText(entry.resolvedAt, locale)}</small> : null}</article>;
    })}</div>}</section>
    </>}
    <style>{styles}</style>
  </DashboardPageShell>;
}

const styles = `
.brief-history-page{display:grid;gap:16px}.history-hero,.history-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);padding:18px;box-shadow:var(--shadow-card)}.history-hero{display:flex;justify-content:space-between;align-items:end;gap:16px}.history-hero>div>span{display:flex;align-items:center;gap:6px;color:var(--primary);font-size:12px;font-weight:700;text-transform:uppercase}.history-hero h1{margin:7px 0 5px;font-size:28px}.history-hero p,.empty{margin:0;color:var(--foreground-muted);line-height:1.7}.history-hero a{display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-control);color:var(--foreground);text-decoration:none}.section-head{display:flex;align-items:center;gap:8px;color:var(--primary);margin-bottom:12px}.section-head h2{margin:0;color:var(--foreground);font-size:18px}.trend-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.trend-grid article{padding:11px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted);display:grid;gap:5px}.trend-grid span,.history-main>span,.history-list>article>small{color:var(--foreground-muted);font-size:12px}.history-list{display:grid;gap:9px}.history-list>article{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:start;padding:11px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.status{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700}.status.resolved{color:var(--success)}.status.active{color:var(--warning)}.history-main{display:grid;gap:6px}.sources{display:flex;gap:5px;flex-wrap:wrap}.sources em{font-style:normal;padding:3px 6px;border:1px solid var(--border);border-radius:var(--radius-pill);font-size:10px;color:var(--foreground-muted);background:var(--surface)}.snapshot,.drift{display:flex;align-items:flex-start;gap:7px;margin-top:4px;padding:8px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface)}.snapshot>div{display:grid;gap:2px}.snapshot strong,.drift strong{font-size:11px}.snapshot span,.snapshot small,.drift span,.drift small,.drift em{font-size:10px;color:var(--foreground-muted)}.snapshot.unavailable{color:var(--foreground-muted);font-size:11px}.drift{display:grid}.drift-title{display:flex;align-items:center;gap:5px}.drift.improved .drift-title{color:var(--success)}.drift.degraded .drift-title{color:var(--warning)}.drift.unchanged .drift-title{color:var(--foreground-muted)}.drift em{font-style:normal;line-height:1.5}.brief-history-loading{min-height:220px;display:grid;place-items:center;color:var(--foreground-muted)}.history-error{display:grid;gap:12px}.history-error p{margin:0;color:var(--foreground-secondary);line-height:1.7}.history-error button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;width:max-content;max-width:100%;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground);font:inherit;cursor:pointer}.history-error button:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:850px){.trend-grid{grid-template-columns:1fr}.history-list>article{grid-template-columns:1fr}.history-hero{display:grid;align-items:start}}
`;
