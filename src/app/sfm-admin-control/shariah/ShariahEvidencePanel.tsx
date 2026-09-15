'use client';
import { useEffect, useRef, useState } from 'react';
import { EMPTY_REFRESH_PROGRESS, RefreshRequestError, runShariahRefresh, type RefreshProgress } from '@/lib/market/runShariahRefresh';
import { useLanguage } from '@/hooks/useLanguage';
import type { ComponentProps } from 'react';
import ShariahCoverageDetails from './ShariahCoverageDetails';

type Evidence = ComponentProps<typeof ShariahCoverageDetails>['evidence'] & { financialPeriod?: string | null; missingFinancialFields?: string[];
  screeningRules?: { financial?: Array<{ key: string; label: string; labelAr?: string; labelFr?: string;
    value: number | null; threshold: number; operator: '<' | '<='; verdict: string; formula?: string; warning?: string | null }> };
  sources?: Array<{ url: string; title: string }> };
type Run = { id: string; status: string; finished_at: string | null; result: { scanned?: number; updated?: number; failed?: Array<{ symbol: string; reason: string }> } };
type Selected = { id: string; symbol: string; assetType?: string | null; error?: string | null; nextRetryAt?: string | null };
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
export default function ShariahEvidencePanel({ evidence, lastRun, diagnosticsError, onUpdated, selected }: {
  evidence?: Evidence | null; lastRun?: Run | null; diagnosticsError?: string | null; onUpdated: () => Promise<boolean | void>; selected?: Selected | null;
}) {
  const { lang } = useLanguage();
  const ix = lang === 'ar' ? 0 : lang === 'fr' ? 2 : 1;
  const text = (ar: string, en: string, fr: string) => [ar, en, fr][ix];
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<RefreshProgress>(EMPTY_REFRESH_PROGRESS);
  const [notice, setNotice] = useState('');
  const [startedOnce, setStartedOnce] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const stop = useRef(false);
  const reload = useRef(onUpdated);
  reload.current = onUpdated;
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => {
    if (!busy) return;
    const began = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - began) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  const errorText = (code: string) => {
    if (code === 'refresh_persistence_failed') return text('تعذّر تأكيد حفظ النتيجة', 'Result persistence could not be confirmed', 'Enregistrement non confirmé');
    if (code === 'official_market_filing_adapter_unavailable') return text('مصدر الإفصاحات لهذا السوق غير متاح حاليًا', 'Filing source for this market is not yet available', 'Source des déclarations de ce marché indisponible');
    if (code === 'official_provider_timed_out') return text('انتهت مهلة المصدر', 'Source timed out', 'Délai de la source dépassé');
    if (code === 'official_provider_rate_limited') return text('وصل المصدر إلى حد الطلبات', 'Source rate limit', 'Limite de requêtes de la source');
    if (code === 'official_provider_access_denied') return text('رفض المصدر الاتصال', 'Source denied access', 'Accès refusé par la source');
    return text('تعذّر استكمال البيانات من المصدر', 'Source data could not be completed', 'Données de source incomplètes');
  };
  async function refresh(symbolId?: string) {
    if (controller.current) return; // Prevent rapid duplicate clicks before React renders.
    const current = new AbortController(); controller.current = current;
    stop.current = false; setStopRequested(false); setElapsed(0); setStartedOnce(true);
    setBusy(true); setNotice(''); setProgress(EMPTY_REFRESH_PROGRESS);
    try {
      const result = await runShariahRefresh({ signal: current.signal, symbolId,
        onProgress: value => { if (!current.signal.aborted) setProgress(value); },
        reload: () => reload.current(), shouldStop: () => stop.current });
      if (current.signal.aborted) return;
      setNotice(result.stopped
        ? text('توقفت بعد الدفعة الحالية. النتائج المحفوظة باقية؛ الباقي يُستكمل من الزر أو الجدولة.', 'Stopped after the current batch. Saved results remain; continue manually or via the schedule.', 'Arrêt après le lot actuel. Résultats conservés ; continuer manuellement ou par planification.')
        : result.failed.length && !result.updated
          ? text('تعذّر جلب بيانات الأسهم في هذه المحاولة. لم تُستبدل النتائج السابقة؛ تفاصيل الأسهم أدناه.', 'Stock data was unavailable on this attempt. Previous results were not replaced; details below.', 'Données indisponibles pour cet essai. Résultats précédents conservés ; détails ci-dessous.')
        : result.failed.length
          ? text('اكتمل التشغيل جزئيًا. النتائج المحفوظة لم تُفقد؛ الأسهم أدناه تنتظر إعادة المحاولة.', 'Partially completed. Saved results are retained; the stocks below await a retry.', 'Exécution partielle. Résultats conservés ; les titres ci-dessous attendent un nouvel essai.')
          : result.scanned === 0
            ? text('لا توجد أسهم مستحقة في هذا التشغيل. بعض الأسهم قد تكون بانتظار موعد إعادة المحاولة.', 'No stocks are due in this run. Some may be awaiting their retry time.', 'Aucun titre échu pour cette exécution. Certains peuvent attendre leur prochain essai.')
            : text('اكتملت الدفعات المطلوبة وحُفظت نتائجها.', 'Requested batches completed and results saved.', 'Lots demandés terminés et résultats enregistrés.'));
    } catch (error) {
      if (current.signal.aborted) return;
      const code = error instanceof RefreshRequestError ? error.code : 'REFRESH_RESPONSE_UNAVAILABLE';
      setNotice(code === 'AUTH_REQUIRED'
        ? text('انتهت الجلسة أو لا تتوفر الصلاحية. سجّل الدخول مجددًا؛ النتائج السابقة محفوظة.', 'Session expired or access denied. Sign in again; previous results remain saved.', 'Session expirée ou accès refusé. Reconnectez-vous ; résultats conservés.')
        : code === 'RATE_LIMITED'
          ? text('بلغت حد محاولات التحديث. انتظر دقيقة؛ النتائج السابقة محفوظة.', 'Refresh rate limit reached. Wait one minute; previous results remain saved.', 'Limite atteinte. Attendez une minute ; résultats conservés.')
          : text('تعذّر تأكيد بقية التشغيل. النتائج المؤكدة أدناه محفوظة؛ حدّث عرض النتائج لمعرفة آخر سجل.', 'Could not confirm the remaining run. Confirmed results below are saved; reload the view for the latest run record.', 'Impossible de confirmer la suite. Résultats confirmés conservés ; actualiser la vue pour le dernier journal.'));
      // A lost HTTP response is not evidence that the server made no writes.
      try { await reload.current(); } catch { /* Keep confirmed counters visible. */ }
    } finally {
      if (controller.current === current) controller.current = null;
      if (!current.signal.aborted) setBusy(false);
    }
  }
  const percent = (n: number | null) => n === null || !Number.isFinite(n) ? '—' : `${new Intl.NumberFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang, { maximumFractionDigits: 3 }).format(n * 100)}%`;
  return <section className="evidence-panel">
    <h2>{text('التحديث والأدلة', 'Refresh and evidence', 'Actualisation et preuves')}</h2>
    <div className="refresh-actions">
      <button type="button" disabled={busy} aria-busy={busy} onClick={() => void refresh()}>{busy ? text('يجري الفحص على دفعات…', 'Screening in batches…', 'Filtrage par lots…') : text('تحديث التصنيفات المستحقة الآن', 'Refresh due classifications now', 'Actualiser les classements échus')}</button>
      {busy && <button type="button" disabled={stopRequested} onClick={() => { stop.current = true; setStopRequested(true); }}>{stopRequested ? text('يتوقف بعد الدفعة…', 'Stopping after this batch…', 'Arrêt après ce lot…') : text('إيقاف بعد الدفعة الحالية', 'Stop after this batch', 'Arrêter après ce lot')}</button>}
      <button type="button" disabled={busy} onClick={() => void reload.current()}>{text('تحديث عرض النتائج', 'Reload saved results', 'Actualiser les résultats')}</button>
    </div>
    <p>{text('دفعات صغيرة متتابعة، وتظهر النتائج المحفوظة بعد كل دفعة. تعذّر سهم لا يلغي بقية النتائج ولا يغيّر المراجعات اليدوية.', 'Small serial batches show saved results after each batch. One unavailable stock does not cancel other results or manual reviews.', 'Petits lots successifs : résultats affichés après chaque lot. Un titre indisponible n’annule pas les autres résultats ni les avis manuels.')}</p>
    {busy && <p>{text('الوقت المنقضي', 'Elapsed', 'Temps écoulé')}: <span dir="ltr">{elapsed}s</span> · {text('يجري جلب الإفصاحات والتحقق منها', 'Retrieving and verifying filings', 'Récupération et vérification des documents')}</p>}
    {startedOnce && <p data-testid="shariah-refresh-progress" role="status" aria-live="polite">{text('تم حفظ', 'Saved', 'Enregistrés')} <span dir="ltr"><b>{progress.updated}</b> / {progress.scanned}</span> · {text('الدفعات المكتملة', 'Completed batches', 'Lots terminés')}: {progress.batches}{progress.runId ? ` · ${text('رقم التشغيل', 'Run', 'Exécution')}: ${progress.runId}` : ''}</p>}
    {notice && <p role="status">{notice}</p>}
    {progress.viewUnavailable && progress.updated > 0 && <p role="alert">{text('الحفظ مؤكد، لكن تعذّر تحديث عرض الجدول. لا تعِد الفحص؛ استخدم تحديث عرض النتائج.', 'Saving was confirmed, but the table could not be reloaded. Reload the view instead of repeating the scan.', 'Enregistrement confirmé, mais tableau indisponible. Actualisez la vue sans relancer le filtrage.')}</p>}
    {progress.failed.map((failure, i) => <p key={`${failure.symbol}:${i}`}><b dir="ltr">{failure.symbol}</b>: {errorText(failure.reason)}.</p>)}
    {selected && ['stock', 'etf'].includes(selected.assetType ?? '') && <button type="button" data-testid="shariah-refresh-selected" disabled={busy} onClick={() => void refresh(selected.id)}>{text('تحديث أدلة الأداة المحددة', 'Refresh selected instrument evidence', 'Actualiser les preuves du titre sélectionné')}</button>}
    {selected?.error && <div className="retry-panel">
      <p><b dir="ltr">{selected.symbol}</b>: {errorText(selected.error)} · {text('موعد إعادة المحاولة', 'Retry due', 'Prochain essai')}: <span dir="ltr">{selected.nextRetryAt ?? '—'}</span></p>
      {['stock', 'etf'].includes(selected.assetType ?? '') && <button type="button" disabled={busy} onClick={() => void refresh(selected.id)}>{text('إعادة محاولة السهم المحدد فقط', 'Retry only the selected stock', 'Réessayer uniquement ce titre')}</button>}
    </div>}
    {diagnosticsError ? <p role="alert">{text('سجل التشغيل غير متاح مؤقتًا. النتائج المحفوظة لا تتأثر.', 'Run diagnostics temporarily unavailable. Saved results are unaffected.', 'Journal temporairement indisponible. Résultats conservés.')}</p>
      : <p>{text('آخر تشغيل', 'Last run', 'Dernière exécution')}: {lastRun ? `${lastRun.status} · ${lastRun.finished_at ?? '—'} · ${lastRun.result?.updated ?? '—'} / ${lastRun.result?.scanned ?? '—'}` : '—'}</p>}
    {evidence ? <>
      <ShariahCoverageDetails evidence={evidence} />
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
    <style jsx>{`.evidence-panel{display:grid;gap:12px;border:1px solid var(--border);border-radius:var(--radius-panel);padding:18px;background:var(--surface);min-width:0}.evidence-panel h2,.evidence-panel p{margin:0;overflow-wrap:anywhere;line-height:1.6}.evidence-panel button{min-height:44px;border:1px solid var(--primary);border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);padding:10px;cursor:pointer}.evidence-panel button:disabled{opacity:.65;cursor:wait}.refresh-actions{display:flex;flex-wrap:wrap;gap:10px}.retry-panel{display:grid;gap:8px}.rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:12px}.rules article{padding:12px;border:1px solid var(--border);border-radius:var(--radius-control)}a{color:var(--primary)}small{color:var(--foreground-secondary)}`}</style>
  </section>;
}
