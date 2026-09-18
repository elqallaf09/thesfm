'use client';
import type { MarketHealthReport } from '@/lib/market/sourceHealth';
import type { Lang } from '@/lib/translations/types';

const COPY = {
  ar: { title: 'تغطية أسعار الأدلة الإقليمية — آخر 7 أيام', note: 'عدادات نتائج فحص الأسعار داخل الخدمة، وقد تشمل نتائج محفوظة. ليست عدد طلبات المزود أو تغطية السوق الكاملة. لا تُحفظ رموز الأسهم أو هوية المستخدم.', unavailable: 'تعذّر تحميل سجل التغطية.', empty: 'لم تُسجّل نتائج بعد.', market: 'السوق', source: 'المصدر', available: 'متاح', missing: 'غير متاح', limited: 'حد الطلبات' },
  en: { title: 'Regional directory quote coverage — last 7 days', note: 'Service quote-result checks, which can include cached results. These are not upstream request counts or complete market coverage. Symbols and user identities are not stored.', unavailable: 'Coverage history could not be loaded.', empty: 'No results recorded yet.', market: 'Market', source: 'Source', available: 'Available', missing: 'Unavailable', limited: 'Rate limited' },
  fr: { title: 'Couverture des cours régionaux — 7 derniers jours', note: 'Contrôles de résultats du service, y compris les résultats en cache. Ce ne sont ni les requêtes au fournisseur ni la couverture complète du marché. Aucun symbole ni identifiant utilisateur n’est conservé.', unavailable: 'Historique de couverture indisponible.', empty: 'Aucun résultat enregistré.', market: 'Marché', source: 'Source', available: 'Disponibles', missing: 'Indisponibles', limited: 'Limite atteinte' },
};

export function MarketSourceHealthPanel({ report, lang }: { report?: MarketHealthReport; lang: Lang }) {
  const text = COPY[lang];
  const groups = new Map<string, { mic: string; provider: string; available: number; missing: number; limited: number }>();
  for (const row of report?.rows ?? []) {
    const key = `${row.mic}:${row.provider}`;
    const group = groups.get(key) ?? { mic: row.mic, provider: row.provider === 'yahoo' ? 'Yahoo Finance' : 'Twelve Data', available: 0, missing: 0, limited: 0 };
    const count = Number(row.checks);
    if (!Number.isFinite(count) || count < 0) continue;
    if (row.outcome === 'available') group.available += count; else group.missing += count;
    if (row.outcome === 'rate_limited') group.limited += count;
    groups.set(key, group);
  }
  return <section aria-label={text.title} className="source-health">
    <h2>{text.title}</h2><p>{text.note}</p>
    {!report?.available ? <p role="status">{text.unavailable}</p> : !groups.size ? <p>{text.empty}</p> :
      <div className="source-health-scroll"><table>
        <thead><tr>{[text.market, text.source, text.available, text.missing, text.limited].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{[...groups].map(([key, row]) => <tr key={key}><th scope="row">{row.mic}</th><td>{row.provider}</td><td>{row.available}</td><td>{row.missing}</td><td>{row.limited}</td></tr>)}</tbody>
      </table></div>}
    <style jsx>{`
      .source-health { min-width: 0; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface); }
      h2 { font-size: 18px; margin: 0 0 8px; } p { font-size: 13px; line-height: 1.7; color: var(--foreground-secondary); }
      .source-health-scroll { overflow-x: auto; } table { width: 100%; border-collapse: collapse; }
      th, td { padding: 10px; text-align: start; border-bottom: 1px solid var(--border); font-size: 13px; }
    `}</style>
  </section>;
}
