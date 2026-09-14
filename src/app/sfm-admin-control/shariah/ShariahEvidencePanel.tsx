'use client';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

type Evidence = { financialPeriod?: string | null; missingFinancialFields?: string[];
  screeningRules?: { financial?: Array<{ key: string; label: string; labelAr?: string; labelFr?: string;
    value: number | null; threshold: number; operator: '<' | '<='; verdict: string; formula?: string; warning?: string | null }> };
  sources?: Array<{ url: string; title: string }> };
type Run = { id: string; status: string; finished_at: string | null; result: { updated?: number; failed?: unknown[] } };
const fields: Record<string, [string, string, string]> = {
  total_assets: ['إجمالي الأصول', 'Total assets', 'Actifs totaux'],
  interest_bearing_debt: ['إجمالي الدين الموثق', 'Complete debt evidence', 'Dette documentée complète'],
  cash_and_equivalents: ['النقد وما يعادله', 'Cash and equivalents', 'Trésorerie et équivalents'],
  interest_bearing_securities: ['جميع الأدوات ذات الفائدة', 'All interest-bearing items', 'Tous les instruments portant intérêt'],
  accounts_receivable: ['جميع الذمم المدينة', 'All receivables', 'Toutes les créances'],
  total_income: ['إجمالي الإيرادات', 'Total revenue', 'Chiffre d’affaires total'],
  interest_income: ['إجمالي دخل الفوائد', 'Gross interest income', 'Intérêts bruts'],
  prohibited_revenue: ['دخل الأنشطة غير المتوافقة الأخرى', 'Other non-compliant income', 'Autres revenus non conformes'],
};
export default function ShariahEvidencePanel({ evidence, lastRun, diagnosticsError, onUpdated }: {
  evidence?: Evidence | null; lastRun?: Run | null; diagnosticsError?: string | null; onUpdated: () => Promise<void>;
}) {
  const { lang } = useLanguage();
  const ix = lang === 'ar' ? 0 : lang === 'fr' ? 2 : 1;
  const text = (ar: string, en: string, fr: string) => [ar, en, fr][ix];
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function refresh() {
    setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/market/shariah/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 50 }), cache: 'no-store' });
      const result = await response.json();
      await onUpdated();
      if (!response.ok || !result.ok) throw new Error('REFRESH_FAILED');
      setNotice(`${text('تم حفظ', 'Saved', 'Enregistré')} ${result.updated} / ${result.scanned}. ${text('رقم التشغيل', 'Run', 'Exécution')}: ${result.runId}`);
    } catch { setNotice(text('لم يكتمل التحديث. راجع سجل التشغيل؛ لم يتم اعتبار القيم الناقصة أصفارًا.', 'Refresh incomplete. Inspect the run record; missing values were not treated as zero.', 'Actualisation incomplète. Consulter le journal ; aucune donnée absente remplacée par zéro.')); }
    finally { setBusy(false); }
  }
  const percent = (n: number | null) => n === null || !Number.isFinite(n) ? '—' : `${new Intl.NumberFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang, { maximumFractionDigits: 3 }).format(n * 100)}%`;
  return <section className="evidence-panel">
    <h2>{text('التحديث والأدلة', 'Refresh and evidence', 'Actualisation et preuves')}</h2>
    <button type="button" disabled={busy} aria-busy={busy} onClick={() => void refresh()}>{busy ? text('يجري الفحص…', 'Screening…', 'Filtrage…') : text('تحديث التصنيفات المستحقة الآن', 'Refresh due classifications now', 'Actualiser les classements échus')}</button>
    <p>{text('الدفعة محدودة زمنيًا. الأسهم المتبقية تُستكمل في التشغيل التالي، ولا تُستبدل المراجعات اليدوية.', 'Each batch is time-bounded. Remaining stocks continue on the next run; manual reviews are preserved.', 'Chaque lot est limité dans le temps. Les autres titres passent à l’exécution suivante ; les avis manuels sont conservés.')}</p>
    {notice && <p role="status">{notice}</p>}
    {diagnosticsError ? <p role="alert">{text('سجل التشغيل غير متاح؛ تحقق من ترحيل قاعدة البيانات.', 'Run diagnostics unavailable; verify the database migration.', 'Journal indisponible ; vérifier la migration de la base.')}</p>
      : <p>{text('آخر تشغيل', 'Last run', 'Dernière exécution')}: {lastRun ? `${lastRun.status} · ${lastRun.finished_at ?? '—'} · ${lastRun.result?.updated ?? '—'}` : '—'}</p>}
    {evidence ? <>
      <p>{text('تاريخ البيانات المالية', 'Financial period', 'Période financière')}: <span dir="ltr">{evidence.financialPeriod ?? '—'}</span></p>
      {!!evidence.missingFinancialFields?.length && <p>{text('أدلة غير مكتملة أو تمثل حدًا أدنى فقط', 'Incomplete evidence or lower bounds only', 'Preuves incomplètes ou bornes inférieures seulement')}: {evidence.missingFinancialFields.map(field => fields[field]?.[ix] ?? field).join('، ')}</p>}
      <div className="rules">{evidence.screeningRules?.financial?.map(rule => <article key={rule.key}>
        <strong>{lang === 'ar' ? rule.labelAr || rule.label : lang === 'fr' ? rule.labelFr || rule.label : rule.label}</strong>
        <p dir="ltr">{percent(rule.value)} · {rule.operator} {percent(rule.threshold)} · {rule.verdict}</p>
        {rule.warning && <p>{text('القيمة غير مكتملة أو تحتاج تحققًا؛ لا تمثل اجتيازًا تلقائيًا.', 'Incomplete or qualified evidence; not an automatic pass.', 'Preuve incomplète ou assortie de réserves ; pas de réussite automatique.')}</p>}
      </article>)}</div>
      <div>{evidence.sources?.filter(source => /^https:\/\//.test(source.url)).map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></p>)}</div>
    </> : <p>{text('اختر سهمًا لعرض أسباب النتيجة والبيانات الناقصة.', 'Select a stock to inspect its decision and missing evidence.', 'Sélectionner un titre pour examiner sa conclusion et les preuves manquantes.')}</p>}
    <small>{text('فحص استرشادي مستقل، وليس فتوى أو اعتمادًا شرعيًا رسميًا.', 'Independent informational screen, not a fatwa or official Shariah certification.', 'Filtre informatif indépendant, ni fatwa ni certification officielle.')}</small>
    <style jsx>{`.evidence-panel{display:grid;gap:12px;border:1px solid var(--border);border-radius:var(--radius-panel);padding:18px;background:var(--surface);min-width:0}.evidence-panel h2,.evidence-panel p{margin:0;overflow-wrap:anywhere;line-height:1.6}.evidence-panel button{min-height:44px;border:1px solid var(--primary);border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);padding:10px;cursor:pointer}.evidence-panel button:disabled{opacity:.65;cursor:wait}.rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:12px}.rules article{padding:12px;border:1px solid var(--border);border-radius:var(--radius-control)}a{color:var(--primary)}small{color:var(--foreground-secondary)}`}</style>
  </section>;
}
