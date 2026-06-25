'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Coins,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { AssetAvatar } from '@/components/asset/AssetAvatar';
import type { MarketMoversData, MarketMoverItem } from '@/lib/markets/marketMovers';

type MarketMoversApiResponse =
  | {
    ok: true;
    market: string;
    marketName: string;
    currency: string;
    updated_at: string;
    source: string;
    data: MarketMoversData;
    warnings?: string[];
  }
  | {
    ok: false;
    code: string;
    market: string;
    marketName?: string;
    currency?: string;
    updated_at: string | null;
    source: string;
    data: null;
    message?: string;
  };

type MarketMoversLabels = {
  title: string;
  subtitle: string;
  compactTitle: string;
  compactSubtitle: string;
  fullDetails: string;
  fullTitle: string;
  fullSubtitle: string;
  close: string;
  topGainers: string;
  topLosers: string;
  highestPrice: string;
  lowestPrice: string;
  highestVolume: string;
  lowestVolume: string;
  topGainersShort: string;
  topLosersShort: string;
  highestVolumeShort: string;
  stocksCount: string;
  price: string;
  change: string;
  volume: string;
  source: string;
  lastUpdated: string;
  refresh: string;
  loading: string;
  unavailableTitle: string;
  unavailableBody: string;
  emptyTitle: string;
  emptyBody: string;
  limitedData: string;
};

type MarketMoversCardProps = {
  market: string;
  marketLabel: string;
  locale: string;
  labels: MarketMoversLabels;
};

type MoverListConfig = {
  key: keyof MarketMoversData;
  label: string;
  icon: typeof TrendingUp;
  tone: 'up' | 'down' | 'price' | 'volume';
};

