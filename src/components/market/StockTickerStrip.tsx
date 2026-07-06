'use client';

import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';

type TickerDirection = 'ltr' | 'rtl';
type TickerAssetType = 'stock' | 'etf' | 'crypto' | 'unknown';

const isMarketTickerDev = process.env.NODE_ENV === 'development';

const TECH_PROVIDER_NOISE_PATTERNS = [
  /fmp/i,
  /finnhub/i,
  /yahoo\s*finance/i,
  /provider/i,
  /fallback/i,
];

export type StockTickerStripItem = {
  symbol: string;
  name?: string | null;
  assetType?: TickerAssetType;
  imageUrl?: string | null;
  logoUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  changePercent?: number | null;
  source?: string | null;
  available?: boolean;
  meta?: ReactNode;
};

type StockTickerStripProps = {
  ariaLabel: string;
  items: StockTickerStripItem[];
  locale: string;
  unavailableLabel: string;
  sourceLabel?: string;
  className?: string;
  viewportClassName?: string;
  trackClassName?: string;
  setClassName?: string;
  direction?: TickerDirection;
  durationSeconds?: number;
  minimumItems?: number;
  status?: ReactNode;
  emptyState?: ReactNode;
  formatPrice?: (value: number, currency: string, item: StockTickerStripItem) => ReactNode;
  showDebugMeta?: boolean;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const MARKET_CURRENCY_ALIASES: Record<string, string> = {
  KWF: 'KWD',
};

const MARKET_CURRENCY_SUFFIXES: Array<[RegExp, string]> = [
  [/\.KW$/i, 'KWD'],
  [/\.(SR|SA)$/i, 'SAR'],
  [/\.(AE|DU|AD)$/i, 'AED'],
  [/\.QA$/i, 'QAR'],
  [/\.BH$/i, 'BHD'],
  [/\.OM$/i, 'OMR'],
];

function normalizeTickerCurrency(value: string | null | undefined) {
  const currency = String(value ?? '').trim().toUpperCase();
  if (!currency) return null;
  return MARKET_CURRENCY_ALIASES[currency] ?? currency;
}

function inferTickerCurrency(symbol: string, explicitCurrency?: string | null) {
  const normalized = normalizeTickerCurrency(explicitCurrency);
  if (normalized && normalized !== 'USD') return normalized;

  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  const suffixCurrency = MARKET_CURRENCY_SUFFIXES.find(([pattern]) => pattern.test(cleanSymbol))?.[1];
  return suffixCurrency ?? normalized ?? 'USD';
}

function localeWithLatinDigits(locale: string) {
  if (!locale) return 'en-US-u-nu-latn';
  return locale.includes('-u-') ? locale : `${locale}-u-nu-latn`;
}

function isTechnicalProviderSource(value: string | null | undefined) {
  const clean = String(value ?? '').trim();
  if (!clean) return true;
  return TECH_PROVIDER_NOISE_PATTERNS.some(pattern => pattern.test(clean));
}

function buildProviderMeta(source: string | null | undefined, sourceLabel?: string) {
  const clean = String(source ?? '').trim();
  if (!clean || isTechnicalProviderSource(clean)) return null;
  return sourceLabel ? `${sourceLabel}: ${clean}` : clean;
}

function formatMoney(value: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(localeWithLatinDigits(locale), {
      style: 'currency',
      currency,
      numberingSystem: 'latn',
      maximumFractionDigits: value >= 100 ? 2 : 3,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(value >= 100 ? 2 : 3)}`;
  }
}

function formatPercent(value: number, locale: string) {
  const formatted = new Intl.NumberFormat(localeWithLatinDigits(locale), {
    numberingSystem: 'latn',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
  return `${value > 0 ? '+' : ''}${formatted}%`;
}

function normalizeItem(item: StockTickerStripItem) {
  const symbol = String(item.symbol ?? '').trim().toUpperCase();
  return {
    ...item,
    symbol,
    name: String(item.name ?? symbol).trim() || symbol,
    assetType: item.assetType ?? 'stock',
    imageUrl: item.imageUrl ?? null,
    logoUrl: item.logoUrl ?? null,
    currency: inferTickerCurrency(symbol, item.currency),
    source: String(item.source ?? '').trim(),
  };
}

export function StockTickerStrip({
  ariaLabel,
  items,
  locale,
  unavailableLabel,
  sourceLabel,
  className,
  viewportClassName,
  trackClassName,
  setClassName,
  direction = 'ltr',
  durationSeconds = 44,
  minimumItems = 10,
  status,
  emptyState,
  formatPrice,
  showDebugMeta = false,
}: StockTickerStripProps) {
  const tickerItems = items.map(normalizeItem).filter(item => item.symbol);
  const fallbackState = emptyState ?? (
    <div className="sfm-stock-ticker-empty">{unavailableLabel}</div>
  );

  return (
    <>
      <MarketTickerStrip
      ariaLabel={ariaLabel}
      className={className}
      viewportClassName={viewportClassName}
      trackClassName={trackClassName}
      setClassName={setClassName}
      direction={direction}
      durationSeconds={durationSeconds}
      minimumItems={minimumItems}
      status={status}
      emptyState={fallbackState}
    >
      {tickerItems.map(item => {
        const available = item.available !== false;
        const price = available && isFiniteNumber(item.price) ? item.price : null;
        const changePercent = available && isFiniteNumber(item.changePercent) ? item.changePercent : null;
        const tone = changePercent !== null ? (changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral') : 'neutral';
        const TrendIcon = tone === 'up' ? TrendingUp : tone === 'down' ? TrendingDown : null;
        const provider = isMarketTickerDev && showDebugMeta ? buildProviderMeta(item.source, sourceLabel) : null;
        const showUnavailableTag = !available || (price === null && changePercent === null && !item.meta);

        return (
          <article className={`sfm-stock-ticker-card is-${tone}`} key={item.symbol} role="listitem" dir="ltr">
            <div className="sfm-stock-ticker-head">
              <AssetIdentity
                variant="badge"
                symbol={item.symbol}
                name={item.name}
                assetType={item.assetType}
                imageUrl={item.imageUrl}
                logoUrl={item.logoUrl}
                size="sm"
                showName={false}
                className="sfm-stock-ticker-logo"
              />
              <div className="sfm-stock-ticker-title">
                <strong dir="ltr">{item.symbol}</strong>
                <span dir="auto">{item.name}</span>
              </div>
            </div>

            <div className="sfm-stock-ticker-values">
              <b dir="ltr">
                {price !== null
                  ? formatPrice
                    ? formatPrice(price, item.currency, item)
                    : formatMoney(price, item.currency, locale)
                  : unavailableLabel}
              </b>
              <em className={`sfm-stock-ticker-change is-${tone}`} dir="ltr">
                {TrendIcon ? <TrendIcon size={12} /> : <span aria-hidden="true">--</span>}
                {changePercent !== null ? formatPercent(changePercent, locale) : unavailableLabel}
              </em>
            </div>

            <div className="sfm-stock-ticker-foot">
              {provider ? <small dir="auto">{provider}</small> : null}
              {item.meta ? <small dir="auto">{item.meta}</small> : null}
              {showUnavailableTag ? <small dir="auto" className="sfm-stock-ticker-unavailable">{unavailableLabel}</small> : null}
            </div>

          </article>
        );
      })}
      </MarketTickerStrip>
      <style jsx>{`
              .sfm-stock-ticker-card {
                inline-size: clamp(184px, 54vw, 232px);
                min-inline-size: min(184px, calc(100vw - 44px));
                max-inline-size: min(232px, calc(100vw - 44px));
                min-height: 128px;
                display: grid;
                align-content: start;
                gap: 9px;
                padding: 10px 12px 12px;
                border: 1px solid rgba(203, 213, 225, 0.86);
                border-radius: 16px;
                background: #ffffff;
                color: #0f172a;
                box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
                overflow: hidden;
                unicode-bidi: isolate;
              }

              .sfm-stock-ticker-head {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr);
                align-items: center;
                gap: 9px;
                min-width: 0;
              }

              .sfm-stock-ticker-logo {
                flex: 0 0 auto;
              }

              .sfm-stock-ticker-title {
                min-width: 0;
                display: grid;
                gap: 2px;
              }

              .sfm-stock-ticker-title strong {
                color: #0f172a;
                font-size: 13px;
                font-weight: 950;
                line-height: 1.15;
              }

              .sfm-stock-ticker-title span,
              .sfm-stock-ticker-foot small {
                color: #64748b;
                font-size: 11px;
                font-weight: 800;
                line-height: 1.35;
                overflow-wrap: anywhere;
              }

              .sfm-stock-ticker-values {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                min-width: 0;
              }

              .sfm-stock-ticker-values b {
                min-width: 0;
                color: #0f172a;
                font-size: 13px;
                font-weight: 950;
                line-height: 1.2;
                overflow-wrap: anywhere;
              }

              .sfm-stock-ticker-change {
                flex: 0 0 auto;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                border-radius: 999px;
                padding: 4px 7px;
                font-size: 10.5px;
                font-style: normal;
                font-weight: 950;
                line-height: 1;
                white-space: nowrap;
              }

              .sfm-stock-ticker-change.is-up {
                background: #dcfce7;
                color: #166534;
              }

              .sfm-stock-ticker-change.is-down {
                background: #fee2e2;
                color: #991b1b;
              }

              .sfm-stock-ticker-change.is-neutral {
                background: #e2e8f0;
                color: #334155;
              }

              .sfm-stock-ticker-foot {
                display: grid;
                gap: 2px;
                min-width: 0;
                margin-top: auto;
                padding-top: 4px;
              }

              .sfm-stock-ticker-unavailable {
                align-self: start;
                color: #0f766e;
              }

              .sfm-stock-ticker-empty {
                min-height: 72px;
                display: grid;
                place-items: center;
                border: 1px dashed rgba(148, 163, 184, 0.82);
                border-radius: 16px;
                background: rgba(248, 250, 252, 0.92);
                color: #64748b;
                font-size: 13px;
                font-weight: 900;
              }

              @media (max-width: 430px) {
                .sfm-stock-ticker-card {
                  inline-size: min(218px, calc(100vw - 42px));
                  min-height: 118px;
                  padding: 9px 10px;
                }
              }

              :global(.dark) .sfm-stock-ticker-card,
              :global(body.dark) .sfm-stock-ticker-card {
                border-color: rgba(125, 211, 252, 0.16);
                background: #0f172a;
                color: #f8fafc;
              }

              :global(.dark) .sfm-stock-ticker-title strong,
              :global(body.dark) .sfm-stock-ticker-title strong,
              :global(.dark) .sfm-stock-ticker-values b,
              :global(body.dark) .sfm-stock-ticker-values b {
                color: #f8fafc;
              }

              :global(.dark) .sfm-stock-ticker-title span,
              :global(body.dark) .sfm-stock-ticker-title span,
              :global(.dark) .sfm-stock-ticker-foot small,
              :global(body.dark) .sfm-stock-ticker-foot small {
                color: #cbd5e1;
              }
            `}</style>
    </>
  );
}

export default StockTickerStrip;
