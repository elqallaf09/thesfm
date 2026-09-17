'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AssetDetailsResponse } from '@/domain/intelligence/assetDetails';
import type { IntelligenceAssetType } from '@/domain/intelligence/contracts';
import { useLanguage } from '@/hooks/useLanguage';
import { AiAnalystAssetPicker } from './AiAnalystAssetPicker';
import { ASSET_TYPE_LABELS, aiAnalystLocale, aiAnalystTimestamp } from './copy';
import styles from './AiAnalystWorkspace.module.css';
import detailStyles from './AiAnalystAssetDetails.module.css';

const COPY = {
  ar: { title: 'تفاصيل الأصل', body: 'هوية الأصل وبيانات السعر من مزودي السوق، بشكل مستقل عن تشغيل التحليل أو المساعد.', select: 'عرض التفاصيل', empty: 'اختر أصلاً لعرض هويته وبياناته. لن يتم تشغيل تحليل أو استهلاك حصة الذكاء.', loading: 'جارٍ التحقق من الأصل وجلب السعر…', error: 'تعذر التحقق من تفاصيل الأصل. تحقق من الرمز والنوع وأعد المحاولة.', retry: 'إعادة المحاولة', noQuote: 'هوية الأصل متاحة، لكن السعر غير متاح حالياً. لم تُستخدم قيم بديلة.', unavailable: 'غير متاح', symbol: 'رمز التداول', type: 'نوع الأصل', exchange: 'البورصة', country: 'الدولة', currency: 'عملة الأصل', price: 'آخر سعر متاح', change: 'التغير', open: 'الافتتاح', high: 'أعلى سعر', low: 'أدنى سعر', previous: 'الإغلاق السابق', volume: 'حجم التداول', source: 'مصدر السعر', observed: 'تاريخ بيانات السعر', delayed: 'متأخر', realtime: 'لحظي حسب المزود', eod: 'نهاية اليوم', cached: 'مخزن مؤقتاً', unknown: 'التأخير غير محدد', analyze: 'فتح التحليل الذكي', agent: 'إنشاء مهمة بحث', notice: 'هذه بيانات سوق وليست توصية. القيم المفقودة تبقى غير متاحة، ووقت الجلب لا يُستخدم بدلاً من تاريخ المصدر.' },
  en: { title: 'Asset details', body: 'Asset identity and provider-sourced quotes, separate from running an analysis or an assistant.', select: 'Show details', empty: 'Select an asset to view its identity and quote. No analysis or AI allowance is consumed.', loading: 'Verifying the asset and retrieving its quote…', error: 'Asset details could not be verified. Check the symbol and type, then retry.', retry: 'Try again', noQuote: 'Identity is available, but a quote is unavailable. No substitute values were used.', unavailable: 'Unavailable', symbol: 'Trading symbol', type: 'Asset type', exchange: 'Exchange', country: 'Country', currency: 'Asset currency', price: 'Last available price', change: 'Change', open: 'Open', high: 'High', low: 'Low', previous: 'Previous close', volume: 'Volume', source: 'Quote source', observed: 'Quote observed at', delayed: 'Delayed', realtime: 'Real-time per provider', eod: 'End of day', cached: 'Cached', unknown: 'Delay unspecified', analyze: 'Open smart analysis', agent: 'Create research task', notice: 'Market data, not a recommendation. Missing values remain unavailable; fetch time never substitutes for source time.' },
  fr: { title: 'Détails de l’actif', body: 'Identité et cotations des fournisseurs, indépendantes de l’analyse et de l’assistant.', select: 'Afficher les détails', empty: 'Choisissez un actif pour afficher son identité et son cours. Aucune analyse ni consommation du quota IA.', loading: 'Vérification de l’actif et récupération du cours…', error: 'Impossible de vérifier les détails. Vérifiez le symbole et le type, puis réessayez.', retry: 'Réessayer', noQuote: 'L’identité est disponible, mais pas le cours. Aucune valeur de remplacement.', unavailable: 'Indisponible', symbol: 'Symbole', type: 'Type d’actif', exchange: 'Bourse', country: 'Pays', currency: 'Devise de l’actif', price: 'Dernier cours disponible', change: 'Variation', open: 'Ouverture', high: 'Plus haut', low: 'Plus bas', previous: 'Clôture précédente', volume: 'Volume', source: 'Source du cours', observed: 'Date du cours', delayed: 'Différé', realtime: 'Temps réel selon le fournisseur', eod: 'Fin de journée', cached: 'En cache', unknown: 'Délai non précisé', analyze: 'Ouvrir l’analyse', agent: 'Créer une recherche', notice: 'Données de marché, pas une recommandation. Les valeurs manquantes restent indisponibles ; la date de récupération ne remplace jamais celle de la source.' },
} as const;

