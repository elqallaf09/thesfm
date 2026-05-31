'use client';

import { Edit3, Eye, Trash2 } from 'lucide-react';
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
  };
  typeLabel: (type: Investment['type']) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
  onDetails: (item: Investment) => void;
  onEdit: (item: Investment) => void;
  onDelete: (item: Investment) => void;
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
}: Props) {
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
        <strong>{formatMoney(investment.displayValue, investment.displayValueStatus)}</strong>
      </div>

      <div className="invest-row-meta">
        <span>{labels.monthly}: {formatMoney(investment.monthlyContribution, investment.monthlyContributionStatus)}</span>
        <span>{labels.expectedReturn}: {investment.expectedAnnualReturn === undefined ? '—' : `${investment.expectedAnnualReturn}%`}</span>
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
        <button type="button" className="danger" onClick={() => onDelete(investment)} aria-label={labels.delete} title={labels.delete}>
          <Trash2 size={15} />
          <span>{labels.delete}</span>
        </button>
      </div>
    </article>
  );
}
