'use client';
import { useEffect, useState } from 'react';
import { StockTickerStrip, type StockTickerStripItem } from '@/components/market/StockTickerStrip';
import { safeListingSource, type VerifiedListing } from '@/lib/market-news/verifiedListings';
import styles from './NewListingsPanel.module.css';

const COPY = {
  ar: { loading: 'جارٍ تحميل مصادر الإدراج…', title: 'إدراجات أمريكية موثقة · آخر 90 يومًا', note: 'تغطية جزئية من إفصاحات SEC تمت مراجعتها، وليست قائمة شاملة أو تغذية اكتتابات آلية. تاريخ بدء التداول يختلف عن تاريخ التسعير أو إغلاق الطرح.', empty: 'لا توجد سجلات مراجعة سارية حاليًا.', error: 'تعذّر تحديث سجلات الإدراج.', rights: 'مصادر الإدراج متاحة؛ الأسعار غير مفعّلة إلى حين التحقق من حقوق عرضها التجاري.', price: 'الشريط يعرض فقط الأسهم ذات السعر المتاح المؤرخ؛ قد تكون الأسعار متأخرة. الأسعار ليست من SEC.', source: 'المصدر وتاريخ المراجعة', ipo: 'طرح أولي', 'new-us-listing': 'إدراج أمريكي جديد', 'business-combination': 'بدء التداول بعد اندماج', 'direct-listing': 'إدراج مباشر' },
  en: { loading: 'Loading listing sources…', title: 'Verified US listings · last 90 days', note: 'Partial coverage from reviewed SEC filings, not a complete or automatic IPO feed. First trading date is distinct from pricing or offering close.', empty: 'No current reviewed records available.', error: 'Listing records could not be refreshed.', rights: 'Listing sources are available; prices remain disabled until commercial display rights are verified.', price: 'The ticker includes only available, timestamped prices, which may be delayed. Prices are not supplied by SEC.', source: 'Source and review date', ipo: 'IPO', 'new-us-listing': 'New US listing', 'business-combination': 'Post-combination trading debut', 'direct-listing': 'Direct listing' },
  fr: { loading: 'Chargement des sources…', title: 'Cotations américaines vérifiées · 90 derniers jours', note: 'Couverture partielle issue de dépôts SEC examinés, pas un flux automatique ou exhaustif d’IPO. Le début de négociation diffère de la fixation du prix ou de la clôture.', empty: 'Aucun dossier vérifié à jour.', error: 'Actualisation des cotations impossible.', rights: 'Sources disponibles ; cours désactivés jusqu’à vérification des droits d’affichage commercial.', price: 'Le bandeau affiche seulement les cours disponibles et horodatés, éventuellement différés. Ils ne proviennent pas de la SEC.', source: 'Source et date de vérification', ipo: 'IPO', 'new-us-listing': 'Nouvelle cotation américaine', 'business-combination': 'Début après regroupement', 'direct-listing': 'Cotation directe' },
};
type Payload = { listings: VerifiedListing[]; tickerItems: (StockTickerStripItem & { asOf?: string })[]; quoteStatus?: string };
export function NewListingsPanel({ lang }: { lang: keyof typeof COPY }) {
  const [data, setData] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const copy = COPY[lang];
  useEffect(() => {
    let disposed = false;
    let active: AbortController | null = null;
    const load = async () => {
      active?.abort();
      if (document.hidden || !navigator.onLine) { setData(null); setFailed(true); setLoading(false); return; }
      const controller = new AbortController(); active = controller;
      try {
        const response = await fetch('/api/market/special-news?topic=new-stocks&part=ticker', {
          cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8_000)]),
        });
        if (!response.ok) throw new Error('unavailable');
        const payload = await response.json() as Payload;
        if (!Array.isArray(payload.listings) || !Array.isArray(payload.tickerItems)) throw new Error('invalid');
        if (!disposed && active === controller) { setData(payload); setFailed(false); setLoading(false); }
      } catch {
        if (!disposed && active === controller) { setData(null); setFailed(true); setLoading(false); }
      }
    };
    const clear = () => { active?.abort(); active = null; setData(null); setFailed(true); setLoading(false); };
    const visibility = () => document.hidden ? clear() : void load();
    void load();
    const timer = setInterval(() => void load(), 60_000);
    window.addEventListener('offline', clear); window.addEventListener('online', load);
    document.addEventListener('visibilitychange', visibility);
    return () => { disposed = true; active?.abort(); clearInterval(timer); window.removeEventListener('offline', clear); window.removeEventListener('online', load); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return <section className={styles.panel} aria-label={copy.title}>
    <h2>{copy.title}</h2><p>{copy.note}</p>
    {data?.tickerItems.length ? <StockTickerStrip items={data.tickerItems} ariaLabel={copy.title} locale={lang} unavailableLabel={copy.empty} minimumItems={1} direction="ltr" /> : null}
    {data ? <p>{data.quoteStatus === 'rights-unverified' ? copy.rights : copy.price}</p> : null}
    {loading ? <p role="status">{copy.loading}</p> : failed ? <p role="status">{copy.error}</p> : !data?.listings.length ? <p role="status">{copy.empty}</p> : <ul>
      {data.listings.filter(safeListingSource).map(row => <li key={`${row.exchange}:${row.symbol}`}>
        <strong><bdi>{row.symbol}</bdi> · {row.name}</strong>
        <span><bdi>{row.exchange} · {row.firstTradeDate}</bdi> · {copy[row.listingType as 'ipo'] ?? row.listingType}</span>
        <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">{copy.source}: {row.sourceLabel} · <bdi>{row.verifiedAt}</bdi></a>
      </li>)}
    </ul>}
    {data?.tickerItems.length ? <p>{data.tickerItems.map(item => `${item.symbol}: ${item.source} · ${item.asOf}`).join(' | ')}</p> : null}
  </section>;
}
