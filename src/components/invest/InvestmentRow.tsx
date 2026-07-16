'use client';

import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  FolderOpen,
  Minus,
  MoreHorizontal,
  NotebookText,
  PieChart,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { memo, useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AssetAvatar } from '@/components/asset/AssetAvatar';
import { calculateInvestmentHoldingMetrics, investmentNativeCurrency } from '@/lib/investmentCalculations';
import type { Investment } from '@/types/investment';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InvestmentSparkline, type InvestmentHistoryPoint } from './InvestmentSparkline';
import { PlatformIdentity } from './PlatformIdentity';

export type InvestmentPriceRefreshStatus = {
  state: 'failed' | 'updated' | 'guest_restricted' | 'offline';
  message?: string;
  at: string;
};

export type InvestmentCardLabels = {
  details: string;
  expandDetails?: string;
  collapseDetails?: string;
  moreActions?: string;
  edit: string;
  delete: string;
  monthly: string;
  startDate?: string;
  risk: string;
  expectedReturn: string;
  ofPortfolio: string;
  refreshPrice?: string;
  refreshingPrice?: string;
  symbol?: string;
  market?: string;
  quantity?: string;
  numberOfUnits?: string;
  assetQuantity?: string;
  metalCount?: string;
  metalWeight?: string;
  currentMarketValue?: string;
  currentValue?: string;
  currentPrice?: string;
  purchasePrice?: string;
  totalInvested?: string;
  profitLoss?: string;
  profitLossPercent?: string;
  lastUpdated?: string;
  dataSource?: string;
  priceStatus?: string;
  priceUpdated?: string;
  priceUpdateFailed?: string;
  guestPriceRefreshRestricted?: string;
  currentPriceUnavailable?: string;
  purchasePriceMissing?: string;
  unavailable?: string;
  approxUserCurrency?: string;
  currency?: string;
  purchasePlatform?: string;
  purchasePlatformBadgeTitle?: string;
  purchasePlatformPending?: string;
  purchasePlatformNotSpecified?: string;
  platformTypeLabels?: Record<string, string>;
  overview?: string;
  aiSummary?: string;
  allocation?: string;
  performance?: string;
  dividends?: string;
  notes?: string;
  attachments?: string;
  brokerNotes?: string;
  transactions?: string;
  priceHistory?: string;
  documents?: string;
  noData?: string;
  lifetime?: string;
  currentStatus?: string;
  activeStatus?: string;
  riskShort?: string;
  averageCost?: string;
  investedValue?: string;
  todayChange?: string;
  historyLoading?: string;
  historyUnavailable?: string;
  period30Days?: string;
};

interface Props {
  investment: Investment;
  accountValue: number | null;
  portfolioPercent: number | null;
  labels: InvestmentCardLabels;
  typeLabel: (type: Investment['type']) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
  formatNativeMoney: (amount: number | null | undefined, currency?: string | null, item?: Investment | null, options?: { unitPrice?: boolean }) => string;
  onDetails: (item: Investment) => void;
  onEdit: (item: Investment) => void;
  onDelete: (item: Investment) => void;
  onRefreshPrice?: (item: Investment) => void;
  refreshing?: boolean;
  priceRefreshStatus?: InvestmentPriceRefreshStatus;
  platformLogoUrl?: string | null;
}

type InvestmentHistoryState =
  | { status: 'idle' | 'loading' | 'unavailable'; points: InvestmentHistoryPoint[] }
  | { status: 'ready'; points: InvestmentHistoryPoint[] };

const investmentHistoryCache = new Map<string, InvestmentHistoryState>();
const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeRollingHistoryPoints(points: Array<{ time?: unknown; close?: unknown }>) {
  const normalized: Array<InvestmentHistoryPoint & { timestamp: number }> = [];
  for (const point of points) {
    const time = String(point.time ?? '');
    const close = Number(point.close);
    const timestamp = Date.parse(time);
    if (!time || !Number.isFinite(close) || !Number.isFinite(timestamp)) continue;
    normalized.push({ time, close, timestamp });
  }
  if (normalized.length === 0) return [];

  const latestTimestamp = Math.max(...normalized.map(point => point.timestamp));
  const windowStart = latestTimestamp - HISTORY_WINDOW_MS;
  return normalized
    .filter(point => point.timestamp >= windowStart)
    .sort((left, right) => left.timestamp - right.timestamp)
    .map(({ time, close }) => ({ time, close }));
}

