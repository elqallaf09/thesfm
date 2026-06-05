'use client';

import { Edit3, Eye, RefreshCw, Trash2 } from 'lucide-react';
import type { Investment } from '@/types/investment';

interface Props {
  investment: Investment;
  accountValue: number | null;
  portfolioPercent: number | null;
  labels: {
    details: string;
    edit: string;
    delete: string;
    monthly: string;
    risk: string;
    expectedReturn: string;
    ofPortfolio: string;
    refreshPrice?: string;
    refreshingPrice?: string;
    lastPrice?: string;
    quantity?: string;
    currentMarketValue?: string;
    lastUpdated?: string;
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
}: Props) {
  const linkedSymbol = investment.providerSymbol || investment.symbol;
  const isMetal = investment.type === 'gold' || investment.type === 'silver';
  const nativeCurrency = investment.nativeCurrency || investment.priceCurrency || investment.currency;
  const nativeValue = typeof investment.nativeMarketValue === 'number'
    ? investment.nativeMarketValue
    : typeof investment.currentMarketValue === 'number'
      ? investment.currentMarketValue
      : undefined;
  const hasNativeValue = nativeValue !== undefined && Number.isFinite(nativeValue);
  const hasConvertedValue = accountValue !== null && Number.isFinite(accountValue);
  const accountValueStatus: Investment['displayValueStatus'] = hasConvertedValue ? 'valid' : 'missing';
  const userCurrency = investment.userCurrency;
  const showConvertedLine = hasConvertedValue && nativeCurrency && userCurrency && nativeCurrency !== userCurrency;
  const notCalculable = labels.ofPortfolio.includes('portfolio')
    ? 'Not calculable'
    : labels.ofPortfolio.includes('portefeuille')
      ? 'Non calculable'
      : 'غير قابل للحساب';

  return (
    <article className="invest-row">
      <div className="invest-row-main">
        <div>
          <h3>{investment.name}</h3>
          <p>{typeLabel(investment.type)} · {labels.risk}: {riskLabel(investment.riskLevel)}</p>
        </div>
        <strong className="invest-asset-value">{formatMoney(accountValue, accountValueStatus)}</strong>
      </div>

      <div className="invest-row-meta">
        {linkedSymbol && <span dir="ltr">{linkedSymbol}</span>}
        {investment.type === 'project' && investment.projectId && <span>{investment.projectName || investment.name}</span>}
        {investment.market && <span>{investment.market}</span>}
        {isMetal && investment.metalProductType && (
          <span>{metalProductLabel(investment.metalProductType)}{investment.metalKarat ? ` · ${investment.metalKarat}K` : ''}</span>
        )}
        {isMetal && typeof investment.grams === 'number' && (
          <span>الوزن: <b dir="ltr">{formatPreciseNumber(investment.grams)} g</b></span>
        )}
        {isMetal && typeof investment.pureMetalGrams === 'number' && (
          <span>الصافي: <b dir="ltr">{formatPreciseNumber(investment.pureMetalGrams)} g</b></span>
        )}
        {investment.type === 'silver' && typeof investment.metalPurity === 'number' && (
          <span>النقاء: <b dir="ltr">{formatPreciseNumber(investment.metalPurity)}</b></span>
        )}
        {typeof investment.lastPrice === 'number' && nativeCurrency && (
          <span>{labels.lastPrice}: <b dir="ltr">{formatNativeMoney(investment.lastPrice, nativeCurrency, investment)}</b></span>
        )}
        {typeof investment.quantity === 'number' && (
          <span>{labels.quantity || 'Quantity'}: <b dir="ltr">{formatPreciseNumber(investment.quantity)}</b></span>
        )}
        {linkedSymbol && (
          <span>{labels.currentMarketValue || 'Current market value'}: <b>{formatMoney(accountValue, accountValueStatus)}</b></span>
        )}
        {hasNativeValue && nativeCurrency && (
          <span>القيمة الأصلية: <b dir="ltr">{formatNativeMoney(nativeValue, nativeCurrency, null)}</b></span>
        )}
        {showConvertedLine && (
          <span>القيمة بعملة الحساب: <b>{formatMoney(accountValue, 'valid')}</b></span>
        )}
        {investment.fxRateToUserCurrency && nativeCurrency && userCurrency && nativeCurrency !== userCurrency && (
          <span dir="ltr">FX {nativeCurrency}/{userCurrency}: <b>{formatNumber(investment.fxRateToUserCurrency)}</b></span>
        )}
        {investment.fxSource && investment.fxSource !== 'same_currency' && (
          <span>{investment.fxSource === 'manual' ? 'قيمة يدوية' : 'سعر صرف حقيقي'}</span>
        )}
        {investment.lastPriceUpdatedAt && (
          <span>{labels.lastUpdated || 'Last updated'}: <b dir="ltr">{formatDate(investment.lastPriceUpdatedAt)}</b></span>
        )}
        <span>{labels.monthly}: {formatMoney(investment.monthlyContribution, investment.monthlyContributionStatus)}</span>
        <span>{labels.expectedReturn}: {investment.expectedAnnualReturn === undefined ? '-' : `${investment.expectedAnnualReturn}%`}</span>
        <span>{portfolioPercent === null ? notCalculable : labels.ofPortfolio.replace('{pct}', portfolioPercent.toFixed(0))}</span>
      </div>

      <div className="invest-row-actions">
        <button type="button" onClick={() => onDetails(investment)} aria-label={labels.details} title={labels.details}>
          <Eye size={15} />
          <span>{labels.details}</span>
        </button>
        <button type="button" onClick={() => onEdit(investment)} aria-label={labels.edit} title={labels.edit}>
          <Edit3 size={15} />
          <span>{labels.edit}</span>
        </button>
        {linkedSymbol && onRefreshPrice && (
          <button type="button" onClick={() => onRefreshPrice(investment)} aria-label={labels.refreshPrice} title={labels.refreshPrice} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'invest-spin' : undefined} />
            <span>{refreshing ? labels.refreshingPrice : labels.refreshPrice}</span>
          </button>
        )}
        <button type="button" className="danger" onClick={() => onDelete(investment)} aria-label={labels.delete} title={labels.delete}>
          <Trash2 size={15} />
          <span>{labels.delete}</span>
        </button>
      </div>
    </article>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatPreciseNumber(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: value > 0 && value < 1 ? 10 : 4,
  });
}

function metalProductLabel(value: string) {
  const labels: Record<string, string> = {
    bar: 'سبيكة',
    lira: 'ليرة',
    half_lira: 'نصف ليرة',
    quarter_lira: 'ربع ليرة',
    makhmus: 'مخمس',
    half_makhmus: 'نصف مخمس',
    ten_tola: '10 توله',
    ounce: 'أونصة',
    kilo: 'كيلو',
    custom_grams: 'وزن مخصص',
  };
  return labels[value] || value;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
