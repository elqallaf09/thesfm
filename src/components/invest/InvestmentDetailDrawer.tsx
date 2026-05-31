'use client';

import { X, TrendingUp } from 'lucide-react';
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
  };
  typeLabel: (type: Investment['type']) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
  onClose: () => void;
}

export function InvestmentDetailDrawer({
  open,
  investment,
  labels,
  typeLabel,
  riskLabel,
  formatMoney,
  onClose,
}: Props) {
  if (!open || !investment) return null;

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

        <div className="invest-detail-grid">
          <Info label={labels.type} value={typeLabel(investment.type)} />
          <Info label={labels.currentValue} value={formatMoney(investment.displayValue, investment.displayValueStatus)} />
          <Info label={labels.monthly} value={formatMoney(investment.monthlyContribution, investment.monthlyContributionStatus)} />
          <Info label={labels.startDate} value={investment.startDate} />
          <Info label={labels.risk} value={riskLabel(investment.riskLevel)} />
          <Info label={labels.expectedReturn} value={investment.expectedAnnualReturn === undefined ? '—' : `${investment.expectedAnnualReturn}%`} />
        </div>

        <div className="invest-notes-box">
          <strong>{labels.notes}</strong>
          <p>{investment.notes || '—'}</p>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
