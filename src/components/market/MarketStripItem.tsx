'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import type { GlobalMarketSector, GlobalMarketStripKind } from '@/lib/market/globalMarketStrips';
import { SECTOR_LABEL } from '@/lib/market/globalMarketStrips';
import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';

export type MarketStripItemData = {
  symbol: string;
  name: string;
  sector?: GlobalMarketSector;
  assetType?: GlobalMarketStripKind;
  price: number | null;
  currency: string | null;
  changePercent: number | null;
  available: boolean;
};

type MarketStripItemProps = {
  item: MarketStripItemData;
  lang: Lang;
};

function localeWithLatinDigits(lang: Lang) {
  const base = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en-US';
  return `${base}-u-nu-latn`;
}

function formatValue(value: number, currency: string | null, lang: Lang) {
  if (!currency) {
    // Forex rates and index points are not "an amount of a currency" --
    // render the bare formatted number so a EUR/USD rate never gets
    // stamped with a misleading currency symbol.
    return new Intl.NumberFormat(localeWithLatinDigits(lang), {
      numberingSystem: 'latn',
      maximumFractionDigits: value >= 100 ? 2 : 4,
    }).format(value);
  }
  try {
    return new Intl.NumberFormat(localeWithLatinDigits(lang), {
      style: 'currency',
      currency,
      numberingSystem: 'latn',
      maximumFractionDigits: value >= 100 ? 2 : 3,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(value >= 100 ? 2 : 3)}`;
  }
}

function formatPercent(value: number, lang: Lang) {
  const formatted = new Intl.NumberFormat(localeWithLatinDigits(lang), {
    numberingSystem: 'latn',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
  return `${value > 0 ? '+' : ''}${formatted}%`;
}

export function MarketStripItem({ item, lang }: MarketStripItemProps) {
  const unavailableLabel = t('global_markets_price_unavailable', lang);
  const available = item.available && item.price !== null;
  const tone = !available || item.changePercent === null
    ? 'neutral'
    : item.changePercent > 0 ? 'up' : item.changePercent < 0 ? 'down' : 'neutral';
  const TrendIcon = tone === 'up' ? TrendingUp : tone === 'down' ? TrendingDown : null;
  const assetTypeLabels: Record<GlobalMarketStripKind, Record<Lang, string>> = {
    equity: { ar: 'سهم', en: 'Equity', fr: 'Action' },
    forex: { ar: 'فوركس', en: 'Forex', fr: 'Forex' },
    commodity: { ar: 'سلعة', en: 'Commodity', fr: 'Matière première' },
    crypto: { ar: 'عملة رقمية', en: 'Crypto', fr: 'Crypto' },
    index: { ar: 'مؤشر', en: 'Index', fr: 'Indice' },
  };
  const sectorLabel = item.sector
    ? SECTOR_LABEL[item.sector][lang]
    : item.assetType ? assetTypeLabels[item.assetType][lang] : '';

  return (
    <article className={`gm-strip-item is-${tone}`} dir="ltr">
      <div className="gm-strip-item-head">
        <AssetIdentity
          variant="badge"
          symbol={item.symbol}
          name={item.name}
          size="xs"
          showName={false}
          className="gm-strip-item-logo"
        />
        <strong dir="ltr">{item.symbol}</strong>
      </div>
      <span className="gm-strip-item-name" dir="auto">{item.name}</span>
      <div className="gm-strip-item-values">
        <b dir="ltr">
          {available && item.price !== null ? formatValue(item.price, item.currency, lang) : unavailableLabel}
        </b>
        <em className={`gm-strip-item-change is-${tone}`} dir="ltr">
          {TrendIcon ? <TrendIcon size={10} /> : <span aria-hidden="true">--</span>}
          {available && item.changePercent !== null ? formatPercent(item.changePercent, lang) : unavailableLabel}
        </em>
      </div>
      {sectorLabel ? <span className="gm-strip-item-sector" dir="auto">{sectorLabel}</span> : null}

      <style jsx>{`
        .gm-strip-item {
          inline-size: 150px;
          min-inline-size: min(136px, 100%);
          max-inline-size: min(150px, 100%);
          display: grid;
          align-content: start;
          gap: 4px;
          padding: 7px 8px 8px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
          color: var(--foreground);
          box-shadow: var(--shadow-card);
          overflow: hidden;
          unicode-bidi: isolate;
        }

        .gm-strip-item-head {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .gm-strip-item-head strong {
          color: var(--foreground);
          font-size: 12px;
          font-weight: 700;
          font-family: var(--font-data);
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gm-strip-item-name {
          color: var(--foreground-muted);
          font-size: 10.5px;
          font-weight: 400;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gm-strip-item-values {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          min-width: 0;
          margin-top: 2px;
        }

        .gm-strip-item-values b {
          min-width: 0;
          color: var(--foreground);
          font-size: 11.5px;
          font-weight: 600;
          font-family: var(--font-data);
          line-height: 1.15;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gm-strip-item-change {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          border-radius: var(--radius-pill);
          padding: 2px 5px;
          font-size: 10px;
          font-style: normal;
          font-weight: 600;
          font-family: var(--font-data);
          line-height: 1;
          white-space: nowrap;
        }

        .gm-strip-item-change.is-up {
          background: var(--success-soft);
          color: var(--success);
        }

        .gm-strip-item-change.is-down {
          background: var(--danger-soft);
          color: var(--danger);
        }

        .gm-strip-item-change.is-neutral {
          background: var(--surface-muted);
          color: var(--foreground-secondary);
        }

        .gm-strip-item-sector {
          margin-top: 2px;
          color: var(--foreground-secondary);
          font-size: 9.5px;
          font-weight: 500;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gm-strip-item-sector.is-unavailable {
          color: var(--foreground-muted);
          font-style: italic;
        }

        @media (max-width: 430px) {
          .gm-strip-item {
            inline-size: min(136px, 100%);
            block-size: 74px;
            gap: 2px;
            padding: 5px 7px;
          }
          .gm-strip-item-name { font-size: 9.5px; }
          .gm-strip-item-values { margin-top: 0; }
          .gm-strip-item-sector { margin-top: 0; font-size: 9px; }
          .gm-strip-item-change { padding: 1px 4px; }
          .gm-strip-item-head :global(.gm-strip-item-logo) {
            inline-size: 20px;
            block-size: 20px;
          }
        }
      `}</style>
    </article>
  );
}

export default MarketStripItem;
