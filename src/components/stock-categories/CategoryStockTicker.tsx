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
      <section className="category-stock-ticker empty" dir={direction}>
        <div className="category-stock-ticker-empty-row">
          <AlertCircle size={18} />
          <span>{text.unavailable}</span>
        </div>
        <CategoryStockTickerStyles />
      </section>
    );
  }

  return (
    <section
      className="category-stock-ticker"
      dir={direction}
      aria-label={text.title}
    >
      <div className="category-stock-ticker-head">
        <div className="category-stock-ticker-title-row">
          <span className="category-stock-ticker-icon">
            <Activity size={18} />
          </span>
          <div className="category-stock-ticker-copy">
            <h2>{text.title}</h2>
            <p>{text.subtitle}</p>
          </div>
        </div>
        {availablePrices.length === 0 && (
          <span className="category-stock-ticker-note">
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
      <CategoryStockTickerStyles />
    </section>
  );
}

function CategoryStockTickerStyles() {
  return (
    <style jsx global>{`
      .category-stock-ticker{min-width:0;overflow:hidden;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);padding:16px;box-shadow:var(--shadow-card);font-family:var(--font-ui);color:var(--foreground)}
      .category-stock-ticker.empty{overflow:visible}
      .category-stock-ticker-empty-row{display:flex;align-items:center;gap:12px;color:var(--foreground-secondary);font-size:14px;font-weight:500;line-height:1.6}
      .category-stock-ticker-head{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
      .category-stock-ticker-title-row{display:flex;min-width:0;align-items:center;gap:12px}
      .category-stock-ticker-icon{width:40px;height:40px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-control);background:var(--primary-soft);color:var(--primary)}
      .category-stock-ticker-copy{min-width:0}
      .category-stock-ticker-copy h2{margin:0;color:var(--foreground);font-size:14px;font-weight:600;line-height:1.45}
      .category-stock-ticker-copy p{margin:2px 0 0;color:var(--foreground-muted);font-size:12px;font-weight:400;line-height:1.55}
      .category-stock-ticker-note{display:inline-flex;width:fit-content;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--foreground-secondary);padding:6px 12px;font-size:12px;font-weight:500;line-height:1.45}
      @media(min-width:640px){.category-stock-ticker-head{flex-direction:row;align-items:center;justify-content:space-between}}
    `}</style>
  );
}

export default CategoryStockTicker;


