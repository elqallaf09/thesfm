'use client';

import type { GlobalDirectoryRow } from '@/lib/market/globalMarketDirectoryTypes';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { Lang } from '@/lib/translations';

const COPY = {
  ar: { title: 'تغطية أسعار النتائج المعروضة', available: 'سعر متاح', missing: 'غير متاح', pending: 'قيد الفحص', limited: 'وصل المصدر إلى حد الطلبات؛ ننتظر قبل إعادة المحاولة.', access: 'تحتاج أسعار بعض النتائج إلى صلاحية لدى مزود البيانات.', unavailable: 'تعذر جلب بعض الأسعار من المصدر.', stale: 'حُجب سعر قديم حتى لا يُعرض كسعر حالي.', note: 'هذا القياس للنتائج المعروضة فقط. اتصال دليل الأسهم لا يضمن توفر أسعارها، والأسعار قد تكون متأخرة.', oldest: 'أقدم وقت سعر معلوم' },
  en: { title: 'Quote coverage for displayed results', available: 'available', missing: 'unavailable', pending: 'pending', limited: 'The source reached its request limit; requests pause before retrying.', access: 'Some results require data-provider quote access.', unavailable: 'Some quotes could not be retrieved from the source.', stale: 'An old quote was withheld instead of being shown as current.', note: 'Measured for displayed results only. Directory access does not guarantee quote access; prices may be delayed.', oldest: 'Oldest known quote time' },
  fr: { title: 'Couverture des cours des résultats affichés', available: 'disponibles', missing: 'indisponibles', pending: 'en attente', limited: 'La limite de requêtes de la source est atteinte ; les requêtes sont temporairement suspendues.', access: 'Certains cours nécessitent un droit d’accès auprès du fournisseur.', unavailable: 'Certains cours n’ont pas pu être récupérés.', stale: 'Un ancien cours a été masqué pour ne pas être présenté comme actuel.', note: 'Mesure limitée aux résultats affichés. L’accès au répertoire ne garantit pas l’accès aux cours, qui peuvent être différés.', oldest: 'Heure connue du cours le plus ancien' },
};

export function DirectoryQuoteCoverage({ rows, prices, lang, failed, loading }: { rows: GlobalDirectoryRow[]; prices: Record<string, TechStockPrice>; lang: Lang; failed: boolean; loading: boolean }) {
  if (!rows.length) return null;
  const copy = COPY[lang];
  const quotes = rows.map(row => prices[row.providerSymbol]);
  const available = quotes.filter(quote => quote?.available && quote.price !== null && quote.price > 0).length;
  const pending = failed && !loading ? 0 : quotes.filter(quote => !quote).length;
  const reasons = quotes.map(quote => quote?.unavailableReason || '');
  const timestamps = quotes.map(quote => quote?.asOf ? Date.parse(quote.asOf) : NaN).filter(Number.isFinite);
  const oldest = timestamps.length ? new Date(Math.min(...timestamps)) : null;
  const message = reasons.some(reason => /429|rate_limit/.test(reason)) ? copy.limited : reasons.some(reason => /access_required|not_configured|401|403/.test(reason)) ? copy.access : reasons.some(reason => /stale/.test(reason)) ? copy.stale : reasons.some(Boolean) ? copy.unavailable : '';
  return <section className="directory-quote-coverage" aria-label={copy.title}>
    <strong>{copy.title}</strong>
    <p>{available} {copy.available} · {quotes.length - available - pending} {copy.missing} · {pending} {copy.pending}</p>
    <details><summary>{copy.note}</summary>
      {message ? <p>{message}</p> : null}
      {oldest ? <p>{copy.oldest}: <time dateTime={oldest.toISOString()}>{new Intl.DateTimeFormat(`${lang}-u-nu-latn`, { dateStyle: 'medium', timeStyle: 'short' }).format(oldest)}</time></p> : null}
    </details>
    <style jsx>{`
      .directory-quote-coverage { min-width: 0; min-height: 98px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-card); color: var(--foreground-secondary); background: var(--surface); font-size: 13px; line-height: 1.7; }
      p { margin: 2px 0; }
      summary { cursor: pointer; min-height: 44px; align-content: center; }
      summary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
    `}</style>
  </section>;
}
