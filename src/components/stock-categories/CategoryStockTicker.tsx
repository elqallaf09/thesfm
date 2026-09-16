'use client';

import { useEffect, useMemo, useState } from 'react';
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

type ScannerTickerItem = {
  symbol: string;
  name: string;
  price: number | null;
  currency: string;
  changePercent: number | null;
  source: string;
  available: boolean;
  sector: string | null;
};

type ScannerResponse = {
  ok?: boolean;
  items?: ScannerTickerItem[];
};

const labels = {
  ar: {
    title: 'شريط الأسهم',
    subtitle: 'رموز متجددة من السكانر الكامل لهذا التصنيف.',
    unavailable: 'لا توجد بيانات أسعار متاحة حاليًا.',
    notAvailable: 'غير متاح',
    symbolsOnly: 'تُعرض الرموز فقط عند تعذر جلب الأسعار الحية.',
  },
  en: {
    title: 'Stock ticker',
    subtitle: 'Refreshing symbols from the full scanner for this category.',
    unavailable: 'No price data is available right now.',
    notAvailable: 'Unavailable',
    symbolsOnly: 'Symbols only are shown when live prices cannot be fetched.',
  },
  fr: {
    title: 'Bandeau actions',
    subtitle: 'Symboles actualisés depuis le scanner complet de cette catégorie.',
    unavailable: 'Aucune donnée de prix n’est disponible pour le moment.',
    notAvailable: 'Indisponible',
    symbolsOnly: 'Seuls les symboles sont affichés lorsque les prix ne sont pas disponibles.',
  },
};

function langFromLocale(locale: string) {
  if (locale.startsWith('en')) return 'en';
  if (locale.startsWith('fr')) return 'fr';
  return 'ar';
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
  const [scannerItems, setScannerItems] = useState<ScannerTickerItem[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/stock-categories/scanner?category=${encodeURIComponent(categoryType)}&limit=80`, {
          headers: { accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({})) as ScannerResponse;
        if (active && response.ok && payload.ok) setScannerItems(payload.items ?? []);
      } catch {
        // The configured watchlist below remains the transparent fallback.
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [categoryType]);

  const fallbackItems = useMemo(() => {
    const priceMap = new Map(priceData.map(item => [item.symbol.toUpperCase(), item]));
    return symbols.slice(0, 60).map(stock => {
      const price = priceMap.get(stock.symbol.toUpperCase());
      const hasPrice = Boolean(price?.available && price.price !== null);
      return {
        symbol: stock.symbol,
        name: stock.name,
        price: hasPrice ? price?.price ?? null : null,
        currency: 'USD',
        changePercent: hasPrice ? price?.changePercent ?? null : null,
        source: price?.source ?? '',
        available: hasPrice,
        sector: stock.filter.replace(/_/g, ' '),
      } satisfies ScannerTickerItem;
    });
  }, [priceData, symbols]);

  const tickerItems = scannerItems.length > 0 ? scannerItems.slice(0, 60) : fallbackItems;
  const availablePrices = tickerItems.filter(item => item.available && item.price !== null);

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
    <section className="category-stock-ticker" dir={direction} aria-label={text.title}>
      <div className="category-stock-ticker-head">
        <div className="category-stock-ticker-title-row">
          <span className="category-stock-ticker-icon"><Activity size={18} /></span>
          <div className="category-stock-ticker-copy">
            <h2>{text.title}</h2>
            <p>{text.subtitle}</p>
          </div>
        </div>
        {availablePrices.length === 0 && <span className="category-stock-ticker-note">{text.symbolsOnly}</span>}
      </div>

      <StockTickerStrip
        ariaLabel={text.title}
        items={tickerItems.map(item => ({
          symbol: item.symbol,
          name: item.name,
          price: item.price,
          currency: item.currency,
          changePercent: item.changePercent,
          source: item.source,
          available: item.available,
          meta: item.sector ?? undefined,
        }))}
        locale={locale}
        unavailableLabel={text.notAvailable}
        className="min-w-0"
        viewportClassName="pb-1"
        direction="ltr"
        durationSeconds={44}
        minimumItems={12}
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
