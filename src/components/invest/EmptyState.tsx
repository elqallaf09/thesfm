'use client';

import { TrendingUp } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  cta: string;
  onCreate: () => void;
}

export function EmptyState({ title, description, cta, onCreate }: Props) {
  return (
    <div className="invest-empty">
      <div className="invest-empty-icon">
        <TrendingUp size={34} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" className="invest-primary-btn" onClick={onCreate}>
        {cta}
      </button>
    </div>
  );
}

