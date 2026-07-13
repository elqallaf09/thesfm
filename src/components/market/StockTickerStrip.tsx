'use client';

import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';

type TickerDirection = 'ltr' | 'rtl';
type TickerAssetType = 'stock' | 'etf' | 'crypto' | 'unknown';

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
              {item.meta ? <small dir="auto">{item.meta}</small> : null}
              {showUnavailableTag ? <small dir="auto" className="sfm-stock-ticker-unavailable">{unavailableLabel}</small> : null}
            </div>

          </article>
        );
      })}
      </MarketTickerStrip>
      <style jsx>{`
              .sfm-stock-ticker-card {
                inline-size: 232px;
                min-inline-size: min(184px, 100%);
                max-inline-size: min(232px, 100%);
                min-height: 128px;
                display: grid;
                align-content: start;
                gap: 9px;
                padding: 10px 12px 12px;
                border: 1px solid var(--border);
                border-radius: var(--radius-card);
                background: var(--surface);
                color: var(--foreground);
                box-shadow: var(--shadow-card);
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
                color: var(--foreground);
                font-size: 13px;
                font-weight: 600;
                font-family: var(--font-data);
                line-height: 1.15;
              }

              .sfm-stock-ticker-title span,
              .sfm-stock-ticker-foot small {
                color: var(--foreground-muted);
                font-size: 11px;
                font-weight: 400;
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
                color: var(--foreground);
                font-size: 13px;
                font-weight: 600;
                font-family: var(--font-data);
                line-height: 1.2;
                overflow-wrap: anywhere;
              }

              .sfm-stock-ticker-change {
                flex: 0 0 auto;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                border-radius: var(--radius-pill);
                padding: 4px 7px;
                font-size: 10.5px;
                font-style: normal;
                font-weight: 600;
                font-family: var(--font-data);
                line-height: 1;
                white-space: nowrap;
              }

              .sfm-stock-ticker-change.is-up {
                background: var(--success-soft);
                color: var(--success);
              }

              .sfm-stock-ticker-change.is-down {
                background: var(--danger-soft);
                color: var(--danger);
              }

              .sfm-stock-ticker-change.is-neutral {
                background: var(--surface-muted);
                color: var(--foreground-secondary);
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
                color: var(--accent);
              }

              .sfm-stock-ticker-empty {
                min-height: 72px;
                display: grid;
                place-items: center;
                border: 1px dashed var(--border-strong);
                border-radius: var(--radius-card);
                background: var(--surface-muted);
                color: var(--foreground-muted);
                font-size: 13px;
                font-weight: 500;
              }

              @media (max-width: 430px) {
                .sfm-stock-ticker-card {
                  inline-size: min(218px, 100%);
                  min-height: 118px;
                  padding: 9px 10px;
                }
              }

            `}</style>
    </>
  );
}

export default StockTickerStrip;