export const InvestmentRow = memo(function InvestmentRow({
  investment,
  accountValue,
  portfolioPercent,
  labels,
  typeLabel,
  riskLabel,
  formatMoney,
  formatNativeMoney,
  onDetails,
  onEdit,
  onDelete,
  onRefreshPrice,
  refreshing = false,
  priceRefreshStatus,
  platformLogoUrl,
}: Props) {
  const metrics = useMemo(() => calculateInvestmentHoldingMetrics(investment), [investment]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [historyState, setHistoryState] = useState<InvestmentHistoryState>({ status: 'idle', points: [] });
  const expansionId = useId();
  const cardTitleId = `${expansionId}-title`;
  const expansionButtonId = `${expansionId}-trigger`;
  const nativeCurrency = investmentNativeCurrency(investment);
  const isMetal = investment.type === 'gold' || investment.type === 'silver';
  const quantityLabel = quantityMetricLabel(investment, labels);
  const quantityValue = isMetal && metrics.quantity !== null
    ? `${formatPreciseNumber(metrics.quantity)} g`
    : metrics.quantity !== null
      ? formatPreciseNumber(metrics.quantity)
      : labels.unavailable || '-';
  const metalPieceCount = Number(investment.quantity);
  const hasAccountValue = accountValue !== null && Number.isFinite(accountValue);
  const showConvertedLine = hasAccountValue
    && nativeCurrency
    && investment.userCurrency
    && nativeCurrency !== investment.userCurrency;
  const gainState = metrics.profitLossAmount === null
    ? 'neutral'
    : metrics.profitLossAmount > 0
      ? 'gain'
      : metrics.profitLossAmount < 0
        ? 'loss'
        : 'neutral';
  const priceStatus = priceRefreshStatus?.state === 'guest_restricted'
    ? labels.guestPriceRefreshRestricted || 'Automatic refresh is paused in guest mode'
    : priceRefreshStatus?.state === 'offline'
      ? 'Offline'
      : priceRefreshStatus?.state === 'failed'
        ? labels.priceUpdateFailed || 'Could not refresh price'
    : refreshing
      ? labels.refreshingPrice || 'Refreshing'
      : metrics.isMarketLinked && metrics.currentPrice === null
        ? labels.currentPriceUnavailable || labels.unavailable || 'Current price unavailable'
        : labels.priceUpdated || 'Price available';
  const StatusIcon = priceRefreshStatus?.state === 'failed' || priceRefreshStatus?.state === 'guest_restricted' || priceRefreshStatus?.state === 'offline'
    ? AlertTriangle
    : metrics.isMarketLinked && metrics.currentPrice === null
      ? AlertTriangle
      : CheckCircle2;
  const historySymbol = investment.providerSymbol || metrics.linkedSymbol || investment.symbol;
  const historyKey = historySymbol
    ? [historySymbol, investment.assetType || investment.type, '1M'].join(':')
    : null;

  useEffect(() => {
    if (!isExpanded) return;
    if (!historyKey || !historySymbol || !metrics.isMarketLinked) {
      setHistoryState({ status: 'unavailable', points: [] });
      return;
    }

    const cached = investmentHistoryCache.get(historyKey);
    if (cached) {
      setHistoryState(cached);
      return;
    }

    const controller = new AbortController();
    setHistoryState({ status: 'loading', points: [] });
    const params = new URLSearchParams({
      symbol: metrics.linkedSymbol || investment.symbol || historySymbol,
      providerSymbol: historySymbol,
      assetType: investment.assetType || investment.type,
      range: '1M',
    });
    void fetch(`/api/market/history?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(response => response.ok ? response.json() : null)
      .then((payload: { points?: Array<{ time?: unknown; close?: unknown }> } | null) => {
        if (controller.signal.aborted) return;
        const points = normalizeRollingHistoryPoints(payload?.points ?? []);
        const next: InvestmentHistoryState = points.length >= 2
          ? { status: 'ready', points }
          : { status: 'unavailable', points: [] };
        investmentHistoryCache.set(historyKey, next);
        setHistoryState(next);
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        const next: InvestmentHistoryState = { status: 'unavailable', points: [] };
        investmentHistoryCache.set(historyKey, next);
        setHistoryState(next);
      });

    return () => controller.abort();
  }, [historyKey, historySymbol, investment.assetType, investment.symbol, investment.type, isExpanded, metrics.isMarketLinked, metrics.linkedSymbol]);

  return (
    <article className={`invest-row invest-holding-card invest-holding-card--${gainState}${isExpanded ? ' is-expanded' : ''}`} aria-labelledby={cardTitleId}>
      <header className="invest-holding-head">
        <div className="invest-holding-identity">
          <span className="invest-asset-lens">
            <AssetAvatar
              symbol={metrics.linkedSymbol || investment.symbol}
              name={investment.name}
              assetType={investment.assetType || investment.type}
              exchange={investment.market}
              market={investment.market}
              size="lg"
              decorative
            />
          </span>
          <div className="invest-holding-copy">
            <div className="invest-holding-title-line">
              <h3 id={cardTitleId} title={investment.name}>{investment.name}</h3>
            </div>
            {(metrics.linkedSymbol || investment.market) && <div className="invest-asset-meta">
              {metrics.linkedSymbol && <span className="invest-ticker" dir="ltr">{metrics.linkedSymbol}</span>}
              {investment.market && <span>{investment.market}</span>}
            </div>}
            {investment.purchasePlatformName && (
              <PlatformIdentity name={investment.purchasePlatformName} logoUrl={platformLogoUrl} title={labels.purchasePlatformBadgeTitle} />
            )}
            <div className="invest-holding-badges">
              <span className="invest-badge-soft">{typeLabel(investment.type)}</span>
              <span className={`invest-risk-badge invest-risk-badge--${investment.riskLevel}`}>{riskLabel(investment.riskLevel)} {labels.riskShort || labels.risk}</span>
              {portfolioPercent !== null && (
                <span className="invest-weight-badge" dir="ltr">
                  {labels.ofPortfolio.replace('{pct}', formatPercent(portfolioPercent))}
                </span>
              )}
              <span className="invest-status-pill"><span aria-hidden="true" />{labels.activeStatus || labels.priceUpdated}</span>
            </div>
          </div>
        </div>

        <div className="invest-row-actions invest-holding-actions">
          <button type="button" className="invest-card-action invest-card-action--primary" onClick={() => onDetails(investment)} aria-label={labels.details}>
            <Eye size={16} aria-hidden="true" />
            <span>{labels.details}</span>
          </button>
          <button id={expansionButtonId} type="button" className="invest-card-action invest-expand-btn" onClick={() => setIsExpanded(value => !value)} aria-expanded={isExpanded} aria-controls={expansionId} aria-label={isExpanded ? labels.collapseDetails : labels.expandDetails}>
            {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            <span>{isExpanded ? labels.collapseDetails : labels.expandDetails}</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="invest-card-action invest-card-overflow" aria-label={labels.moreActions || 'More actions'}>
                <MoreHorizontal size={18} aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="invest-card-menu" align="end" sideOffset={6} collisionPadding={8}>
              {metrics.linkedSymbol && onRefreshPrice ? (
                <DropdownMenuItem disabled={refreshing} onSelect={() => onRefreshPrice(investment)}>
                  <RefreshCw className={refreshing ? 'invest-spin' : undefined} aria-hidden="true" />
                  <span>{refreshing ? labels.refreshingPrice : labels.refreshPrice}</span>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => onEdit(investment)}>
                <Edit3 aria-hidden="true" />
                <span>{labels.edit}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="invest-card-menu-danger" onSelect={() => onDelete(investment)}>
                <Trash2 aria-hidden="true" />
                <span>{labels.delete}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="invest-holding-overview">
        <div className="invest-holding-summary">
          <Metric
            label={labels.currentValue || labels.currentMarketValue || 'Current value'}
            value={metrics.currentValue !== null ? formatNativeMoney(metrics.currentValue, nativeCurrency, investment) : labels.unavailable || '-'}
            tone={metrics.currentValue === null ? 'warning' : 'default'}
            icon={<WalletCards size={15} />}
          />
          <Metric
            label={labels.investedValue || labels.totalInvested || 'Invested'}
            value={metrics.totalInvested !== null ? formatNativeMoney(metrics.totalInvested, nativeCurrency, investment) : labels.purchasePriceMissing || labels.unavailable || '-'}
            tone={metrics.totalInvested === null ? 'warning' : 'default'}
            icon={<Banknote size={15} />}
          />
          <Metric
            label={labels.profitLoss || 'Profit / loss'}
            value={metrics.profitLossAmount !== null ? `${metrics.profitLossAmount > 0 ? '+' : ''}${formatNativeMoney(metrics.profitLossAmount, nativeCurrency, investment)}` : profitUnavailableText(metrics, labels)}
            meta={metrics.profitLossPercent !== null ? `${formatSignedNumber(metrics.profitLossPercent)}%` : undefined}
            tone={gainState}
            icon={gainState === 'gain' ? <TrendingUp size={15} /> : gainState === 'loss' ? <TrendingDown size={15} /> : <Minus size={15} />}
          />
        </div>
      </div>

      {isExpanded ? (
        <div id={expansionId} className="invest-expanded-region" role="region" aria-labelledby={expansionButtonId}>
          <div className="invest-expanded-inner">
            <section className="invest-expanded-section invest-expanded-section--overview">
              <ExpandedTitle icon={<FolderOpen size={16} />} title={labels.overview || 'Overview'} />
              <div className="invest-holding-secondary invest-financial-details">
                <DetailChip label={labels.currentPrice || 'Current price'} value={metrics.currentPrice === null ? (labels.currentPriceUnavailable || labels.unavailable || '-') : formatNativeMoney(metrics.currentPrice, nativeCurrency, investment, { unitPrice: true })} />
                <DetailChip label={labels.purchasePrice || 'Purchase price'} value={metrics.purchasePrice === null ? (labels.unavailable || '-') : formatNativeMoney(metrics.purchasePrice, nativeCurrency, investment, { unitPrice: true })} />
                <DetailChip label={quantityLabel} value={quantityValue} />
                {isMetal && Number.isFinite(metalPieceCount) && metalPieceCount > 0 && <DetailChip label={labels.metalCount || 'Pieces'} value={formatPreciseNumber(metalPieceCount)} />}
                <DetailChip label={labels.monthly} value={formatMoney(investment.monthlyContribution, investment.monthlyContributionStatus)} />
                <DetailChip label={labels.expectedReturn} value={investment.expectedAnnualReturn === undefined ? (labels.unavailable || '-') : `${formatNumber(investment.expectedAnnualReturn)}%`} />
                {investment.market && <DetailChip label={labels.market || 'Market'} value={investment.market} />}
                <DetailChip label={labels.currency || 'Currency'} value={nativeCurrency || labels.unavailable || '-'} />
                <DetailChip label={labels.startDate || 'Entry date'} value={formatDateOnly(investment.startDate) || labels.unavailable || '-'} />
                {showConvertedLine && <DetailChip label={labels.approxUserCurrency || 'Approx.'} value={formatMoney(accountValue, 'valid')} />}
              </div>
            </section>
            <section className="invest-expanded-section invest-expanded-section--history">
              <ExpandedTitle icon={<BarChart3 size={16} />} title={labels.priceHistory || 'Price history'} />
              {historyState.status === 'ready' ? (
                <InvestmentSparkline points={historyState.points} label={labels.period30Days || '30D'} />
              ) : (
                <p className="invest-history-state" role="status">
                  {historyState.status === 'loading'
                    ? labels.historyLoading || 'Loading historical prices'
                    : labels.historyUnavailable || labels.noData || 'Historical prices unavailable'}
                </p>
              )}
            </section>
            <section className="invest-expanded-section">
              <ExpandedTitle icon={<PieChart size={16} />} title={labels.allocation || 'Allocation'} />
              <strong className="invest-expanded-value">{portfolioPercent === null ? (labels.unavailable || '-') : `${formatPercent(portfolioPercent)}%`}</strong>
              <progress className="invest-allocation-track" max="100" value={Math.min(Math.max(portfolioPercent ?? 0, 0), 100)} aria-label={labels.allocation || 'Allocation'} />
            </section>
            <section className="invest-expanded-section">
              <ExpandedTitle icon={<TrendingUp size={16} />} title={labels.performance || 'Performance'} />
              <strong className={`invest-expanded-value invest-tone-${gainState}`}>{metrics.profitLossPercent === null ? profitUnavailableText(metrics, labels) : `${formatSignedNumber(metrics.profitLossPercent)}%`}</strong>
            </section>
            {investment.notes ? (
              <section className="invest-expanded-section invest-expanded-section--wide">
                <ExpandedTitle icon={<NotebookText size={16} />} title={labels.notes || 'Notes'} />
                <p>{investment.notes}</p>
              </section>
            ) : null}
            {(investment.priceSource || investment.dataSource || investment.valuationSource) ? (
              <section className="invest-expanded-section">
                <ExpandedTitle icon={<FolderOpen size={16} />} title={labels.dataSource || 'Data source'} />
                <p>{investment.priceSource || investment.dataSource || investment.valuationSource}</p>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      <footer className="invest-holding-footer">
        <div className="invest-price-status">
          <StatusIcon size={15} aria-hidden="true" />
          <span>{labels.priceStatus || 'Price status'}: {priceStatus}</span>
        </div>
        <span className="invest-last-updated">
          {labels.lastUpdated || 'Last updated'}: <b dir="ltr">{formatDate(investment.lastPriceUpdatedAt || investment.valuationLastUpdatedAt || priceRefreshStatus?.at) || labels.unavailable || '-'}</b>
        </span>
      </footer>
    </article>
  );
});

function quantityMetricLabel(investment: Investment, labels: InvestmentCardLabels) {
  if (investment.type === 'gold' || investment.type === 'silver') return labels.metalWeight || 'Weight in grams';
  if (investment.type === 'fund') return labels.numberOfUnits || labels.quantity || 'Units';
  if (investment.type === 'crypto') return labels.assetQuantity || labels.quantity || 'Quantity';
  return labels.quantity || 'Quantity';
}

function Metric({ label, value, meta, tone = 'default', icon }: { label: string; value: string; meta?: string; tone?: 'default' | 'gain' | 'loss' | 'neutral' | 'warning'; icon?: ReactNode }) {
  return (
    <div className={`invest-holding-metric invest-holding-metric--${tone}`}>
      <span className="invest-metric-label">{icon}{label}</span>
      <strong dir="ltr">{value}</strong>
      {meta && <em dir="ltr">{meta}</em>}
    </div>
  );
}

function DetailChip({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'gain' | 'loss' | 'neutral' }) {
  return <span className={`invest-detail-chip invest-detail-chip--${tone}`}><b>{label}</b><em dir="auto">{value}</em></span>;
}

function ExpandedTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <h4>{icon}<span>{title}</span></h4>;
}

function profitUnavailableText(metrics: ReturnType<typeof calculateInvestmentHoldingMetrics>, labels: InvestmentCardLabels) {
  if (metrics.totalInvested === null) return labels.purchasePriceMissing || labels.unavailable || '-';
  if (metrics.currentPrice === null && metrics.isMarketLinked) return labels.currentPriceUnavailable || labels.unavailable || '-';
  if (metrics.currentValue === null) return labels.currentPriceUnavailable || labels.unavailable || '-';
  return labels.unavailable || '-';
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatSignedNumber(value: number) {
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

function formatPercent(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function formatPreciseNumber(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: value > 0 && value < 1 ? 10 : 4 });
}

function formatDate(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatDateOnly(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
