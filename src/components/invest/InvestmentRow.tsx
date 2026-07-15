'use client';

import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit3,
  Eye,
  FileText,
  FolderOpen,
  Minus,
  NotebookText,
  Paperclip,
  PieChart,
  RefreshCw,
  ScrollText,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { memo, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AssetAvatar } from '@/components/asset/AssetAvatar';
import { calculateInvestmentHoldingMetrics, investmentNativeCurrency } from '@/lib/investmentCalculations';
import type { Investment } from '@/types/investment';
import { InvestmentSparkline } from './InvestmentSparkline';
import { PlatformIdentity } from './PlatformIdentity';

export type InvestmentPriceRefreshStatus = {
  state: 'failed' | 'updated';
  message?: string;
  at: string;
};

export type InvestmentCardLabels = {
  details: string;
  expandDetails?: string;
  collapseDetails?: string;
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
};

interface Props {
  investment: Investment;
  accountValue: number | null;
  portfolioPercent: number | null;
  labels: InvestmentCardLabels;
  typeLabel: (type: Investment['type']) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
  formatNativeMoney: (amount: number | null | undefined, currency?: string | null, item?: Investment | null) => string;
  onDetails: (item: Investment) => void;
  onEdit: (item: Investment) => void;
  onDelete: (item: Investment) => void;
  onRefreshPrice?: (item: Investment) => void;
  refreshing?: boolean;
  priceRefreshStatus?: InvestmentPriceRefreshStatus;
  platformLogoUrl?: string | null;
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
  const expansionId = useId();
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
  const priceStatus = priceRefreshStatus?.state === 'failed'
    ? labels.priceUpdateFailed || 'Could not refresh price'
    : refreshing
      ? labels.refreshingPrice || 'Refreshing'
      : metrics.isMarketLinked && metrics.currentPrice === null
        ? labels.currentPriceUnavailable || labels.unavailable || 'Current price unavailable'
        : labels.priceUpdated || 'Price available';
  const StatusIcon = priceRefreshStatus?.state === 'failed'
    ? AlertTriangle
    : metrics.isMarketLinked && metrics.currentPrice === null
      ? AlertTriangle
      : CheckCircle2;
  const sparklineStart = metrics.purchasePrice ?? metrics.totalInvested;
  const sparklineEnd = metrics.currentPrice ?? metrics.currentValue;
  const hasSparkline = sparklineStart !== null && sparklineEnd !== null && sparklineStart > 0;

