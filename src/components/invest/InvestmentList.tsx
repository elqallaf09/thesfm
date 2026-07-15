'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Investment, InvestmentType } from '@/types/investment';
import type { InvestmentPlatformDirectoryItem } from '@/types/investmentPlatform';
import { InvestmentRow, type InvestmentCardLabels, type InvestmentPriceRefreshStatus } from './InvestmentRow';

type SortMode = 'valueDesc' | 'valueAsc' | 'monthlyDesc' | 'riskDesc' | 'newest';

type ListLabels = InvestmentCardLabels & {
    search: string;
    allTypes: string;
    sortBy: string;
    valueDesc: string;
    valueAsc: string;
    monthlyDesc: string;
    riskDesc: string;
    newest: string;
    lastPrice?: string;
    refreshAllPrices?: string;
    refreshingPrices?: string;
    allPlatforms?: string;
};

interface Props {
  investments: Investment[];
  labels: ListLabels;
  types: InvestmentType[];
  typeLabel: (type: InvestmentType) => string;
  riskLabel: (risk: Investment['riskLevel']) => string;
  formatMoney: (amount: number | null | undefined, status?: Investment['displayValueStatus']) => string;
  formatNativeMoney: (amount: number | null | undefined, currency?: string | null, item?: Investment | null, options?: { unitPrice?: boolean }) => string;
  accountValue: (item: Investment) => number | null;
  onDetails: (item: Investment) => void;
  onEdit: (item: Investment) => void;
  onDelete: (item: Investment) => void;
  onRefreshPrice?: (item: Investment) => void;
  onRefreshPrices?: (items: Investment[]) => void;
  refreshingPriceId?: string | null;
  refreshingPrices?: boolean;
  priceRefreshStatuses?: Record<string, InvestmentPriceRefreshStatus>;
}

export function InvestmentList({
  investments,
  labels,
  types,
  typeLabel,
  riskLabel,
  formatMoney,
  formatNativeMoney,
  accountValue,
  onDetails,
  onEdit,
  onDelete,
  onRefreshPrice,
  onRefreshPrices,
  refreshingPriceId,
  refreshingPrices = false,
  priceRefreshStatuses,
}: Props) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | InvestmentType>('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sort, setSort] = useState<SortMode>('valueDesc');
  const [platformLogos, setPlatformLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!investments.some(item => item.purchasePlatformId)) return;
    const controller = new AbortController();
    void fetch('/api/investment-platforms?limit=50', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then((payload: { items?: InvestmentPlatformDirectoryItem[] } | null) => {
        const entries = (payload?.items ?? [])
          .filter(item => item.logoUrl)
          .map(item => [item.id, item.logoUrl as string] as const);
        setPlatformLogos(Object.fromEntries(entries));
      })
      .catch(error => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setPlatformLogos({});
      });
    return () => controller.abort();
  }, [investments]);

  const total = useMemo(() => investments.reduce((sum, item) => sum + (accountValue(item) ?? 0), 0), [accountValue, investments]);
  const platformOptions = useMemo(() => {
    const options = new Map<string, string>();
    investments.forEach(item => {
      if (!item.purchasePlatformName) return;
      options.set(platformKey(item), item.purchasePlatformName);
    });
    return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [investments]);
  const filtered = useMemo(() => {
    const riskRank = { low: 0, medium: 1, high: 2 };
    let list = [...investments];

    const term = query.trim().toLowerCase();
    if (term) list = list.filter(item => item.name.toLowerCase().includes(term));
    if (filterType !== 'all') list = list.filter(item => item.type === filterType);
    if (filterPlatform !== 'all') list = list.filter(item => platformKey(item) === filterPlatform);

    switch (sort) {
      case 'valueDesc':
        list.sort((a, b) => (accountValue(b) ?? 0) - (accountValue(a) ?? 0));
        break;
      case 'valueAsc':
        list.sort((a, b) => (accountValue(a) ?? 0) - (accountValue(b) ?? 0));
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
  }, [accountValue, filterPlatform, filterType, investments, query, sort]);

  return (
    <section className="invest-panel">
      <div className="invest-list-toolbar">
        <div className="invest-controls">
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={labels.search} aria-label={labels.search} />
          <select value={filterType} onChange={event => setFilterType(event.target.value as 'all' | InvestmentType)} aria-label={labels.allTypes}>
            <option value="all">{labels.allTypes}</option>
            {types.map(type => <option key={type} value={type}>{typeLabel(type)}</option>)}
          </select>
          <select value={filterPlatform} onChange={event => setFilterPlatform(event.target.value)} aria-label={labels.purchasePlatform}>
            <option value="all">{labels.allPlatforms || 'All platforms'}</option>
            {platformOptions.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
          <select value={sort} onChange={event => setSort(event.target.value as SortMode)} aria-label={labels.sortBy}>
            <option value="valueDesc">{labels.valueDesc}</option>
            <option value="valueAsc">{labels.valueAsc}</option>
            <option value="monthlyDesc">{labels.monthlyDesc}</option>
            <option value="riskDesc">{labels.riskDesc}</option>
            <option value="newest">{labels.newest}</option>
          </select>
        </div>
        {onRefreshPrices && (
          <button
            type="button"
            className="invest-refresh-all"
            onClick={() => onRefreshPrices(filtered)}
            disabled={refreshingPrices || filtered.length === 0}
          >
            <RefreshCw size={16} className={refreshingPrices ? 'invest-spin' : undefined} />
            {refreshingPrices ? (labels.refreshingPrices || labels.refreshingPrice) : (labels.refreshAllPrices || labels.refreshPrice)}
          </button>
        )}
      </div>

      <div className="invest-list">
        {filtered.map(item => (
          <InvestmentRow
            key={item.id}
            investment={item}
            accountValue={accountValue(item)}
            portfolioPercent={total > 0 && accountValue(item) !== null ? ((accountValue(item) ?? 0) / total) * 100 : null}
            labels={labels}
            typeLabel={typeLabel}
            riskLabel={riskLabel}
            formatMoney={formatMoney}
            formatNativeMoney={formatNativeMoney}
            onDetails={onDetails}
            onEdit={onEdit}
            onDelete={onDelete}
            onRefreshPrice={onRefreshPrice}
            refreshing={refreshingPriceId === item.id}
            priceRefreshStatus={priceRefreshStatuses?.[item.id]}
            platformLogoUrl={item.purchasePlatformId ? platformLogos[item.purchasePlatformId] : null}
          />
        ))}
      </div>
    </section>
  );
}

function platformKey(item: Investment) {
  return item.purchasePlatformId || item.purchasePlatformName?.trim().toLocaleLowerCase('en-US') || '';
}
