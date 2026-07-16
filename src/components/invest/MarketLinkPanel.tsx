'use client';

import { ArrowUpRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AssetAvatar } from '@/components/asset/AssetAvatar';
import type { Investment } from '@/types/investment';

export type MarketLinkEntry = { investment: Investment; symbol: string };

type SortMode = 'name' | 'symbol';

export type MarketLinkPanelLabels = {
  search: string;
  sortBy: string;
  sortName: string;
  sortSymbol: string;
  connected: string;
  openAnalysis: string;
  /** Uses {count} for the number of holdings sharing one symbol. */
  holdingsCount: string;
  noResults: string;
};

type MarketLinkRow = {
  symbol: string;
  name: string;
  market?: string;
  assetType: string;
  holdings: number;
};

interface Props {
  entries: MarketLinkEntry[];
  labels: MarketLinkPanelLabels;
  onOpen: (symbol: string) => void;
}

/**
 * One row per market symbol: several holdings of the same asset collapse into
 * a single link with a holdings counter, so the panel never repeats an asset.
 */
export function MarketLinkPanel({ entries, labels, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('name');

  const rows = useMemo(() => {
    const bySymbol = new Map<string, MarketLinkRow>();
    for (const entry of entries) {
      const key = entry.symbol.trim().toUpperCase();
      const existing = bySymbol.get(key);
      if (existing) {
        existing.holdings += 1;
        continue;
      }
      bySymbol.set(key, {
        symbol: entry.symbol,
        name: entry.investment.name,
        market: entry.investment.market,
        assetType: entry.investment.assetType || entry.investment.type,
        holdings: 1,
      });
    }

    let list = Array.from(bySymbol.values());
    const term = query.trim().toLowerCase();
    if (term) {
      list = list.filter(row => row.name.toLowerCase().includes(term) || row.symbol.toLowerCase().includes(term));
    }
    list.sort((a, b) => sort === 'symbol'
      ? a.symbol.localeCompare(b.symbol, 'en-US')
      : a.name.localeCompare(b.name));
    return list;
  }, [entries, query, sort]);

  return (
    <div className="invest-market-panel">
      <div className="invest-market-toolbar">
        <label className="invest-market-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={labels.search}
            aria-label={labels.search}
          />
        </label>
        <select value={sort} onChange={event => setSort(event.target.value as SortMode)} aria-label={labels.sortBy}>
          <option value="name">{labels.sortName}</option>
          <option value="symbol">{labels.sortSymbol}</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="invest-market-empty" role="status">{labels.noResults}</p>
      ) : (
        <ul className="invest-market-rows">
          {rows.map(row => (
            <li key={row.symbol.toUpperCase()}>
              <AssetAvatar
                symbol={row.symbol}
                name={row.name}
                assetType={row.assetType}
                exchange={row.market}
                market={row.market}
                size="sm"
                decorative
              />
              <div className="invest-market-row-copy">
                <strong title={row.name}>{row.name}</strong>
                <span>
                  <b dir="ltr">{row.symbol}</b>
                  {row.market ? <em>{row.market}</em> : null}
                  {row.holdings > 1 ? <em>{labels.holdingsCount.replace('{count}', String(row.holdings))}</em> : null}
                </span>
              </div>
              <span className="invest-market-row-status">
                <span aria-hidden="true" />
                {labels.connected}
              </span>
              <button type="button" className="invest-market-open" onClick={() => onOpen(row.symbol)}>
                <span>{labels.openAnalysis}</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MarketLinkPanel;
