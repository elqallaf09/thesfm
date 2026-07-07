'use client';

import { Activity, AlertCircle } from 'lucide-react';
import type { StockCategoryId, StockCategoryStock } from '@/lib/market/stockCategoryConfigs';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import { StockTickerStrip } from '@/components/market/StockTickerStrip';

type CategoryStockTickerProps = {
  categoryType: StockCategoryId;
  symbols: StockCategoryStock[];
  priceData: TechStockPrice[];
  direction: 'rtl' | 'ltr';
  locale: string;
};

const labels = {
  ar: {
    title: 'شريط الأسهم',
    subtitle: 'رموز مرتبطة بهذا التصنيف فقط.',
    unavailable: 'لا توجد بيانات أسعار متاحة حاليًا.',
    notAvailable: 'غير متاح',
    shariaUnavailable: 'لا توجد قائمة أسهم شرعية موثقة حاليًا.',
    symbolsOnly: 'تُعرض الرموز فقط عند تعذر جلب الأسعار الحية.',
  },
  en: {
    title: 'Stock ticker',
    subtitle: 'Only symbols related to this category.',
    unavailable: 'No price data is available right now.',
    notAvailable: 'Unavailable',
    shariaUnavailable: 'No verified Sharia-compliant stock list is available right now.',
    symbolsOnly: 'Symbols only are shown when live prices cannot be fetched.',
  },
  fr: {
    title: 'Bandeau actions',
    subtitle: 'Uniquement les symboles liés à cette catégorie.',
    unavailable: 'Aucune donnée de prix n’est disponible pour le moment.',
    notAvailable: 'Indisponible',
    shariaUnavailable: 'Aucune liste d’actions conformes à la charia vérifiée n’est disponible actuellement.',
    symbolsOnly: 'Seuls les symboles sont affichés lorsque les prix ne sont pas disponibles.',
  },
};

function langFromLocale(locale: string) {
  if (locale.startsWith('en')) return 'en';
  if (locale.startsWith('fr')) return 'fr';
  return 'ar';
}

export function CategoryStockTicker({
  symbols,
  priceData,
  direction,
  locale,
}: CategoryStockTickerProps) {
  const lang = langFromLocale(locale);
  const text = labels[lang];
  const priceMap = new Map(priceData.map(item => [item.symbol.toUpperCase(), item]));
  const tickerItems = symbols.slice(0, 20).map(stock => ({
    stock,
    price: priceMap.get(stock.symbol.toUpperCase()),
  }));
  const availablePrices = tickerItems.filter(item => item.price?.available && item.price.price !== null);

  if (tickerItems.length === 0) {
    return (
      <section className="rounded-[1.7rem] border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70" dir={direction}>
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
          <AlertCircle size={18} />
          <span>{text.unavailable}</span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="min-w-0 overflow-hidden rounded-[1.7rem] border border-cyan-200/70 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-cyan-500/20 dark:bg-slate-950/70"
      dir={direction}
      aria-label={text.title}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 shadow-sm dark:bg-cyan-950/40 dark:text-cyan-100">
            <Activity size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-950 dark:text-white">{text.title}</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{text.subtitle}</p>
          </div>
        </div>
        {availablePrices.length === 0 && (
          <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {text.symbolsOnly}
          </span>
        )}
      </div>

      <StockTickerStrip
        ariaLabel={text.title}
        items={tickerItems.map(({ stock, price }) => {
          const hasPrice = Boolean(price?.available && price.price !== null);
          return {
            symbol: stock.symbol,
            name: stock.name,
            price: hasPrice ? price?.price ?? null : null,
            currency: null,
            changePercent: hasPrice ? price?.changePercent ?? null : null,
            source: price?.source ?? null,
            available: hasPrice,
            meta: stock.filter.replace(/_/g, ' '),
          };
        })}
        locale={locale}
        unavailableLabel={text.notAvailable}
        className="min-w-0"
        viewportClassName="pb-1"
        direction="ltr"
        durationSeconds={44}
      />
    </section>
  );
}

export default CategoryStockTicker;


