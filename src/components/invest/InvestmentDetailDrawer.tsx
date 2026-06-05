'use client';

import { RefreshCw, TrendingUp, X } from 'lucide-react';
import type { Investment } from '@/types/investment';

interface Props {
  open: boolean;
  investment: Investment | null;
  labels: {
    details: string;
    type: string;
    currentValue: string;
    monthly: string;
    startDate: string;
    risk: string;
    expectedReturn: string;
    notes: string;
    close: string;
    symbol?: string;
    market?: string;
    quantity?: string;
    currentPrice?: string;
    currentMarketValue?: string;
    dataSource?: string;
    lastUpdated?: string;
    refreshPrice?: string;
    refreshingPrice?: string;
    unavailable?: string;
  };
  typeLabel: (type: Investment['type']) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
  formatNativeMoney: (amount: number | null | undefined, currency?: string | null, item?: Investment | null) => string;
  accountValue: number | null;
  onClose: () => void;
  onRefreshPrice?: (item: Investment) => void;
  refreshing?: boolean;
}

export function InvestmentDetailDrawer({
  open,
  investment,
  labels,
  typeLabel,
  riskLabel,
  formatMoney,
  formatNativeMoney,
  accountValue,
  onClose,
  onRefreshPrice,
  refreshing = false,
}: Props) {
  if (!open || !investment) return null;

  const linkedSymbol = investment.providerSymbol || investment.symbol;
  const unavailable = labels.unavailable || '-';
  const nativeCurrency = investment.nativeCurrency || investment.priceCurrency || investment.currency;
  const nativeValue = typeof investment.nativeMarketValue === 'number'
    ? investment.nativeMarketValue
    : typeof investment.currentMarketValue === 'number'
      ? investment.currentMarketValue
      : null;
  const accountValueStatus: Investment['displayValueStatus'] = accountValue !== null ? 'valid' : 'missing';

  return (
    <div className="invest-overlay" role="presentation" onMouseDown={onClose}>
      <aside className="invest-drawer" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}>
        <div className="invest-drawer-head">
          <div className="invest-drawer-title">
            <span><TrendingUp size={18} /></span>
            <div>
              <p>{labels.details}</p>
              <h3>{investment.name}</h3>
            </div>
          </div>
          <button type="button" className="invest-icon-btn" onClick={onClose} aria-label={labels.close}>
            <X size={18} />
          </button>
        </div>

        {linkedSymbol && onRefreshPrice && (
          <button type="button" className="invest-refresh-wide" onClick={() => onRefreshPrice(investment)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'invest-spin' : undefined} />
            {refreshing ? labels.refreshingPrice : labels.refreshPrice}
          </button>
        )}

        <div className="invest-detail-grid">
          <Info label={labels.type} value={typeLabel(investment.type)} />
          <Info label={labels.currentMarketValue || labels.currentValue} value={formatMoney(accountValue, accountValueStatus)} />
          {nativeValue !== null && nativeCurrency && <Info label="القيمة الأصلية" value={formatNativeMoney(nativeValue, nativeCurrency, null)} ltr />}
          {accountValue !== null && <Info label="القيمة بعملة الحساب" value={formatMoney(accountValue, 'valid')} />}
          {investment.fxRateToUserCurrency && nativeCurrency && investment.userCurrency && nativeCurrency !== investment.userCurrency && (
            <Info label="سعر الصرف" value={`1 ${nativeCurrency} = ${formatNumber(investment.fxRateToUserCurrency)} ${investment.userCurrency}`} ltr />
          )}
          <Info label={labels.monthly} value={formatMoney(investment.monthlyContribution, investment.monthlyContributionStatus)} />
          <Info label={labels.startDate} value={investment.startDate} />
          <Info label={labels.risk} value={riskLabel(investment.riskLevel)} />
          <Info label={labels.expectedReturn} value={investment.expectedAnnualReturn === undefined ? '-' : `${investment.expectedAnnualReturn}%`} />
          {linkedSymbol && <Info label={labels.symbol || 'Symbol'} value={linkedSymbol} ltr />}
          {investment.market && <Info label={labels.market || 'Market'} value={investment.market} />}
          {investment.type === 'project' && investment.projectId && <Info label="المشروع المرتبط" value={investment.projectName || investment.name} />}
          {typeof investment.quantity === 'number' && <Info label={labels.quantity || 'Quantity'} value={formatPreciseNumber(investment.quantity)} ltr />}
          {(investment.type === 'gold' || investment.type === 'silver') && investment.metalProductType && (
            <Info label="نوع المعدن" value={metalProductLabel(investment.metalProductType)} />
          )}
          {investment.type === 'gold' && typeof investment.metalKarat === 'number' && <Info label="العيار" value={`${investment.metalKarat}K`} ltr />}
          {investment.type === 'silver' && typeof investment.metalPurity === 'number' && <Info label="النقاء" value={formatPreciseNumber(investment.metalPurity)} ltr />}
          {(investment.type === 'gold' || investment.type === 'silver') && typeof investment.grams === 'number' && <Info label="الوزن بالجرام" value={`${formatPreciseNumber(investment.grams)} g`} ltr />}
          {(investment.type === 'gold' || investment.type === 'silver') && typeof investment.pureMetalGrams === 'number' && <Info label="صافي المعدن" value={`${formatPreciseNumber(investment.pureMetalGrams)} g`} ltr />}
          {typeof investment.purchasePrice === 'number' && (
            <Info label="سعر الشراء" value={formatNativeMoney(investment.purchasePrice, nativeCurrency, investment)} ltr />
          )}
          {typeof investment.lastPrice === 'number' && nativeCurrency && (
            <Info label={labels.currentPrice || 'Current price'} value={formatNativeMoney(investment.lastPrice, nativeCurrency, investment)} ltr />
          )}
          {investment.lastPriceUpdatedAt && <Info label={labels.lastUpdated || 'Last updated'} value={formatDate(investment.lastPriceUpdatedAt) || unavailable} ltr />}
          {(investment.priceSource || investment.dataSource) && <Info label={labels.dataSource || 'Data source'} value={investment.priceSource || investment.dataSource || ''} />}
        </div>

        <div className="invest-notes-box">
          <strong>{labels.notes}</strong>
          <p>{investment.notes || '-'}</p>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <span>{label}</span>
      <strong dir={ltr ? 'ltr' : undefined}>{value}</strong>
    </div>
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
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
