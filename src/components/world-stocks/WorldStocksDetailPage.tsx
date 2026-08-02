'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ArrowRight, BrainCircuit, LineChart, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { useLanguage } from '@/hooks/useLanguage';
import type { WorldStock, WorldStockQuotesResponse } from '@/lib/world-stocks/types';
import type { WorldStockDetailResponse } from '@/app/api/world-stocks/detail/route';
import { WorldStocksWatchlistButton } from './WorldStocksWatchlistButton';
import styles from './WorldStocksDetailPage.module.css';

const COPY = {
  ar: {
    back: 'الرجوع إلى المستكشف',
    notFound: 'تعذر العثور على هذا الرمز',
    notFoundHint: 'قد يكون الرمز غير صحيح أو غير مدرج في الأسواق المدعومة حالياً.',
    error: 'تعذر تحميل تفاصيل هذا السهم حالياً.',
    retry: 'إعادة المحاولة',
    quoteStatus: 'حالة السعر',
    dataSource: 'مصدر البيانات',
    delayed: 'سعر متأخر',
    priceUnavailable: 'السعر غير متاح',
    profile: 'الملف التعريفي',
    sector: 'القطاع',
    sectorUnavailable: 'غير متاح',
    marketCap: 'القيمة السوقية',
    marketCapUnavailable: 'غير متاحة',
    chartUnavailable: 'بيانات الرسم البياني غير متاحة حالياً لهذا الرمز.',
    handoffs: 'إجراءات ذات صلة',
    openMarketAnalysis: 'فتح في تحليلات السوق',
    askAiAnalyst: 'اسأل المحلل الذكي',
    openInvestments: 'فتح في مركز الاستثمارات',
    addWatchlist: 'إضافة إلى المتابعة',
    addedWatchlist: 'تمت الإضافة إلى المتابعة',
    watchlistError: 'تعذرت الإضافة',
    signInWatchlist: 'سجّل الدخول للمتابعة',
  },
  en: {
    back: 'Back to Explorer',
    notFound: 'This symbol could not be found',
    notFoundHint: 'The symbol may be incorrect or not currently listed on a supported market.',
    error: 'Could not load this stock right now.',
    retry: 'Retry',
    quoteStatus: 'Quote status',
    dataSource: 'Data source',
    delayed: 'Delayed quote',
    priceUnavailable: 'Price unavailable',
    profile: 'Profile',
    sector: 'Sector',
    sectorUnavailable: 'Unavailable',
    marketCap: 'Market cap',
    marketCapUnavailable: 'Unavailable',
    chartUnavailable: 'Chart data is not currently available for this symbol.',
    handoffs: 'Related actions',
    openMarketAnalysis: 'Open in Market Analysis',
    askAiAnalyst: 'Ask AI Analyst',
    openInvestments: 'Open in Investments Center',
    addWatchlist: 'Add to watchlist',
    addedWatchlist: 'Added to watchlist',
    watchlistError: 'Could not add',
    signInWatchlist: 'Sign in to add',
  },
  fr: {
    back: "Retour à l'explorateur",
    notFound: 'Ce symbole est introuvable',
    notFoundHint: "Le symbole est peut-être incorrect ou n'est pas actuellement coté sur un marché pris en charge.",
    error: 'Impossible de charger cette action pour le moment.',
    retry: 'Réessayer',
    quoteStatus: 'Statut du cours',
    dataSource: 'Source des données',
    delayed: 'Cours différé',
    priceUnavailable: 'Prix indisponible',
    profile: 'Profil',
    sector: 'Secteur',
    sectorUnavailable: 'Indisponible',
    marketCap: 'Capitalisation boursière',
    marketCapUnavailable: 'Indisponible',
    chartUnavailable: "Les données du graphique ne sont pas disponibles pour ce symbole.",
    handoffs: 'Actions associées',
    openMarketAnalysis: "Ouvrir dans l'analyse du marché",
    askAiAnalyst: "Demander à l'analyste IA",
    openInvestments: "Ouvrir dans le centre d'investissements",
    addWatchlist: 'Ajouter à la liste de suivi',
    addedWatchlist: 'Ajouté à la liste de suivi',
    watchlistError: "Impossible d'ajouter",
    signInWatchlist: 'Connectez-vous pour suivre',
  },
} as const;

function copyFor(lang: string) {
  if (lang === 'en') return COPY.en;
  if (lang === 'fr') return COPY.fr;
  return COPY.ar;
}

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW-u-nu-latn';
}

type WorldStocksDetailPageProps = {
  symbol: string;
  region: string;
};