export function AiAnalystAssetDetails({ symbol, assetType, embedded = false }: { symbol: string; assetType: IntelligenceAssetType; embedded?: boolean }) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = COPY[locale];
  const [data, setData] = useState<AssetDetailsResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(symbol));
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setData(null);
    setFailed(false);
    if (!symbol) { setLoading(false); return; }
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 65_000);
    setLoading(true);
    const params = new URLSearchParams({ symbol, assetType });
    async function load() {
      try {
        const response = await fetch(`/api/intelligence/asset-details?${params}`, { credentials: 'same-origin', signal: controller.signal, headers: { accept: 'application/json' } });
        const payload = await response.json() as Partial<AssetDetailsResponse>;
        if (!active) return;
        if (!response.ok || payload.ok !== true || !payload.asset) { setFailed(true); return; }
        setData(payload as AssetDetailsResponse);
      } catch { if (active) setFailed(true); }
      finally { clearTimeout(timer); if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [assetType, revision, symbol]);
  const number = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat(locale, { numberingSystem: 'latn', maximumFractionDigits: 8 }).format(value) : copy.unavailable;
  const asset = data?.asset;
  const quote = data?.quote;
  const fields: Array<[string, string]> = asset ? [
    [copy.symbol, asset.displaySymbol], [copy.type, ASSET_TYPE_LABELS[locale][asset.assetType]],
    [copy.exchange, asset.exchange ?? asset.market ?? copy.unavailable], [copy.country, asset.country ?? copy.unavailable], [copy.currency, asset.quoteCurrency ?? copy.unavailable],
  ] : [];
  const priceFields: Array<[string, string]> = quote ? [
    [copy.price, `${number(quote.price)} ${quote.currency ?? ''}`], [copy.change, number(quote.change)],
    [copy.open, number(quote.open)], [copy.high, number(quote.high)], [copy.low, number(quote.low)],
    [copy.previous, number(quote.previousClose)], [copy.volume, number(quote.volume)],
  ] : [];
  return (
    <div className={styles.grid} data-testid="ai-analyst-asset-details">
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="asset-details-title">
        <header className={styles.cardHeader}><div><h2 id="asset-details-title">{copy.title}</h2><p>{copy.body}</p></div></header>
        {!embedded ? <AiAnalystAssetPicker key={`${symbol}:${assetType}`} initialSymbol={symbol} initialAssetType={assetType} destination="details" submitLabel={copy.select} compact /> : null}
        {!symbol ? <p className={styles.mutedText}>{copy.empty}</p> : null}
        {loading ? <p className={styles.statusRail} role="status">{copy.loading}</p> : null}
        {failed ? <div className={styles.statusRail} role="alert">{copy.error}<button className={styles.linkAction} onClick={() => setRevision(value => value + 1)}>{copy.retry}</button></div> : null}
      </section>
      {asset ? <section className={`${styles.card} ${styles.spanFull}`} aria-label={asset.name}>
        <h2 className={styles.panelTitle}>{asset.name}</h2>
        <dl className={detailStyles.facts}>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {quote ? <>
          <dl className={detailStyles.facts}>{priceFields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <div className={styles.statusRail}><span>{copy.source}: {quote.source}</span><span>{copy[quote.delay]}</span><span>{copy.observed}: {quote.observedAt ? aiAnalystTimestamp(locale, quote.observedAt) : copy.unavailable}</span></div>
        </> : <p className={styles.statusRail} role="status">{copy.noQuote}</p>}
        <p className={styles.mutedText}>{copy.notice}</p>
        {!embedded ? <div className={styles.statusRail}>
          <Link className={styles.linkAction} href={`/ai-analyst/analyze/${encodeURIComponent(asset.displaySymbol)}?assetType=${asset.assetType}`}>{copy.analyze}</Link>
          <Link className={styles.linkAction} href={`/ai-analyst/agent?symbol=${encodeURIComponent(asset.displaySymbol)}&assetType=${asset.assetType}`}>{copy.agent}</Link>
        </div> : null}
      </section> : null}
    </div>
  );
}
