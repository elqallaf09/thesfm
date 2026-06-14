'use client';

import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Edit3, Eye, Minus, RefreshCw, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Investment } from '@/types/investment';
import { calculateInvestmentHoldingMetrics, investmentNativeCurrency } from '@/lib/investmentCalculations';

export type InvestmentPriceRefreshStatus = {
  state: 'failed' | 'updated';
  message?: string;
  at: string;
};

interface Props {
  investment: Investment;
  accountValue: number | null;
  portfolioPercent: number | null;
  labels: {
    details: string;
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
  };
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
}

export function InvestmentRow({
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
}: Props) {
  const metrics = calculateInvestmentHoldingMetrics(investment);
  const [isExpanded, setIsExpanded] = useState(false);
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

  if (process.env.NODE_ENV === 'development') {
    console.log('[Investments] card props and metrics', {
      id: investment.id,
      name: investment.name,
      type: investment.type,
      symbol: investment.symbol,
      providerSymbol: investment.providerSymbol,
      market: investment.market,
      currency: nativeCurrency,
      quantity: investment.quantity,
      purchasePrice: investment.purchasePrice,
      purchaseTotal: investment.purchaseTotal,
      currentPrice: investment.currentPrice ?? investment.lastPrice,
      currentMarketValue: investment.currentMarketValue ?? investment.nativeMarketValue,
      metrics,
    });
  }

  return (
    <article className={`invest-row invest-holding-card invest-holding-card--${gainState}`}>
      <header className="invest-holding-head">
        <div className="invest-holding-identity">
          <div>
            <h3>{investment.name}</h3>
            <div className="invest-holding-badges">
              {metrics.linkedSymbol && <span className="invest-badge-soft" dir="ltr">{metrics.linkedSymbol}</span>}
              <span className="invest-badge-soft">{typeLabel(investment.type)}</span>
              <span className={`invest-risk-badge invest-risk-badge--${investment.riskLevel}`}>{riskLabel(investment.riskLevel)}</span>
              {portfolioPercent !== null && (
                <span className="invest-weight-badge">
                  {labels.ofPortfolio.replace('{pct}', formatPercent(portfolioPercent))}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="invest-row-actions invest-holding-actions">
          <button type="button" className="invest-expand-btn" onClick={() => setIsExpanded(v => !v)} aria-expanded={isExpanded} aria-label={isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}>
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            <span>{isExpanded ? 'إخفاء' : 'تفاصيل'}</span>
          </button>
          <button type="button" onClick={() => onEdit(investment)} aria-label={labels.edit} title={labels.edit}>
            <Edit3 size={15} />
            <span>{labels.edit}</span>
          </button>
          <button type="button" className="danger" onClick={() => onDelete(investment)} aria-label={labels.delete} title={labels.delete}>
            <Trash2 size={15} />
            <span>{labels.delete}</span>
          </button>
        </div>
      </header>

      {!isExpanded && (
        <div style={{display:'flex',flexWrap:'wrap',gap:'8px',alignItems:'center',minWidth:0}}>
          {metrics.purchasePrice !== null && (
            <span style={{display:'inline-flex',alignItems:'center',gap:'5px',borderRadius:'999px',border:'1px solid rgba(167,243,240,.18)',background:'var(--sfm-light-card)',padding:'5px 10px',fontSize:'12px',fontWeight:900,color:'var(--sfm-muted)'}}>
              {labels.purchasePrice || 'سعر الشراء'}: <b style={{color:'var(--sfm-foreground)',fontWeight:950}} dir="ltr">{formatNativeMoney(metrics.purchasePrice, nativeCurrency, investment)}</b>
            </span>
          )}
          {metrics.purchasePrice === null && metrics.totalInvested !== null && (
            <span style={{display:'inline-flex',alignItems:'center',gap:'5px',borderRadius:'999px',border:'1px solid rgba(167,243,240,.18)',background:'var(--sfm-light-card)',padding:'5px 10px',fontSize:'12px',fontWeight:900,color:'var(--sfm-muted)'}}>
              {labels.totalInvested || 'إجمالي الاستثمار'}: <b style={{color:'var(--sfm-foreground)',fontWeight:950}} dir="ltr">{formatNativeMoney(metrics.totalInvested, nativeCurrency, investment)}</b>
            </span>
          )}
          {metrics.purchasePrice === null && metrics.totalInvested === null && (
            <span style={{display:'inline-flex',alignItems:'center',gap:'5px',borderRadius:'999px',border:'1px solid rgba(245,158,11,.24)',background:'rgba(245,158,11,.08)',padding:'5px 10px',fontSize:'12px',fontWeight:900,color:'#92400E'}}>
              {labels.purchasePriceMissing || 'سعر الشراء غير مكتمل'}
            </span>
          )}
          {metrics.currentPrice !== null && (
            <span style={{display:'inline-flex',alignItems:'center',gap:'5px',borderRadius:'999px',border:'1px solid rgba(167,243,240,.18)',background:'var(--sfm-light-card)',padding:'5px 10px',fontSize:'12px',fontWeight:900,color:'var(--sfm-muted)'}}>
              {labels.currentPrice || 'السعر الحالي'}: <b style={{color:'var(--sfm-foreground)',fontWeight:950}} dir="ltr">{formatNativeMoney(metrics.currentPrice, nativeCurrency, investment)}</b>
            </span>
          )}
          {metrics.profitLossAmount !== null && (
            <span style={{display:'inline-flex',alignItems:'center',gap:'5px',borderRadius:'999px',border: gainState==='gain'?'1px solid rgba(16,185,129,.24)':gainState==='loss'?'1px solid rgba(239,68,68,.24)':'1px solid rgba(167,243,240,.18)',background:gainState==='gain'?'rgba(16,185,129,.08)':gainState==='loss'?'rgba(239,68,68,.07)':'var(--sfm-light-card)',padding:'5px 10px',fontSize:'12px',fontWeight:900,color:gainState==='gain'?'#047857':gainState==='loss'?'#B91C1C':'var(--sfm-muted)'}}>
              {gainState === 'gain' ? '+' : ''}{formatNativeMoney(metrics.profitLossAmount, nativeCurrency, investment)}
              {metrics.profitLossPercent !== null && <em style={{fontStyle:'normal',fontWeight:950}}>{` (${formatSignedNumber(metrics.profitLossPercent)}%)`}</em>}
            </span>
          )}
        </div>
      )}
      {isExpanded && <div className="invest-holding-primary">
        <Metric
          label={metrics.purchasePrice !== null ? (labels.purchasePrice || 'Purchase price') : metrics.totalInvested !== null ? (labels.totalInvested || 'Total invested') : (labels.purchasePrice || 'Purchase price')}
          value={metrics.purchasePrice !== null
            ? formatNativeMoney(metrics.purchasePrice, nativeCurrency, investment)
            : metrics.totalInvested !== null
              ? formatNativeMoney(metrics.totalInvested, nativeCurrency, investment)
              : labels.purchasePriceMissing || '-'}
          tone={metrics.purchasePrice === null && metrics.totalInvested === null ? 'warning' : 'default'}
          ltr={metrics.purchasePrice !== null || metrics.totalInvested !== null}
        />
        <Metric
          label={labels.currentPrice || 'Current price'}
          value={metrics.currentPrice !== null ? formatNativeMoney(metrics.currentPrice, nativeCurrency, investment) : labels.currentPriceUnavailable || labels.unavailable || '-'}
          tone={metrics.currentPrice === null && metrics.isMarketLinked ? 'warning' : 'default'}
          ltr={metrics.currentPrice !== null}
        />
        <Metric
          label={quantityLabel}
          value={quantityValue}
          tone={metrics.quantity === null && metrics.isMarketLinked ? 'warning' : 'default'}
          ltr={metrics.quantity !== null}
        />
        <Metric
          label={labels.totalInvested || 'Total invested'}
          value={metrics.totalInvested !== null ? formatNativeMoney(metrics.totalInvested, nativeCurrency, investment) : labels.purchasePriceMissing || '-'}
          tone={metrics.totalInvested === null ? 'warning' : 'default'}
          ltr={metrics.totalInvested !== null}
        />
        <Metric
          label={labels.currentMarketValue || 'Current value'}
          value={metrics.currentValue !== null ? formatNativeMoney(metrics.currentValue, nativeCurrency, investment) : labels.currentPriceUnavailable || labels.unavailable || '-'}
          tone={metrics.currentValue === null && metrics.isMarketLinked ? 'warning' : 'default'}
          ltr={metrics.currentValue !== null}
        />
        <Metric
          label={labels.profitLoss || 'Profit / loss'}
          value={metrics.profitLossAmount !== null ? formatNativeMoney(metrics.profitLossAmount, nativeCurrency, investment) : profitUnavailableText(metrics, labels)}
          tone={gainState}
          icon={gainState === 'gain' ? <TrendingUp size={15} /> : gainState === 'loss' ? <TrendingDown size={15} /> : <Minus size={15} />}
          ltr={metrics.profitLossAmount !== null}
        />
      </div>}

      {isExpanded && <div className="invest-holding-secondary">
        <DetailChip label={labels.profitLossPercent || 'Profit / loss %'} value={metrics.profitLossPercent !== null ? `${formatSignedNumber(metrics.profitLossPercent)}%` : profitUnavailableText(metrics, labels)} tone={gainState} />
        <DetailChip label={labels.monthly} value={formatMoney(investment.monthlyContribution, investment.monthlyContributionStatus)} />
        <DetailChip label={labels.expectedReturn} value={investment.expectedAnnualReturn === undefined ? '-' : `${formatNumber(investment.expectedAnnualReturn)}%`} />
        {investment.market && <DetailChip label={labels.market || 'Market'} value={investment.market} />}
        <DetailChip label={labels.currency || 'Currency'} value={nativeCurrency || labels.unavailable || '-'} />
        {isMetal && Number.isFinite(metalPieceCount) && metalPieceCount > 0 && (
          <DetailChip label={labels.metalCount || labels.assetQuantity || 'Pieces'} value={formatPreciseNumber(metalPieceCount)} />
        )}
        <DetailChip label={labels.startDate || 'Entry date'} value={formatDateOnly(investment.startDate) || labels.unavailable || '-'} />
        {(investment.priceSource || investment.dataSource || investment.valuationSource) && (
          <DetailChip label={labels.dataSource || 'Data source'} value={investment.priceSource || investment.dataSource || investment.valuationSource || ''} />
        )}
        {showConvertedLine && (
          <DetailChip label={labels.approxUserCurrency || 'Approx.'} value={formatMoney(accountValue, 'valid')} />
        )}
      </div>}

      <footer className="invest-holding-footer">
        <div className="invest-price-status">
          <StatusIcon size={15} />
          <span>{labels.priceStatus || 'Price status'}: {priceStatus}</span>
        </div>
        <span className="invest-last-updated">
          {labels.lastUpdated || 'Last updated'}: <b dir="ltr">{formatDate(investment.lastPriceUpdatedAt || investment.valuationLastUpdatedAt || priceRefreshStatus?.at) || labels.unavailable || '-'}</b>
        </span>
        {metrics.linkedSymbol && onRefreshPrice && (
          <button type="button" className="invest-refresh-inline" onClick={() => onRefreshPrice(investment)} aria-label={labels.refreshPrice} title={labels.refreshPrice} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'invest-spin' : undefined} />
            <span>{refreshing ? labels.refreshingPrice : labels.refreshPrice}</span>
          </button>
        )}
      </footer>
    </article>
  );
}

function quantityMetricLabel(investment: Investment, labels: Props['labels']) {
  if (investment.type === 'gold' || investment.type === 'silver') return labels.metalWeight || 'Weight in grams';
  if (investment.type === 'fund') return labels.numberOfUnits || labels.quantity || 'Units';
  if (investment.type === 'crypto') return labels.assetQuantity || labels.quantity || 'Quantity';
  return labels.quantity || 'Quantity';
}

function Metric({
  label,
  value,
  tone = 'default',
  icon,
  ltr = false,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'gain' | 'loss' | 'neutral' | 'warning';
  icon?: ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className={`invest-holding-metric invest-holding-metric--${tone}`}>
      <span>{label}</span>
      <strong dir={ltr ? 'ltr' : undefined}>{icon}{value}</strong>
    </div>
  );
}

function DetailChip({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'gain' | 'loss' | 'neutral' }) {
  return (
    <span className={`invest-detail-chip invest-detail-chip--${tone}`}>
      <b>{label}</b>
      <em dir="auto">{value}</em>
    </span>
  );
}

function profitUnavailableText(metrics: ReturnType<typeof calculateInvestmentHoldingMetrics>, labels: Props['labels']) {
  if (metrics.totalInvested === null) return labels.purchasePriceMissing || labels.unavailable || '-';
  if (metrics.currentPrice === null && metrics.isMarketLinked) return labels.currentPriceUnavailable || labels.unavailable || '-';
  if (metrics.currentValue === null) return labels.currentPriceUnavailable || labels.unavailable || '-';
  return labels.unavailable || '-';
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatSignedNumber(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value)}`;
}

function formatPercent(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function formatPreciseNumber(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: value > 0 && value < 1 ? 10 : 4,
  });
}

function formatDate(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateOnly(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