export function WorldStocksDetailPage({ symbol, region }: WorldStocksDetailPageProps) {
  const { dir, lang } = useLanguage();
  const ui = copyFor(lang);
  const locale = localeFor(lang);
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const [stock, setStock] = useState<WorldStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setNotFound(false);

    (async () => {
      try {
        const params = new URLSearchParams({ symbol, region, lang });
        const response = await fetch(`/api/world-stocks/detail?${params.toString()}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({})) as WorldStockDetailResponse;

        if (!json.success) {
          if (json.code === 'not_found') { setNotFound(true); return; }
          throw new Error(json.message);
        }

        setStock(json.stock);

        const quoteResponse = await fetch('/api/world-stocks/quotes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            symbols: [{
              canonicalSymbol: json.stock.canonicalSymbol,
              providerSymbol: json.stock.providerSymbol,
              exchangeCode: json.stock.region,
              assetType: json.stock.assetType,
              currency: json.stock.currency,
            }],
          }),
        });
        const quoteJson = await quoteResponse.json().catch(() => ({})) as WorldStockQuotesResponse;
        if (quoteJson.success) {
          const quote = quoteJson.quotes[json.stock.canonicalSymbol];
          if (quote) {
            setStock(previous => previous && ({
              ...previous,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              currency: quote.currency ?? previous.currency,
              quoteTimestamp: quote.quoteTimestamp,
              delayed: quote.delayed,
              dataSource: quote.dataSource,
              quoteStatus: quote.status,
            }));
          }
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setError(loadError instanceof Error ? loadError.message : ui.error);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [symbol, region, lang, ui.error]);

  const formatPrice = useMemo(() => (value: number | null, currency: string | null) => {
    if (value === null || !currency) return ui.priceUnavailable;
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency, numberingSystem: 'latn', maximumFractionDigits: value >= 100 ? 2 : 3 }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  }, [locale, ui.priceUnavailable]);

  const formatTimestamp = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  return (
    <DashboardPageShell ariaLabel={stock?.displayName ?? ui.notFound} className={styles.shell} dir={dir}>
      <Link href="/world-stocks" className={styles.backLink}>
        <BackIcon size={15} aria-hidden="true" />
        {ui.back}
      </Link>

      {loading ? (
        <section className={styles.state} role="status">
          <span className={styles.skeleton} />
        </section>
      ) : notFound ? (
        <section className={styles.state}>
          <AlertTriangle size={22} />
          <p>{ui.notFound}</p>
          <small>{ui.notFoundHint}</small>
        </section>
      ) : error ? (
        <section className={styles.state} role="alert">
          <AlertTriangle size={22} />
          <p>{error}</p>
        </section>
      ) : stock ? (
        <>
          <header className={styles.header}>
            <AssetIdentity variant="badge" symbol={stock.canonicalSymbol} name={stock.displayName} assetType={stock.assetType} size="lg" />
            <div className={styles.headerMeta}>
              <span>{stock.exchangeName}</span>
              {stock.countryName ? <span>{stock.countryName}</span> : null}
            </div>
          </header>

          <section className={styles.quoteCard}>
            {stock.quoteStatus === 'available' ? (
              <>
                <strong dir="ltr" className={styles.priceValue}>{formatPrice(stock.price, stock.currency)}</strong>
                {stock.changePercent !== null ? (
                  <span className={`${styles.change} ${stock.changePercent > 0 ? styles.up : stock.changePercent < 0 ? styles.down : styles.neutral}`} dir="ltr">
                    {stock.changePercent > 0 ? <TrendingUp size={15} aria-hidden="true" /> : <TrendingDown size={15} aria-hidden="true" />}
                    {`${stock.changePercent >= 0 ? '+' : ''}${new Intl.NumberFormat(locale, { numberingSystem: 'latn', maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(stock.changePercent)}%`}
                  </span>
                ) : null}
              </>
            ) : (
              <span className={styles.priceUnavailable}>{ui.priceUnavailable}</span>
            )}
            <dl className={styles.quoteFacts}>
              <div>
                <dt>{ui.quoteStatus}</dt>
                <dd>{stock.delayed ? ui.delayed : stock.quoteStatus}</dd>
              </div>
              {stock.dataSource ? (
                <div>
                  <dt>{ui.dataSource}</dt>
                  <dd>{stock.dataSource}</dd>
                </div>
              ) : null}
              {formatTimestamp(stock.quoteTimestamp) ? (
                <div>
                  <dt>{ui.quoteStatus}</dt>
                  <dd dir="ltr">{formatTimestamp(stock.quoteTimestamp)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className={styles.profileCard}>
            <h2>{ui.profile}</h2>
            <dl className={styles.profileFacts}>
              <div>
                <dt>{ui.sector}</dt>
                <dd>{stock.sector ?? ui.sectorUnavailable}</dd>
              </div>
              <div>
                <dt>{ui.marketCap}</dt>
                <dd>{stock.marketCap !== null ? stock.marketCap : ui.marketCapUnavailable}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.chartCard}>
            <LineChart size={20} aria-hidden="true" />
            <p>{ui.chartUnavailable}</p>
          </section>

          <section className={styles.handoffs} aria-label={ui.handoffs}>
            <h2 className={styles.srOnly}>{ui.handoffs}</h2>
            <Link href={`/market-analysis?symbol=${encodeURIComponent(stock.canonicalSymbol)}`} className={styles.handoffLink}>
              <LineChart size={15} aria-hidden="true" />
              {ui.openMarketAnalysis}
            </Link>
            <Link href={`/ai-analyst/overview?symbol=${encodeURIComponent(stock.canonicalSymbol)}&assetType=${stock.assetType}`} className={styles.handoffLink}>
              <BrainCircuit size={15} aria-hidden="true" />
              {ui.askAiAnalyst}
            </Link>
            <Link href={`/investments?symbol=${encodeURIComponent(stock.canonicalSymbol)}`} className={styles.handoffLink}>
              <Wallet size={15} aria-hidden="true" />
              {ui.openInvestments}
            </Link>
            <WorldStocksWatchlistButton
              symbol={stock.canonicalSymbol}
              assetType={stock.assetType}
              displayName={stock.displayName}
              className={styles.handoffLink}
              labels={{ add: ui.addWatchlist, added: ui.addedWatchlist, error: ui.watchlistError, signIn: ui.signInWatchlist }}
            />
          </section>
        </>
      ) : null}
    </DashboardPageShell>
  );
}

export default WorldStocksDetailPage;
