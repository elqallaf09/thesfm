'use client';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
type Opinion = { source: string; exchange: string; symbol: string; name: string; opinion: string; as_of: string;
  source_url: string; publisher: string; scope: string; reviewDue: boolean };
export default function ShariahPublishedOpinions() {
  const { lang } = useLanguage();
  const text = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const [items, setItems] = useState<Opinion[]>([]), [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function load(refresh = false) {
    if (busy) return;
    setBusy(true); setMessage('');
    let partial = false;
    try {
      if (refresh) {
        const response = await fetch('/api/admin/shariah/publications', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(40000) });
        const result = await response.json();
        partial = !response.ok || !result.ok;
      }
      const response = await fetch('/api/sharia-stocks/publications', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.items)) throw new Error('PUBLICATION_READ_UNAVAILABLE');
      setItems(data.items);
      if (partial) setMessage(text('تعذر تحديث بعض المصادر؛ المعروض آخر آراء محفوظة بتاريخها الأصلي.', 'Some sources could not refresh; showing the last stored dated opinions.', 'Certaines sources sont indisponibles ; derniers avis datés conservés.'));
      else if (!data.items.length) setMessage(text('لا توجد آراء محفوظة بعد. حدّث المصادر المنشورة.', 'No stored opinions yet. Refresh the published sources.', 'Aucun avis enregistré. Actualisez les sources publiées.'));
    } catch { setMessage(text('تعذر تحميل الآراء المنشورة. النتائج السابقة لم تُحذف.', 'Published opinions could not be loaded. Previously shown results were preserved.', 'Impossible de charger les avis. Les résultats précédents sont conservés.')); }
    finally { setBusy(false); }
  }
  const visible = items.filter(item => `${item.symbol} ${item.name} ${item.exchange}`.toLowerCase().includes(query.toLowerCase()));
  return <details className="sharia-admin-review-panel" data-testid="shariah-published-opinions" onToggle={event => { if (event.currentTarget.open && !items.length && !busy) void load(); }}>
    <summary>{text('آراء شرعية منشورة — الكويت ودبي', 'Published Shariah opinions — Kuwait and Dubai', 'Avis Charia publiés — Koweït et Dubaï')}</summary>
    <p>{text('هذه آراء مؤرخة من جهاتها، وليست تصنيف SFM. قائمة دبي المتاحة قد تخص ربعًا سابقًا. عدم ظهور سهم بالقائمة لا يعني عدم توافقه. تقرير هيئة بيت التمويل يخص عمليات السنة المذكورة، وليس فتوى استثمار أو اجتياز نسب FTSE.', 'These are dated issuer/exchange opinions, not SFM classifications. The latest Dubai list may be historical. Absence is not non-compliance. The KFH board report covers the stated year’s operations, not an investment fatwa or a FTSE ratio pass.', 'Avis datés des émetteurs et de la bourse, distincts du filtre SFM. La liste de Dubaï peut être historique. Une absence ne signifie pas non-conformité. L’avis KFH concerne les opérations annuelles, non une fatwa d’investissement ni les ratios FTSE.')}</p>
    <button type="button" className="sharia-admin-review-button" disabled={busy} onClick={() => void load(true)} data-testid="shariah-refresh-publications">{busy ? text('جارٍ التحديث…', 'Refreshing…', 'Actualisation…') : text('تحديث الآراء من المصادر', 'Refresh published opinions', 'Actualiser les avis')}</button>
    <label>{text('ابحث بالرمز أو الاسم', 'Search symbol or name', 'Rechercher le symbole ou le nom')}<input value={query} onChange={event => setQuery(event.target.value)} /></label>
    {message && <p role="status">{message}</p>}
    <p>{text('آراء محفوظة', 'Stored opinions', 'Avis enregistrés')}: <b dir="ltr">{items.length}</b></p>
    <div className="sharia-admin-table-shell" style={{ maxHeight: '24rem', overflow: 'auto' }}>
      <table><thead><tr>{[text('الرمز والسوق', 'Symbol / market', 'Symbole / marché'), text('الرأي والمصدر', 'Opinion / source', 'Avis / source'), text('تاريخ الرأي', 'Opinion date', 'Date de l’avis')].map(value => <th key={value}>{value}</th>)}</tr></thead>
        <tbody>{visible.map(item => <tr key={`${item.source}:${item.exchange}:${item.symbol}`}><td><b dir="ltr">{item.symbol}</b><br />{item.exchange}<br />{item.name}</td>
          <td><a href={item.source_url} target="_blank" rel="noopener noreferrer">{item.publisher}</a><br />{item.scope === 'issuer_operations_annual' ? text('رأي إيجابي عن العمليات السنوية', 'Positive annual operations opinion', 'Avis positif sur les opérations annuelles') : text('مدرج في القائمة المتوافقة المنشورة', 'Included in the published compliant list', 'Présent sur la liste conforme publiée')}</td>
          <td><span dir="ltr">{item.as_of}</span><br />{item.reviewDue ? text('تاريخي — يلزم تأكيد أحدث', 'Historical — a newer confirmation is needed', 'Historique — confirmation récente requise') : text('راجع نطاق الرأي وتاريخه', 'Check the opinion scope and date', 'Vérifiez la portée et la date')}</td></tr>)}</tbody>
      </table>
    </div>
  </details>;
}