  return (
    <article className={`invest-row invest-holding-card invest-holding-card--${gainState}${isExpanded ? ' is-expanded' : ''}`}>
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
              <h3>{investment.name}</h3>
              <span className="invest-status-pill"><span aria-hidden="true" />{labels.activeStatus || labels.priceUpdated}</span>
            </div>
            {(metrics.linkedSymbol || investment.market) && <div className="invest-asset-meta">
              {metrics.linkedSymbol && <span className="invest-ticker" dir="ltr">{metrics.linkedSymbol}</span>}
              {investment.market && <span>{investment.market}</span>}
            </div>}
            <div className="invest-holding-badges">
              <span className="invest-badge-soft">{typeLabel(investment.type)}</span>
              <span className={`invest-risk-badge invest-risk-badge--${investment.riskLevel}`}>{riskLabel(investment.riskLevel)} {labels.riskShort || labels.risk}</span>
              {portfolioPercent !== null && (
                <span className="invest-weight-badge">
                  {labels.ofPortfolio.replace('{pct}', formatPercent(portfolioPercent))}
                </span>
              )}
            </div>
            {investment.purchasePlatformName && (
              <PlatformIdentity name={investment.purchasePlatformName} logoUrl={platformLogoUrl} title={labels.purchasePlatformBadgeTitle} />
            )}
          </div>
        </div>

        <div className="invest-row-actions invest-holding-actions">
          <button type="button" className="invest-card-action invest-card-action--primary" onClick={() => onDetails(investment)} aria-label={labels.details}>
            <Eye size={16} aria-hidden="true" />
            <span>{labels.details}</span>
          </button>
          <button type="button" className="invest-card-action" onClick={() => onEdit(investment)} aria-label={labels.edit}>
            <Edit3 size={16} aria-hidden="true" />
            <span>{labels.edit}</span>
          </button>
          <button type="button" className="invest-card-action invest-card-action--danger" onClick={() => onDelete(investment)} aria-label={labels.delete}>
            <Trash2 size={16} aria-hidden="true" />
            <span>{labels.delete}</span>
          </button>
          <button id={expansionButtonId} type="button" className="invest-card-action invest-expand-btn" onClick={() => setIsExpanded(value => !value)} aria-expanded={isExpanded} aria-controls={expansionId} aria-label={isExpanded ? labels.collapseDetails : labels.expandDetails}>
            {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            <span>{isExpanded ? labels.collapseDetails : labels.expandDetails}</span>
          </button>
        </div>
      </header>

      <div className="invest-holding-overview">
        <div className="invest-holding-summary">
          <Metric
            label={metrics.purchasePrice !== null ? (labels.purchasePrice || 'Purchase price') : (labels.totalInvested || 'Total invested')}
            value={metrics.purchasePrice !== null
              ? formatNativeMoney(metrics.purchasePrice, nativeCurrency, investment)
              : metrics.totalInvested !== null
                ? formatNativeMoney(metrics.totalInvested, nativeCurrency, investment)
                : labels.purchasePriceMissing || '-'}
            tone={metrics.purchasePrice === null && metrics.totalInvested === null ? 'warning' : 'default'}
            icon={<WalletCards size={15} />}
          />
          <Metric
            label={metrics.currentPrice !== null ? (labels.currentPrice || 'Current price') : (labels.currentMarketValue || 'Holding value')}
            value={metrics.currentPrice !== null
              ? formatNativeMoney(metrics.currentPrice, nativeCurrency, investment)
              : metrics.currentValue !== null
                ? formatNativeMoney(metrics.currentValue, nativeCurrency, investment)
                : labels.currentPriceUnavailable || labels.unavailable || '-'}
            tone={metrics.currentPrice === null && metrics.currentValue === null && metrics.isMarketLinked ? 'warning' : 'default'}
            icon={<BarChart3 size={15} />}
          />
          <Metric
            label={labels.profitLoss || 'Profit / loss'}
            value={metrics.profitLossAmount !== null ? `${metrics.profitLossAmount > 0 ? '+' : ''}${formatNativeMoney(metrics.profitLossAmount, nativeCurrency, investment)}` : profitUnavailableText(metrics, labels)}
            meta={metrics.profitLossPercent !== null ? `${formatSignedNumber(metrics.profitLossPercent)}%` : undefined}
            tone={gainState}
            icon={gainState === 'gain' ? <TrendingUp size={15} /> : gainState === 'loss' ? <TrendingDown size={15} /> : <Minus size={15} />}
          />
          <Metric
            label={labels.currentMarketValue || 'Holding value'}
            value={metrics.currentValue !== null ? formatNativeMoney(metrics.currentValue, nativeCurrency, investment) : labels.unavailable || '-'}
            icon={<PieChart size={15} />}
          />
        </div>
        {hasSparkline && (
          <InvestmentSparkline start={sparklineStart} end={sparklineEnd} label={labels.lifetime || 'Lifetime'} gain={sparklineEnd >= sparklineStart} />
        )}
      </div>

      <div id={expansionId} className="invest-expanded-region" role="region" aria-labelledby={expansionButtonId} aria-hidden={!isExpanded}>
        <div className="invest-expanded-inner">
          <section className="invest-expanded-section invest-expanded-section--overview">
            <ExpandedTitle icon={<Building2 size={16} />} title={labels.overview || 'Overview'} />
            <div className="invest-holding-secondary">
              <DetailChip label={quantityLabel} value={quantityValue} />
              <DetailChip label={labels.monthly} value={formatMoney(investment.monthlyContribution, investment.monthlyContributionStatus)} />
              <DetailChip label={labels.expectedReturn} value={investment.expectedAnnualReturn === undefined ? '-' : `${formatNumber(investment.expectedAnnualReturn)}%`} />
              {investment.market && <DetailChip label={labels.market || 'Market'} value={investment.market} />}
              <DetailChip label={labels.currency || 'Currency'} value={nativeCurrency || labels.unavailable || '-'} />
              {isMetal && Number.isFinite(metalPieceCount) && metalPieceCount > 0 && <DetailChip label={labels.metalCount || 'Pieces'} value={formatPreciseNumber(metalPieceCount)} />}
              <DetailChip label={labels.startDate || 'Entry date'} value={formatDateOnly(investment.startDate) || labels.unavailable || '-'} />
              {showConvertedLine && <DetailChip label={labels.approxUserCurrency || 'Approx.'} value={formatMoney(accountValue, 'valid')} />}
            </div>
          </section>
          <section className="invest-expanded-section">
            <ExpandedTitle icon={<Sparkles size={16} />} title={labels.aiSummary || 'AI summary'} />
            <p>{labels.noData || '-'}</p>
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
          <section className="invest-expanded-section">
            <ExpandedTitle icon={<ScrollText size={16} />} title={labels.dividends || 'Dividends'} />
            <p>{labels.noData || '-'}</p>
          </section>
          <section className="invest-expanded-section invest-expanded-section--wide">
            <ExpandedTitle icon={<NotebookText size={16} />} title={labels.notes || 'Notes'} />
            <p>{investment.notes || labels.noData || '-'}</p>
          </section>
          <section className="invest-expanded-section">
            <ExpandedTitle icon={<Paperclip size={16} />} title={labels.attachments || 'Attachments'} />
            <p>{labels.noData || '-'}</p>
          </section>
          <section className="invest-expanded-section">
            <ExpandedTitle icon={<Building2 size={16} />} title={labels.brokerNotes || 'Broker notes'} />
            <p>{investment.purchasePlatformName || labels.purchasePlatformNotSpecified || labels.noData || '-'}</p>
          </section>
          <section className="invest-expanded-section">
            <ExpandedTitle icon={<Clock3 size={16} />} title={labels.transactions || 'Transactions'} />
            <p>{formatDateOnly(investment.startDate) || labels.noData || '-'}</p>
          </section>
          <section className="invest-expanded-section">
            <ExpandedTitle icon={<BarChart3 size={16} />} title={labels.priceHistory || 'Price history'} />
            {hasSparkline ? <InvestmentSparkline start={sparklineStart} end={sparklineEnd} label={labels.lifetime || 'Lifetime'} gain={sparklineEnd >= sparklineStart} /> : <p>{labels.noData || '-'}</p>}
          </section>
          <section className="invest-expanded-section">
            <ExpandedTitle icon={<FileText size={16} />} title={labels.documents || 'Documents'} />
            <p>{labels.noData || '-'}</p>
          </section>
          <section className="invest-expanded-section">
            <ExpandedTitle icon={<FolderOpen size={16} />} title={labels.dataSource || 'Data source'} />
            <p>{investment.priceSource || investment.dataSource || investment.valuationSource || labels.noData || '-'}</p>
          </section>
        </div>
      </div>

      <footer className="invest-holding-footer">
        <div className="invest-price-status">
          <StatusIcon size={15} aria-hidden="true" />
          <span>{labels.priceStatus || 'Price status'}: {priceStatus}</span>
        </div>
        <span className="invest-last-updated">
          {labels.lastUpdated || 'Last updated'}: <b dir="ltr">{formatDate(investment.lastPriceUpdatedAt || investment.valuationLastUpdatedAt || priceRefreshStatus?.at) || labels.unavailable || '-'}</b>
        </span>
        {metrics.linkedSymbol && onRefreshPrice && (
          <button type="button" className="invest-refresh-inline" onClick={() => onRefreshPrice(investment)} aria-label={labels.refreshPrice} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'invest-spin' : undefined} aria-hidden="true" />
            <span>{refreshing ? labels.refreshingPrice : labels.refreshPrice}</span>
          </button>
        )}
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

function DetailChip({ label, value }: { label: string; value: string }) {
  return <span className="invest-detail-chip"><b>{label}</b><em dir="auto">{value}</em></span>;
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
