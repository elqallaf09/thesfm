'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { AppModal } from '@/components/ui/AppModal';
import type { WorldStockAssetType } from '@/lib/world-stocks/types';
import type { WorldStockSort } from '@/lib/world-stocks/sort';

type ActiveFilter = { key: string; label: string; value: string; onClear: () => void };

type WorldStocksAdvancedFiltersProps = {
  assetType: WorldStockAssetType | null;
  sort: WorldStockSort;
  labels: {
    filter: string;
    close: string;
    assetType: string;
    assetTypeAll: string;
    assetTypeStock: string;
    assetTypeEtf: string;
    sort: string;
    sortName: string;
    sortSymbol: string;
    sortChangeDesc: string;
    sortChangeAsc: string;
    clear: string;
    activeFilters: string;
  };
  onAssetTypeChange: (value: WorldStockAssetType | null) => void;
  onSortChange: (value: WorldStockSort) => void;
  onClearFilters: () => void;
};

export function WorldStocksAdvancedFilters({
  assetType,
  sort,
  labels,
  onAssetTypeChange,
  onSortChange,
  onClearFilters,
}: WorldStocksAdvancedFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFilters: ActiveFilter[] = [
    assetType ? { key: 'assetType', label: labels.assetType, value: assetType === 'stock' ? labels.assetTypeStock : labels.assetTypeEtf, onClear: () => onAssetTypeChange(null) } : null,
    sort !== 'name' ? { key: 'sort', label: labels.sort, value: sort === 'symbol' ? labels.sortSymbol : sort === 'change_desc' ? labels.sortChangeDesc : labels.sortChangeAsc, onClear: () => onSortChange('name') } : null,
  ].filter((entry): entry is ActiveFilter => Boolean(entry));

  return (
    <>
      <button
        type="button"
        className="world-stocks-filters-trigger"
        onClick={event => {
          // WebKit does not focus a <button> on a plain mouse click (only on
          // keyboard activation) -- focus it explicitly so AppModal's
          // "restore focus to whatever was active when it opened" has a real
          // element to restore to once Escape closes the dialog.
          event.currentTarget.focus();
          setOpen(true);
        }}
        aria-expanded={open}
      >
        <SlidersHorizontal size={15} />
        {labels.filter}
        {activeFilters.length > 0 ? <b>{activeFilters.length}</b> : null}
      </button>

      {activeFilters.length > 0 ? (
        <div className="world-stocks-active-filters" aria-label={labels.activeFilters}>
          {activeFilters.map(item => (
            <button type="button" key={item.key} onClick={item.onClear}>
              <span>{item.label}</span>
              <b>{item.value}</b>
              <X size={13} />
            </button>
          ))}
          <button type="button" className="world-stocks-clear-btn" onClick={onClearFilters}>
            <X size={13} />
            {labels.clear}
          </button>
        </div>
      ) : null}

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title={labels.filter}
        closeLabel={labels.close}
        size="sm"
        bodyClassName="world-stocks-filters-body"
      >
        <label className="world-stocks-select-control">
          <span>{labels.assetType}</span>
          <select value={assetType ?? 'all'} onChange={event => onAssetTypeChange(event.target.value === 'all' ? null : event.target.value as WorldStockAssetType)}>
            <option value="all">{labels.assetTypeAll}</option>
            <option value="stock">{labels.assetTypeStock}</option>
            <option value="etf">{labels.assetTypeEtf}</option>
          </select>
        </label>

        <label className="world-stocks-select-control">
          <span>{labels.sort}</span>
          <select value={sort} onChange={event => onSortChange(event.target.value as WorldStockSort)}>
            <option value="name">{labels.sortName}</option>
            <option value="symbol">{labels.sortSymbol}</option>
            <option value="change_desc">{labels.sortChangeDesc}</option>
            <option value="change_asc">{labels.sortChangeAsc}</option>
          </select>
        </label>

        {activeFilters.length > 0 ? (
          <button type="button" className="world-stocks-clear-btn" onClick={onClearFilters}>
            <X size={15} />
            {labels.clear}
          </button>
        ) : null}
      </AppModal>

      <style jsx global>{`
        .world-stocks-filters-trigger{
          display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;
          border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);
          color:var(--foreground);font-family:var(--font-ui);font-size:12.5px;font-weight:600;cursor:pointer;
        }
        .world-stocks-filters-trigger:hover,.world-stocks-filters-trigger:focus-visible{outline:none;border-color:var(--accent);box-shadow:var(--focus-shadow)}
        .world-stocks-filters-trigger b{min-width:20px;height:20px;border-radius:var(--radius-pill);display:grid;place-items:center;background:var(--primary);color:var(--primary-foreground);font-size:11px}
        .world-stocks-filters-body{display:grid;gap:14px}
        .world-stocks-select-control{display:grid;gap:6px;min-width:0}
        .world-stocks-select-control span{color:var(--foreground-muted);font-size:12px;font-weight:600}
        .world-stocks-select-control select{width:100%;height:var(--control-h-lg);border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground);padding-inline:12px;font-family:var(--font-ui);font-size:13px;font-weight:600;outline:none}
        .world-stocks-select-control select:focus{border-color:var(--accent);box-shadow:var(--focus-shadow)}
        .world-stocks-clear-btn{min-height:40px;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--foreground);display:inline-flex;align-items:center;gap:7px;padding:0 13px;font-family:var(--font-ui);font-size:12px;font-weight:600;cursor:pointer}
        .world-stocks-clear-btn:hover,.world-stocks-clear-btn:focus-visible{outline:none;border-color:var(--accent);box-shadow:var(--focus-shadow)}
        .world-stocks-active-filters{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
        .world-stocks-active-filters button{display:inline-flex;align-items:center;gap:7px;max-width:100%;min-height:40px;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--info-soft);color:var(--info);padding:0 10px;font-family:var(--font-ui);font-size:12px;font-weight:600;cursor:pointer}
        .world-stocks-active-filters button b{min-width:0;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
        .world-stocks-active-filters button:hover,.world-stocks-active-filters button:focus-visible{outline:none;border-color:var(--primary);box-shadow:var(--focus-shadow)}
        .world-stocks-active-filters .world-stocks-clear-btn{background:transparent}
        @media(max-width:760px){
          .world-stocks-clear-btn,.world-stocks-active-filters button{min-height:44px}
        }
      `}</style>
    </>
  );
}

export default WorldStocksAdvancedFilters;
