'use client';

import { PieChart, Plus, TrendingUp, WalletCards } from 'lucide-react';
import { memo } from 'react';

interface Props {
  title: string;
  description: string;
  cta: string;
  onCreate: () => void;
}

export const EmptyState = memo(function EmptyState({ title, description, cta, onCreate }: Props) {
  return (
    <div className="invest-empty">
      <div className="invest-empty-illustration" aria-hidden="true">
        <span><WalletCards size={25} /></span>
        <span><TrendingUp size={29} /></span>
        <span><PieChart size={23} /></span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" className="invest-primary-btn" onClick={onCreate}>
        <Plus size={17} aria-hidden="true" />
        {cta}
      </button>
    </div>
  );
});

