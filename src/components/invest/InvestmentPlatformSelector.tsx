'use client';

import { Building2, Check, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  cleanPlatformName,
  cleanPlatformType,
  cleanPlatformWebsite,
  PlatformValidationError,
} from '@/lib/investments/platformDirectory';
import type { InvestmentType } from '@/types/investment';
import {
  INVESTMENT_PLATFORM_TYPES,
  type InvestmentPlatformDirectoryItem,
  type InvestmentPlatformSelection,
  type InvestmentPlatformType,
} from '@/types/investmentPlatform';

type Labels = {
  sectionTitle: string;
  contextual: Record<InvestmentType, string>;
  optional: string;
  type: string;
  allTypes: string;
  search: string;
  noResults: string;
  loadFailed: string;
  addNew: string;
  addTitle: string;
  name: string;
  website: string;
  websiteOptional: string;
  add: string;
  adding: string;
  cancel: string;
  clear: string;
  selected: string;
  pending: string;
  localOnly: string;
  notSpecified: string;
  submissionFailed: string;
  validationInvalid: string;
  typeLabels: Record<InvestmentPlatformType, string>;
};

type Props = {
  investmentType: InvestmentType;
  labels: Labels;
  value: InvestmentPlatformSelection | null;
  onChange: (value: InvestmentPlatformSelection | null) => void;
  authToken?: string | null;
  isGuest?: boolean;
};