function hasData(data: MarketMoversData | null) {
  return Boolean(data && Object.values(data).some(list => list.length > 0));
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPrice(value: number, currency: string, locale: string) {
  const digits = currency === 'KWD' || currency === 'BHD' || currency === 'OMR' ? 3 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number | null, locale: string) {
  if (value === null) return '-';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${value > 0 ? '+' : ''}${formatted}%`;
}

function formatVolume(value: number | null, locale: string) {
  if (value === null) return '-';
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function countLabel(labels: MarketMoversLabels, count: number) {
  return labels.stocksCount.replace('{count}', String(count));
}

function SkeletonList({ title, rows = 3 }: { title: string; rows?: number }) {
  return (
    <div className="market-movers-list skeleton" aria-hidden="true">
      <div className="market-movers-list-title">
        <span />
        <strong>{title}</strong>
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div className="market-movers-row skeleton-row" key={index}>
          <i />
          <span />
          <b />
        </div>
      ))}
    </div>
  );
}

function EmptyList({ text }: { text: string }) {
  return <p className="market-movers-list-empty">{text}</p>;
}

function MoverRow({
  item,
  labels,
  locale,
  compact = false,
}: {
  item: MarketMoverItem;
  labels: MarketMoversLabels;
  locale: string;
  compact?: boolean;
}) {
  const changeTone = item.changePercent === null ? 'neutral' : item.changePercent > 0 ? 'up' : item.changePercent < 0 ? 'down' : 'neutral';

  return (
    <article className={`market-movers-row ${compact ? 'compact' : ''}`}>
      <span className="market-movers-rank">{item.rank}</span>
      <AssetAvatar symbol={item.symbol} name={item.name} assetType="stock" size="sm" decorative />
      <div className="market-movers-identity">
        <strong dir="ltr">{item.symbol}</strong>
        <span>{item.name}</span>
      </div>
      <dl className="market-movers-values">
        <div>
          <dt>{labels.price}</dt>
          <dd dir="ltr">{formatPrice(item.price, item.currency, locale)}</dd>
        </div>
        <div>
          <dt>{labels.change}</dt>
          <dd dir="ltr" className={changeTone}>{formatPercent(item.changePercent, locale)}</dd>
        </div>
        {!compact && (
          <div>
            <dt>{labels.volume}</dt>
            <dd dir="ltr">{formatVolume(item.volume, locale)}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

function MoverList({
  config,
  items,
  labels,
  locale,
  compact = false,
  maxItems,
}: {
  config: MoverListConfig;
  items: MarketMoverItem[];
  labels: MarketMoversLabels;
  locale: string;
  compact?: boolean;
  maxItems?: number;
}) {
  const Icon = config.icon;
  const visibleItems = typeof maxItems === 'number' ? items.slice(0, maxItems) : items;

  return (
    <section className={`market-movers-list tone-${config.tone} ${compact ? 'compact' : ''}`}>
      <div className="market-movers-list-title">
        <span>
          <Icon size={16} />
        </span>
        <strong>{config.label}</strong>
        {!compact && <em>{countLabel(labels, visibleItems.length)}</em>}
      </div>
      <div className="market-movers-list-body">
        {visibleItems.length === 0 ? (
          <EmptyList text={labels.emptyBody} />
        ) : (
          visibleItems.map(item => (
            <MoverRow
              key={`${config.key}-${item.rank}-${item.symbol}`}
              item={item}
              labels={labels}
              locale={locale}
              compact={compact}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function MarketMoversCard({ market, marketLabel, locale, labels }: MarketMoversCardProps) {
  const [response, setResponse] = useState<MarketMoversApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fullListConfigs = useMemo<MoverListConfig[]>(() => [
    { key: 'topGainers', label: labels.topGainers, icon: TrendingUp, tone: 'up' },
    { key: 'topLosers', label: labels.topLosers, icon: TrendingDown, tone: 'down' },
    { key: 'highestPrice', label: labels.highestPrice, icon: ArrowUp, tone: 'price' },
    { key: 'lowestPrice', label: labels.lowestPrice, icon: ArrowDown, tone: 'price' },
    { key: 'highestVolume', label: labels.highestVolume, icon: BarChart3, tone: 'volume' },
    { key: 'lowestVolume', label: labels.lowestVolume, icon: Activity, tone: 'volume' },
  ], [labels]);

  const compactListConfigs = useMemo<MoverListConfig[]>(() => [
    { key: 'topGainers', label: labels.topGainersShort, icon: TrendingUp, tone: 'up' },
    { key: 'topLosers', label: labels.topLosersShort, icon: TrendingDown, tone: 'down' },
    { key: 'highestVolume', label: labels.highestVolumeShort, icon: BarChart3, tone: 'volume' },
  ], [labels]);

  const load = useCallback(async (showInitialLoader = false) => {
    if (!market) return;
    if (showInitialLoader) setLoading(true);
    setRefreshing(!showInitialLoader);

    try {
      const apiResponse = await fetch(`/api/markets/movers?market=${encodeURIComponent(market)}&limit=5`, {
        cache: 'no-store',
      });
      const json = await apiResponse.json().catch(() => null) as MarketMoversApiResponse | null;
      setResponse(json ?? {
        ok: false,
        code: 'MARKET_MOVERS_UNAVAILABLE',
        market,
        updated_at: null,
        source: 'Yahoo Finance',
        data: null,
      });
    } catch {
      setResponse({
        ok: false,
        code: 'MARKET_MOVERS_UNAVAILABLE',
        market,
        updated_at: null,
        source: 'Yahoo Finance',
        data: null,
      });
    } finally {
      if (showInitialLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [market]);

  useEffect(() => {
    setResponse(null);
    setDetailsOpen(false);
    void load(true);
  }, [load]);

  const data = response?.ok ? response.data : null;
  const marketName = response?.ok ? response.marketName : response?.marketName ?? marketLabel;
  const source = response?.source ?? 'Yahoo Finance';
  const updatedAt = response?.ok ? response.updated_at : response?.updated_at ?? null;
  const limited = response?.ok && response.warnings?.includes('provider_returned_limited_rows');

  const meta = (
    <div className="market-movers-meta">
      <span>{labels.source}: <strong>{source}</strong></span>
      <span>{labels.lastUpdated}: <strong dir="ltr">{formatDateTime(updatedAt, locale)}</strong></span>
      {limited && <em>{labels.limitedData}</em>}
    </div>
  );

  return (
    <section className="market-movers-card compact" aria-label={labels.compactTitle}>
      <div className="market-movers-header">
        <div className="market-movers-title">
          <span className="market-movers-icon">
            <Coins size={21} />
          </span>
          <div>
            <p>{marketName}</p>
            <h2>{labels.compactTitle}</h2>
            <span>{labels.compactSubtitle}</span>
          </div>
        </div>
        <button
          type="button"
          className="market-movers-refresh"
          onClick={() => void load(false)}
          disabled={loading || refreshing}
        >
          <RefreshCcw size={15} className={refreshing ? 'spinning' : undefined} />
          {labels.refresh}
        </button>
      </div>

      {meta}

      {loading ? (
        <div className="market-movers-compact-grid">
          {compactListConfigs.map(config => <SkeletonList key={config.key} title={config.label} rows={3} />)}
        </div>
      ) : !hasData(data) ? (
        <div className="market-movers-unavailable compact">
          <AlertTriangle size={21} />
          <strong>{response?.ok === false ? labels.unavailableTitle : labels.emptyTitle}</strong>
          <p>{response?.ok === false ? labels.unavailableBody : labels.emptyBody}</p>
        </div>
      ) : (
        <div className="market-movers-compact-grid">
          {compactListConfigs.map(config => (
            <MoverList
              key={config.key}
              config={config}
              items={data?.[config.key] ?? []}
              labels={labels}
              locale={locale}
              compact
              maxItems={3}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        className="market-movers-details-button"
        onClick={() => setDetailsOpen(true)}
        disabled={loading || !hasData(data)}
      >
        <BarChart3 size={16} />
        {labels.fullDetails}
      </button>

      {detailsOpen && (
        <div className="market-movers-modal-backdrop" role="presentation" onClick={() => setDetailsOpen(false)}>
          <section
            className="market-movers-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`market-movers-details-${market}`}
            onClick={event => event.stopPropagation()}
          >
            <div className="market-movers-modal-header">
              <div className="market-movers-title">
                <span className="market-movers-icon">
                  <BarChart3 size={22} />
                </span>
                <div>
                  <p>{marketName}</p>
                  <h2 id={`market-movers-details-${market}`}>{labels.fullTitle}</h2>
                  <span>{labels.fullSubtitle}</span>
                </div>
              </div>
              <button type="button" className="market-movers-close" onClick={() => setDetailsOpen(false)} aria-label={labels.close}>
                <X size={18} />
              </button>
            </div>

            {meta}

            <div className="market-movers-grid full">
              {fullListConfigs.map(config => (
                <MoverList
                  key={config.key}
                  config={config}
                  items={data?.[config.key] ?? []}
                  labels={labels}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      <style jsx global>{`
        .market-movers-card{
          --movers-panel:var(--gulf-panel,var(--europe-panel,var(--sfm-card)));
          --movers-panel-soft:var(--gulf-panel-soft,var(--europe-panel-soft,var(--sfm-light-card)));
          --movers-border:var(--gulf-border,var(--europe-border,rgba(29,140,255,.14)));
          --movers-border-strong:var(--gulf-border-strong,var(--europe-border-strong,rgba(29,140,255,.24)));
          --movers-text:var(--gulf-text,var(--europe-text,var(--sfm-primary-dark)));
          --movers-muted:var(--gulf-muted,var(--europe-muted,var(--sfm-muted)));
          --movers-accent:var(--gulf-accent,var(--europe-accent,var(--sfm-soft-cyan)));
          width:100%;
          min-width:0;
          overflow:hidden;
          border:1px solid var(--movers-border);
          border-radius:24px;
          background:linear-gradient(180deg,var(--movers-panel),var(--movers-panel-soft));
          box-shadow:0 18px 48px rgba(3,18,37,.12);
          padding:18px;
          display:grid;
          gap:14px;
          color:var(--movers-text);
        }
        .market-movers-card.compact{position:relative}
        .market-movers-header,.market-movers-modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-width:0}
        .market-movers-title{display:flex;align-items:center;gap:12px;min-width:0}
        .market-movers-icon{width:48px;height:48px;flex:0 0 auto;border-radius:17px;display:grid;place-items:center;background:#CCFBF1;border:1px solid rgba(15,118,110,.25);color:#0F766E}
        .dark .market-movers-icon{background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25);color:#2FD6C0}
        .market-movers-title p{margin:0;color:var(--movers-accent);font-size:11px;font-weight:950;line-height:1.4}
        .market-movers-title h2{margin:3px 0;color:var(--movers-text);font-size:20px;font-weight:950;line-height:1.2}
        .market-movers-title span{display:block;color:var(--movers-muted);font-size:12px;font-weight:850;line-height:1.55}
        .market-movers-refresh,.market-movers-close,.market-movers-details-button{border:1px solid var(--movers-border-strong);background:rgba(47,214,192,.10);color:var(--movers-text);display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,color .18s ease}
        .market-movers-refresh{flex:0 0 auto;min-height:39px;border-radius:14px;padding:0 12px}
        .market-movers-close{width:42px;height:42px;border-radius:14px;flex:0 0 auto}
        .market-movers-details-button{width:100%;min-height:44px;border-radius:15px;padding:0 14px;background:linear-gradient(135deg,rgba(47,214,192,.18),rgba(29,140,255,.10));color:#0F766E}
        .dark .market-movers-details-button{color:#2FD6C0}
        .market-movers-refresh:hover:not(:disabled),.market-movers-refresh:focus-visible:not(:disabled),.market-movers-close:hover,.market-movers-close:focus-visible,.market-movers-details-button:hover:not(:disabled),.market-movers-details-button:focus-visible:not(:disabled){outline:none;transform:translateY(-1px);border-color:rgba(47,214,192,.55);background:rgba(47,214,192,.16);color:var(--movers-accent)}
        .market-movers-refresh:disabled,.market-movers-details-button:disabled{opacity:.62;cursor:not-allowed;transform:none}
        .market-movers-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--movers-muted);font-size:11px;font-weight:900}
        .market-movers-meta span,.market-movers-meta em{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--movers-border);border-radius:999px;background:rgba(142,166,195,.08);padding:6px 9px;font-style:normal;line-height:1.2}
        .market-movers-meta strong{color:var(--movers-text);font-weight:950}
        .market-movers-meta em{color:#B45309;background:rgba(245,185,66,.12);border-color:rgba(245,185,66,.24)}
        .dark .market-movers-meta em{color:#F5B942}
        .market-movers-compact-grid{display:grid;gap:11px;min-width:0}
        .market-movers-grid.full{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;min-width:0}
        .market-movers-list{min-width:0;border:1px solid var(--movers-border);border-radius:18px;background:rgba(255,255,255,.48);padding:12px;display:grid;gap:10px;overflow:hidden}
        .market-movers-list.compact{border-radius:17px;padding:11px;background:rgba(255,255,255,.40)}
        .dark .market-movers-list{background:rgba(15,29,49,.42)}
        .market-movers-list-title{display:flex;align-items:center;gap:8px;min-width:0}
        .market-movers-list-title span{width:32px;height:32px;border-radius:12px;display:grid;place-items:center;flex:0 0 auto;background:rgba(47,214,192,.12);color:var(--movers-accent)}
        .market-movers-list-title strong{min-width:0;color:var(--movers-text);font-size:13px;font-weight:950;line-height:1.35}
        .market-movers-list-title em{margin-inline-start:auto;border-radius:999px;border:1px solid var(--movers-border);background:rgba(142,166,195,.08);color:var(--movers-muted);padding:5px 8px;font-size:10px;font-style:normal;font-weight:950;white-space:nowrap}
        .market-movers-list-body{display:grid;gap:8px;min-width:0}
        .market-movers-row{min-width:0;border:1px solid var(--movers-border);border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.68),rgba(255,255,255,.38));padding:9px;display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:8px;align-items:center}
        .market-movers-row.compact{padding:8px}
        .dark .market-movers-row{background:linear-gradient(180deg,rgba(19,36,58,.76),rgba(15,29,49,.54))}
        .market-movers-rank{width:26px;height:26px;border-radius:999px;background:#E0F2FE;color:#075985;display:grid;place-items:center;font-size:11px;font-weight:950;line-height:1}
        .dark .market-movers-rank{background:rgba(47,214,192,.12);color:#2FD6C0}
        .market-movers-identity{min-width:0;display:grid;gap:2px}
        .market-movers-identity strong{color:var(--movers-text);font-size:13px;font-weight:950;letter-spacing:.02em;line-height:1.25}
        .market-movers-identity span{color:var(--movers-muted);font-size:10.5px;font-weight:850;line-height:1.45;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .market-movers-values{grid-column:1/-1;margin:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
        .market-movers-row.compact .market-movers-values{grid-template-columns:repeat(2,minmax(0,1fr))}
        .market-movers-values div{min-width:0;border-radius:11px;background:rgba(142,166,195,.08);padding:6px}
        .market-movers-values dt{color:var(--movers-muted);font-size:9.5px;font-weight:900;line-height:1.4}
        .market-movers-values dd{margin:2px 0 0;color:var(--movers-text);font-size:10.5px;font-weight:950;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .market-movers-values dd.up{color:#047857}.market-movers-values dd.down{color:#DC2626}.market-movers-values dd.neutral{color:var(--movers-muted)}
        .dark .market-movers-values dd.up{color:#2FD6C0}.dark .market-movers-values dd.down{color:#FF5B6E}
        .tone-up .market-movers-list-title span{background:rgba(16,185,129,.13);color:#047857}.dark .tone-up .market-movers-list-title span{color:#34D399}
        .tone-down .market-movers-list-title span{background:rgba(239,68,68,.12);color:#DC2626}.dark .tone-down .market-movers-list-title span{color:#FF5B6E}
        .tone-price .market-movers-list-title span{background:rgba(59,130,246,.12);color:#1D4ED8}.dark .tone-price .market-movers-list-title span{color:#93C5FD}
        .tone-volume .market-movers-list-title span{background:rgba(47,214,192,.12);color:#0F766E}.dark .tone-volume .market-movers-list-title span{color:#2FD6C0}
        .market-movers-list-empty{margin:0;color:var(--movers-muted);font-size:12px;font-weight:850;line-height:1.7;padding:14px 6px;text-align:center}
        .market-movers-unavailable{display:grid;place-items:center;gap:9px;text-align:center;border:1px dashed var(--movers-border-strong);border-radius:18px;padding:24px 14px;color:var(--movers-muted);background:rgba(142,166,195,.07)}
        .market-movers-unavailable svg{color:#B45309}.dark .market-movers-unavailable svg{color:#F5B942}
        .market-movers-unavailable strong{color:var(--movers-text);font-size:15px;font-weight:950}
        .market-movers-unavailable p{margin:0;color:var(--movers-muted);font-size:12px;font-weight:850;line-height:1.65}
        .market-movers-list.skeleton .market-movers-list-title span,.market-movers-list.skeleton .market-movers-row i,.market-movers-list.skeleton .market-movers-row span,.market-movers-list.skeleton .market-movers-row b{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(142,166,195,.10),rgba(47,214,192,.20),rgba(142,166,195,.10));background-size:220% 100%;animation:marketMoversShimmer 1.2s linear infinite}
        .market-movers-list.skeleton .market-movers-list-title strong{color:var(--movers-muted)}
        .market-movers-list.skeleton .market-movers-row{grid-template-columns:auto 1fr auto;align-items:center}
        .market-movers-list.skeleton .market-movers-row i{width:26px;height:26px}
        .market-movers-list.skeleton .market-movers-row span{width:70%;height:13px}
        .market-movers-list.skeleton .market-movers-row b{width:48px;height:13px}
        @keyframes marketMoversShimmer{to{background-position:-220% 0}}
        .market-movers-modal-backdrop{position:fixed;inset:0;z-index:90;background:rgba(6,18,32,.58);backdrop-filter:blur(10px);display:grid;place-items:center;padding:22px}
        .market-movers-modal{width:min(1040px,100%);max-height:min(86dvh,900px);overflow:auto;border:1px solid var(--movers-border-strong);border-radius:26px;background:linear-gradient(180deg,var(--movers-panel),var(--movers-panel-soft));box-shadow:0 30px 90px rgba(3,18,37,.34);padding:20px;display:grid;gap:16px;color:var(--movers-text)}
        @media(max-width:1180px){.market-movers-grid.full{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:720px){.market-movers-card{border-radius:20px;padding:15px}.market-movers-header{display:grid}.market-movers-refresh{width:100%}.market-movers-title h2{font-size:19px}.market-movers-modal-backdrop{align-items:end;padding:0}.market-movers-modal{width:100%;max-height:92dvh;border-radius:24px 24px 0 0;padding:16px}.market-movers-modal-header{align-items:flex-start}.market-movers-grid.full{grid-template-columns:1fr}.market-movers-values{grid-template-columns:1fr}.market-movers-row.compact .market-movers-values{grid-template-columns:repeat(2,minmax(0,1fr))}.market-movers-identity span{white-space:normal}}
      `}</style>
    </section>
  );
}

export default MarketMoversCard;
