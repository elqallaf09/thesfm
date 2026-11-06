'use client';
import type { WorldStock } from '@/lib/world-stocks/types';
export function WorldStockEvidence({ stock, lang }: { stock: WorldStock; lang: 'ar' | 'en' | 'fr' }) {
  if (stock.quoteStatus !== 'available') return null;
  const time = stock.quoteTimestamp ? Date.parse(stock.quoteTimestamp) : NaN;
  const copy = lang === 'ar' ? ['وقت المصدر غير متاح', 'سعر مرجعي قديم', 'متأخر', 'وقت المصدر'] : lang === 'fr' ? ['Heure inconnue', 'Cours de référence ancien', 'Différé', 'Heure de la source'] : ['Source time unavailable', 'Stale reference price', 'Delayed', 'Source time'];
  const label = !Number.isFinite(time) ? copy[0] : Date.now() - time > 900000 ? copy[1] : stock.delayed ? copy[2] : copy[3];
  return <small style={{ display: 'block', fontSize: 'var(--fs-caption, 12px)', lineHeight: 'var(--lh-caption-prose, 18px)', fontWeight: 400 }}>
    {stock.dataSource || '—'} · {label}{Number.isFinite(time) && <> · <time dateTime={stock.quoteTimestamp!}>{new Intl.DateTimeFormat(`${lang}-u-nu-latn`, { dateStyle: 'short', timeStyle: 'short' }).format(time)}</time></>}
  </small>;
}