export function InvestmentPlatformSelector({ investmentType, labels, value, onChange, authToken, isGuest = false }: Props) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [platformType, setPlatformType] = useState<InvestmentPlatformType | 'all'>(value?.type ?? 'all');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<InvestmentPlatformDirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<InvestmentPlatformType>(suggestedPlatformType(investmentType));
  const [customWebsite, setCustomWebsite] = useState('');
  const [customError, setCustomError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCustomType(suggestedPlatformType(investmentType));
  }, [investmentType]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setLoadFailed(false);
      const params = new URLSearchParams({ limit: '25' });
      if (query.trim()) params.set('q', query.trim());
      if (platformType !== 'all') params.set('type', platformType);
      try {
        const response = await fetch(`/api/investment-platforms?${params.toString()}`, { cache: 'no-store', signal: controller.signal });
        const payload = await response.json() as { ok?: boolean; items?: InvestmentPlatformDirectoryItem[] };
        if (cancelled) return;
        if (!response.ok || !payload.ok) throw new Error('directory unavailable');
        setItems(Array.isArray(payload.items) ? payload.items : []);
        setActiveIndex(0);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (!cancelled) {
          setItems([]);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [platformType, query]);

  const activeItem = items[activeIndex];
  const activeOptionId = activeItem ? `${listboxId}-${activeItem.id}` : undefined;
  const contextualLabel = labels.contextual[investmentType];
  const summaryType = value ? labels.typeLabels[value.type] : '';
  const hasResults = items.length > 0;

  function selectItem(item: InvestmentPlatformDirectoryItem) {
    onChange({ id: item.id, name: item.canonicalName, type: item.platformType, status: item.status });
    setPlatformType(item.platformType);
    setQuery('');
    setOpen(false);
    setCustomOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => Math.min(index + 1, Math.max(items.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && activeItem) {
      event.preventDefault();
      selectItem(activeItem);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  async function submitCustom() {
    setCustomError('');
    try {
      const name = cleanPlatformName(customName);
      const type = cleanPlatformType(customType);
      const websiteUrl = cleanPlatformWebsite(customWebsite);
      if (isGuest || !authToken) {
        onChange({ name, type, status: 'local' });
        setCustomOpen(false);
        return;
      }

      setSubmitting(true);
      const response = await fetch('/api/investment-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ name, platformType: type, websiteUrl }),
      });
      const payload = await response.json() as { ok?: boolean; code?: string; item?: InvestmentPlatformDirectoryItem };
      if (!response.ok || !payload.ok || !payload.item) throw new Error(payload.code || 'submission failed');
      onChange({
        id: payload.item.id,
        name: payload.item.canonicalName,
        type: payload.item.platformType,
        status: payload.item.status,
      });
      setCustomOpen(false);
      setQuery('');
    } catch (error) {
      setCustomError(error instanceof PlatformValidationError ? labels.validationInvalid : labels.submissionFailed);
    } finally {
      setSubmitting(false);
    }
  }

  const options = useMemo(() => INVESTMENT_PLATFORM_TYPES.map(type => ({ type, label: labels.typeLabels[type] })), [labels.typeLabels]);

  return (
    <div className="invest-platform-directory span-2">
      <div className="invest-platform-heading">
        <span className="invest-platform-icon"><Building2 size={17} /></span>
        <div>
          <h3>{labels.sectionTitle}</h3>
          <p>{contextualLabel} · {labels.optional}</p>
        </div>
      </div>

      <div className="invest-platform-controls">
        <label htmlFor={`${inputId}-type`}>
          <span>{labels.type}</span>
          <select id={`${inputId}-type`} value={platformType} onChange={event => setPlatformType(event.target.value as InvestmentPlatformType | 'all')}>
            <option value="all">{labels.allTypes}</option>
            {options.map(option => <option key={option.type} value={option.type}>{option.label}</option>)}
          </select>
        </label>

        <div className="invest-platform-search-label">
          <label htmlFor={inputId}>{contextualLabel}</label>
          <div className="invest-platform-combobox">
            <Search size={16} aria-hidden="true" />
            <input
              id={inputId}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-activedescendant={open ? activeOptionId : undefined}
              value={query}
              placeholder={labels.search}
              autoComplete="off"
              onChange={event => { setQuery(event.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
            />
            <button type="button" onClick={() => setOpen(current => !current)} aria-label={labels.search}>
              {loading ? <Loader2 size={16} className="invest-spin" /> : <ChevronDown size={16} />}
            </button>
            {open && (
              <div id={listboxId} role="listbox" className="invest-platform-results">
                {loadFailed && <p>{labels.loadFailed}</p>}
                {!loadFailed && !loading && !hasResults && <p>{labels.noResults}</p>}
                {items.map((item, index) => (
                  <button
                    id={`${listboxId}-${item.id}`}
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={value?.id === item.id}
                    className={index === activeIndex ? 'active' : ''}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectItem(item)}
                  >
                    <span className="invest-platform-result-icon"><Building2 size={16} /></span>
                    <span><strong>{item.canonicalName}</strong><small>{labels.typeLabels[item.platformType]}</small></span>
                    {value?.id === item.id && <Check size={16} aria-hidden="true" />}
                  </button>
                ))}
                <button type="button" className="invest-platform-add-result" onClick={() => { setCustomOpen(true); setOpen(false); setCustomName(query); }}>
                  <Plus size={16} /> {labels.addNew}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!value && <p className="invest-platform-empty">{labels.notSpecified}</p>}
      {value && (
        <div className="invest-platform-summary" aria-live="polite">
          <span className="invest-platform-result-icon"><Building2 size={17} /></span>
          <span><small>{labels.selected}</small><strong>{value.name}</strong><em>{summaryType}</em></span>
          {value.status === 'pending' && <b className="invest-platform-pending">{labels.pending}</b>}
          {value.status === 'local' && <b className="invest-platform-local">{labels.localOnly}</b>}
          <button type="button" onClick={() => onChange(null)} aria-label={labels.clear}><X size={16} /></button>
        </div>
      )}

      {!customOpen && (
        <button type="button" className="invest-platform-add-link" onClick={() => setCustomOpen(true)}>
          <Plus size={16} /> {labels.addNew}
        </button>
      )}

      {customOpen && (
        <div className="invest-platform-custom" aria-labelledby={`${inputId}-custom-title`}>
          <div className="invest-platform-custom-head">
            <strong id={`${inputId}-custom-title`}>{labels.addTitle}</strong>
            <button type="button" onClick={() => setCustomOpen(false)} aria-label={labels.cancel}><X size={16} /></button>
          </div>
          <label><span>{labels.name}</span><input value={customName} maxLength={80} onChange={event => setCustomName(event.target.value)} /></label>
          <label><span>{labels.type}</span><select value={customType} onChange={event => setCustomType(event.target.value as InvestmentPlatformType)}>{options.map(option => <option key={option.type} value={option.type}>{option.label}</option>)}</select></label>
          <label className="span-2"><span>{labels.website} · {labels.websiteOptional}</span><input type="url" inputMode="url" maxLength={300} placeholder="https://" dir="ltr" value={customWebsite} onChange={event => setCustomWebsite(event.target.value)} /></label>
          {customError && <p className="invest-platform-error span-2" role="alert">{customError}</p>}
          <div className="invest-platform-custom-actions span-2">
            <button type="button" className="invest-secondary-btn" onClick={() => setCustomOpen(false)}>{labels.cancel}</button>
            <button type="button" className="invest-primary-btn" disabled={submitting} onClick={() => void submitCustom()}>{submitting ? labels.adding : labels.add}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function suggestedPlatformType(type: InvestmentType): InvestmentPlatformType {
  if (type === 'crypto') return 'crypto_exchange';
  if (type === 'gold' || type === 'silver') return 'precious_metals_dealer';
  if (type === 'realEstate') return 'real_estate_platform';
  if (type === 'project') return 'private_investment_provider';
  if (type === 'cash') return 'bank_brokerage';
  if (type === 'fund') return 'fund_platform';
  if (type === 'stocks') return 'stock_broker';
  return 'other';
}
