'use client';

import { useMemo, useState } from 'react';
import type { Investment, InvestmentType } from '@/types/investment';
import { InvestmentRow } from './InvestmentRow';

type SortMode = 'valueDesc' | 'valueAsc' | 'monthlyDesc' | 'riskDesc' | 'newest';

interface Props {
  investments: Investment[];
  labels: {
    search: string;
    allTypes: string;
    sortBy: string;
    valueDesc: string;
    valueAsc: string;
    monthlyDesc: string;
    riskDesc: string;
    newest: string;
    details: string;
    edit: string;
    delete: string;
    monthly: string;
    risk: string;
    expectedReturn: string;
    ofPortfolio: string;
  };
  types: InvestmentType[];
  typeLabel: (type: InvestmentType) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
  onDetails: (item: Investment) => void;
  onEdit: (item: Investment) => void;
  onDelete: (item: Investment) => void;
}

export function InvestmentList({
  investments,
  labels,
  types,
  typeLabel,
  riskLabel,
  formatMoney,
  onDetails,
  onEdit,
  onDelete,
}: Props) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | InvestmentType>('all');
  const [sort, setSort] = useState<SortMode>('valueDesc');

  const total = useMemo(() => investments.reduce((sum, item) => sum + item.currentValue, 0), [investments]);
  const filtered = useMemo(() => {
    const riskRank = { low: 0, medium: 1, high: 2 };
    let list = [...investments];

    const term = query.trim().toLowerCase();
    if (term) list = list.filter(item => item.name.toLowerCase().includes(term));
    if (filterType !== 'all') list = list.filter(item => item.type === filterType);

    switch (sort) {
      case 'valueDesc':
        list.sort((a, b) => b.currentValue - a.currentValue);
        break;
      case 'valueAsc':
        list.sort((a, b) => a.currentValue - b.currentValue);
        break;
      case 'monthlyDesc':
        list.sort((a, b) => b.monthlyContribution - a.monthlyContribution);
        break;
      case 'riskDesc':
        list.sort((a, b) => riskRank[b.riskLevel] - riskRank[a.riskLevel]);
        break;
      case 'newest':
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
    }

    return list;
  }, [filterType, investments, query, sort]);

  return (
    <section className="invest-panel">
      <div className="invest-controls">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={labels.search} />
        <select value={filterType} onChange={event => setFilterType(event.target.value as 'all' | InvestmentType)}>
          <option value="all">{labels.allTypes}</option>
          {types.map(type => <option key={type} value={type}>{typeLabel(type)}</option>)}
        </select>
        <select value={sort} onChange={event => setSort(event.target.value as SortMode)} aria-label={labels.sortBy}>
          <option value="valueDesc">{labels.valueDesc}</option>
          <option value="valueAsc">{labels.valueAsc}</option>
          <option value="monthlyDesc">{labels.monthlyDesc}</option>
          <option value="riskDesc">{labels.riskDesc}</option>
          <option value="newest">{labels.newest}</option>
        </select>
      </div>

      <div className="invest-list">
        {filtered.map(item => (
          <InvestmentRow
            key={item.id}
            investment={item}
            portfolioPercent={total > 0 ? (item.currentValue / total) * 100 : null}
            labels={labels}
            typeLabel={typeLabel}
            riskLabel={riskLabel}
            formatMoney={formatMoney}
            onDetails={onDetails}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
