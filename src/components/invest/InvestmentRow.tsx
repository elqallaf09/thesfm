'use client';

import { Edit3, Eye, RefreshCw, Trash2 } from 'lucide-react';
import type { Investment } from '@/types/investment';

interface Props {
  investment: Investment;
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
  };
  typeLabel: (type: Investment['type']) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
  onDetails: (item: Investment) => void;
  onEdit: (item: Investment) => void;
  onDelete: (item: Investment) => void;
  onRefreshPrice?: (item: Investment) => void;
  refreshing?: boolean;
}

export function InvestmentRow({
  investment,
  portfolioPercent,
  labels,
  typeLabel,
  riskLabel,
  formatMoney,
  onDetails,
  onEdit,
  onDelete,
  onRefreshPrice,
  refreshing = false,
}: Props) {
  const linkedSymbol = investment.providerSymbol || investment.symbol;
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
        <strong className="invest-asset-value">{formatMoney(investment.displayValue, investment.displayValueStatus)}</strong>
      </div>

      <div className="invest-row-meta">
        {linkedSymbol && <span dir="ltr">{linkedSymbol}</span>}
        {investment.market && <span>{investment.market}</span>}
        {typeof investment.lastPrice === 'number' && investment.currency && (
          <span>{labels.lastPrice}: <b dir="ltr">{investment.currency} {formatNumber(investment.lastPrice)}</b></span>
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
