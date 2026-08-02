'use client';

import { useRef } from 'react';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';
import { MarketStripItem } from '@/components/market/MarketStripItem';
import { MarketStripControls } from '@/components/market/MarketStripControls';
import { MarketDataStatus, type MarketDataStatusTone } from '@/components/market/MarketDataStatus';
import { CountryExchangeHeading } from '@/components/market/CountryExchangeHeading';
import { inferStripCurrency, type GlobalMarketStripConfig } from '@/lib/market/globalMarketStrips';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';

type MarketStripProps = {
  strip: GlobalMarketStripConfig;
  prices: Record<string, TechStockPrice> | null;
  lang: Lang;
  dir: 'rtl' | 'ltr';
};

// TechStockPrice.delayed is always `true` (the Finnhub/Yahoo fallback chain
// this reads from is never a real-time feed), so a strip is either
// "delayed" (at least one quote resolved) or genuinely "unavailable" --
// never "live", which would misstate what the data actually is.
function stripStatusTone(items: GlobalMarketStripConfig['items'], prices: Record<string, TechStockPrice> | null): MarketDataStatusTone {
  if (!prices) return 'unavailable';
  const quotes = items.map(item => prices[item.symbol]).filter(Boolean);
  return quotes.some(quote => quote.available) ? 'delayed' : 'unavailable';
}

export function MarketStrip({ strip, prices, lang, dir }: MarketStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const label = lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn;
  const tone = stripStatusTone(strip.items, prices);

  const items = strip.items.map(config => {
    const quote = prices?.[config.symbol] ?? null;
    return {
      symbol: config.symbol,
      name: lang === 'ar' ? config.nameAr : config.name,
      sector: config.sector,
      price: quote?.available ? quote.price : null,
      currency: inferStripCurrency(config.symbol),
      changePercent: quote?.available ? quote.changePercent : null,
      available: Boolean(quote?.available),
    };
  });

  return (
    <section className="gm-strip" aria-labelledby={`gm-strip-heading-${strip.id}`}>
      <CountryExchangeHeading
        id={`gm-strip-heading-${strip.id}`}
        label={label}
        itemCount={strip.items.length}
        status={<MarketDataStatus tone={tone} lang={lang} />}
      />
      <div className="gm-strip-body" ref={containerRef}>
        <MarketTickerStrip
          ariaLabel={label}
          direction={dir}
          durationSeconds={Math.max(24, strip.items.length * 5)}
          minimumItems={12}
          status={<MarketStripControls containerRef={containerRef} dir={dir} lang={lang} />}
          emptyState={<div className="gm-strip-empty">{t('global_markets_strip_unavailable', lang)}</div>}
        >
          {items.map(item => (
            <MarketStripItem key={item.symbol} item={item} lang={lang} />
          ))}
        </MarketTickerStrip>
      </div>

      <style jsx>{`
        .gm-strip {
          min-width: 0;
        }

        .gm-strip-body {
          position: relative;
          min-width: 0;
        }

        /* The strip's control buttons render inside MarketTickerStrip's own
           <section> (via its status slot) specifically so that focusing
           them bubbles a native focus event to that section, which is how
           the shared component's built-in pause-on-focus is triggered --
           they cannot be a sibling of it. This scoped override only applies
           inside .gm-strip-body, so other MarketTickerStrip consumers
           (TechTickerStrip, StockTickerStrip, etc.) are unaffected. */
        .gm-strip-body :global(.market-ticker-strip[data-market-ticker='true']) {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .gm-strip-body :global(.market-ticker-viewport) {
          flex: 1 1 auto;
          min-width: 0;
        }

        .gm-strip-empty {
          min-height: 56px;
          display: grid;
          place-items: center;
          border: 1px dashed var(--border-strong);
          border-radius: var(--radius-card);
          background: var(--surface-muted);
          color: var(--foreground-muted);
          font-size: 12px;
          font-weight: 500;
          padding: 0 12px;
        }

        @media (max-width: 640px) {
          .gm-strip-body {
            gap: 4px;
          }
        }
      `}</style>
    </section>
  );
}

export default MarketStrip;
