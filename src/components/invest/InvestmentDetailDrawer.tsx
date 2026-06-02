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
    dataSource?: string;
    lastUpdated?: string;
    refreshPrice?: string;
    refreshingPrice?: string;
    unavailable?: string;
  };
  typeLabel: (type: Investment['type']) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
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
  onClose,
  onRefreshPrice,
  refreshing = false,
}: Props) {
  if (!open || !investment) return null;

  const linkedSymbol = investment.providerSymbol || investment.symbol;
  const unavailable = labels.unavailable || '-';

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
          <Info label={labels.currentValue} value={formatMoney(investment.displayValue, investment.displayValueStatus)} />
          <Info label={labels.monthly} value={formatMoney(investment.monthlyContribution, investment.monthlyContributionStatus)} />
          <Info label={labels.startDate} value={investment.startDate} />
          <Info label={labels.risk} value={riskLabel(investment.riskLevel)} />
          <Info label={labels.expectedReturn} value={investment.expectedAnnualReturn === undefined ? '-' : `${investment.expectedAnnualReturn}%`} />
          {linkedSymbol && <Info label={labels.symbol || 'Symbol'} value={linkedSymbol} ltr />}
          {investment.market && <Info label={labels.market || 'Market'} value={investment.market} />}
          {typeof investment.quantity === 'number' && <Info label={labels.quantity || 'Quantity'} value={formatNumber(investment.quantity)} ltr />}
          {typeof investment.lastPrice === 'number' && investment.currency && (
            <Info label={labels.currentPrice || 'Current price'} value={`${investment.currency} ${formatNumber(investment.lastPrice)}`} ltr />
          )}
          {investment.lastPriceUpdatedAt && <Info label={labels.lastUpdated || 'Last updated'} value={formatDate(investment.lastPriceUpdatedAt) || unavailable} ltr />}
          {investment.dataSource && <Info label={labels.dataSource || 'Data source'} value={investment.dataSource} />}
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
