'use client';

import { Activity, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import type { StockCategoryId, StockCategoryStock } from '@/lib/market/stockCategoryConfigs';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';

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
    shariaUnavailable: 'لا توجد قائمة أسهم شرعية موثقة حاليًا.',
    symbolsOnly: 'تعرض الرموز فقط عند تعذر جلب الأسعار الحية.',
  },
  en: {
    title: 'Stock ticker',
    subtitle: 'Only symbols related to this category.',
    unavailable: 'No price data is available right now.',
    shariaUnavailable: 'No verified Sharia-compliant stock list is available right now.',
    symbolsOnly: 'Symbols only are shown when live prices cannot be fetched.',
  },
  fr: {
    title: 'Bandeau actions',
    subtitle: 'Uniquement les symboles liés à cette catégorie.',
    unavailable: 'Aucune donnée de prix n’est disponible pour le moment.',
    shariaUnavailable: 'Aucune liste d’actions conformes à la charia vérifiée n’est disponible actuellement.',
    symbolsOnly: 'Seuls les symboles sont affichés lorsque les prix ne sont pas disponibles.',
  },
};

function langFromLocale(locale: string) {
  if (locale.startsWith('en')) return 'en';
  if (locale.startsWith('fr')) return 'fr';
  return 'ar';
}

function formatPrice(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 2 : 3,
  }).format(value);
}

function formatPercent(value: number, locale: string) {
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}%`;
}

function changeBadgeClass(value: number | null) {
  if (value === null || value === 0) {
    return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600/50 dark:bg-slate-800/70 dark:text-slate-100';
  }
  return value > 0
    ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100'
    : 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-900/40 dark:text-rose-100';
}

export function CategoryStockTicker({
  categoryType,
  symbols,
  priceData,
  direction,
  locale,
}: CategoryStockTickerProps) {
  const lang = langFromLocale(locale);
  const text = labels[lang];

  if (categoryType === 'sharia') {
    return (
      <section className="rounded-[1.7rem] border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/20" dir={direction}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-200">
            <AlertCircle size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-950 dark:text-white">{text.title}</h2>
            <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-100">
              {text.shariaUnavailable}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const priceMap = new Map(priceData.map(item => [item.symbol, item]));
  const tickerItems = symbols.slice(0, 20).map(stock => ({
    stock,
    price: priceMap.get(stock.symbol),
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

      <div className="min-w-0 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
        <div className="flex w-max min-w-full gap-3">
          {tickerItems.map(({ stock, price }) => {
            const hasPrice = Boolean(price?.available && price.price !== null);
            const changePercent = hasPrice ? price?.changePercent ?? null : null;
            const positive = changePercent !== null && changePercent > 0;
            const negative = changePercent !== null && changePercent < 0;
            const TrendIcon = negative ? TrendingDown : TrendingUp;

            return (
              <article
                key={stock.symbol}
                className="min-w-[210px] max-w-[250px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span dir="ltr" className="text-base font-black text-slate-950 dark:text-white">
                        {stock.symbol}
                      </span>
                      {hasPrice && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black ${changeBadgeClass(changePercent)}`} dir="ltr">
                          <TrendIcon size={12} />
                          {changePercent === null ? '-' : formatPercent(changePercent, locale)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {stock.name}
                    </p>
                  </div>
                </div>
                {hasPrice && (
                  <p className={`mt-3 text-sm font-black ${positive ? 'text-emerald-700 dark:text-emerald-300' : negative ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100'}`} dir="ltr">
                    {formatPrice(price!.price!, locale)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default CategoryStockTicker;
