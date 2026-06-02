'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Search, X } from 'lucide-react';
import { getCurrency } from '@/lib/currencies';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';

type Mode = 'create' | 'edit';
type SearchState = 'idle' | 'loading' | 'ready' | 'error';

type AssetSearchItem = {
  name: string;
  name_ar?: string;
  name_en?: string;
  symbol: string;
  provider_symbol: string | null;
  market: string | null;
  market_ar?: string;
  market_en?: string;
  country?: string;
  asset_type: string;
  currency: string | null;
  price: number | null;
  change?: number | null;
  change_percent?: number | null;
  updated_at: string | null;
  source: string;
  search_source?: string;
  available: boolean;
  unavailable_reason?: string;
};

interface Props {
  open: boolean;
  mode: Mode;
  currency: string;
  dir: 'rtl' | 'ltr';
  labels: {
    titleAdd: string;
    titleEdit: string;
    close: string;
    name: string;
    namePlaceholder: string;
    type: string;
    currentValue: string;
    currentSharePrice: string;
    currentMarketValue: string;
    quantity: string;
    numberOfUnits: string;
    assetQuantity: string;
    quantityHelper: string;
    currentPriceUnavailable: string;
    recalculate: string;
    monthly: string;
    startDate: string;
    risk: string;
    expectedReturn: string;
    notes: string;
    save: string;
    update: string;
    cancel: string;
    assetSearchLoading: string;
    assetSearchNoResultsTitle: string;
    assetSearchNoResultsBody: string;
    assetSearchProviderUnavailable: string;
    selectedAsset: string;
    currentPrice: string;
    lastUpdated: string;
    dataSource: string;
    unavailable: string;
    fetchedPriceNote: string;
    manualLinkWarningTitle: string;
    manualLinkWarningBody: string;
    totalMarketValue: string;
    assetTypes: Record<string, string>;
    errors: {
      nameRequired: string;
      valuePositive: string;
      contributionPositive: string;
      quantityPositive: string;
      returnRange: string;
    };
  };
  typeOptions: InvestmentType[];
  riskOptions: RiskLevel[];
  typeLabel: (type: InvestmentType) => string;
  riskLabel: (risk: RiskLevel) => string;
  initialValues?: Investment | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: InvestmentInput) => Promise<void> | void;
}

function formatNumber(value: number, decimals = 3) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function assetInvestmentType(assetType: string): InvestmentType {
  const normalized = assetType.toLowerCase();
  if (normalized === 'stock') return 'stocks';
  if (normalized === 'etf' || normalized === 'index') return 'fund';
  if (normalized === 'crypto') return 'crypto';
  if (normalized === 'gold' || normalized === 'commodity') return 'gold';
  if (normalized === 'forex') return 'cash';
  return 'other';
}

function assetFromInvestment(item: Investment | null | undefined): AssetSearchItem | null {
  const symbol = item?.symbol || item?.providerSymbol;
  if (!item || !symbol) return null;
  return {
    name: item.name,
    name_en: item.name,
    symbol,
    provider_symbol: item.providerSymbol ?? item.symbol ?? null,
    market: item.market ?? null,
    asset_type: item.assetType ?? 'stock',
    currency: item.currency ?? null,
    price: item.lastPrice ?? null,
    updated_at: item.lastPriceUpdatedAt ?? null,
    source: item.dataSource ?? 'Market data provider',
    available: typeof item.lastPrice === 'number' && Number.isFinite(item.lastPrice),
  };
}

export function InvestmentFormModal({
  open,
  mode,
  currency,
  dir,
  labels,
  typeOptions,
  riskOptions,
  typeLabel,
  riskLabel,
  initialValues,
  saving,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('stocks');
  const [currentValue, setCurrentValue] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [quantity, setQuantity] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [manualValueEdited, setManualValueEdited] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchItem | null>(null);
  const [searchResults, setSearchResults] = useState<AssetSearchItem[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');

  const currencyInfo = useMemo(() => getCurrency(currency), [currency]);
  const activeCurrency = (selectedAsset?.currency || initialValues?.currency || currencyInfo.code || currency).toUpperCase();
  const selectedPrice = selectedAsset?.price ?? null;
  const hasLinkedPrice = selectedPrice !== null && Number.isFinite(selectedPrice) && selectedPrice > 0;
  const quantityValue = Number(quantity || 0);
  const hasQuantity = quantity.trim() !== '' && Number.isFinite(quantityValue) && quantityValue > 0;
  const marketValue = hasLinkedPrice && hasQuantity ? selectedPrice * quantityValue : null;
  const valueForValidation = marketValue ?? Number(currentValue);
  const quantityLabel = getQuantityLabel(selectedAsset?.asset_type, labels);
  const assetName = selectedAsset ? localizedAssetName(selectedAsset, dir) : '';
  const selectedMatchesName = Boolean(selectedAsset && name.trim() === assetName);
  const shouldShowManualWarning = Boolean(name.trim() && !selectedAsset);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSearchResults([]);
    setSearchState('idle');

    if (mode === 'edit' && initialValues) {
      setName(initialValues.name);
      setType(initialValues.type);
      setCurrentValue(String(initialValues.currentValue));
      setManualValueEdited(false);
      setMonthlyContribution(String(initialValues.monthlyContribution || ''));
      setQuantity(initialValues.quantity === undefined ? '' : String(initialValues.quantity));
      setStartDate(initialValues.startDate);
      setRiskLevel(initialValues.riskLevel);
      setExpectedReturn(initialValues.expectedAnnualReturn === undefined ? '' : String(initialValues.expectedAnnualReturn));
      setNotes(initialValues.notes || '');
      setSelectedAsset(assetFromInvestment(initialValues));
      return;
    }

    setName('');
    setType('stocks');
    setCurrentValue('');
    setManualValueEdited(false);
    setMonthlyContribution('');
    setQuantity('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setRiskLevel('medium');
    setExpectedReturn('');
    setNotes('');
    setSelectedAsset(null);
  }, [initialValues, mode, open]);

  useEffect(() => {
    if (!open) return;
    if (marketValue === null || manualValueEdited) return;
    setCurrentValue(String(Number(marketValue.toFixed(3))));
  }, [manualValueEdited, marketValue, open]);

  useEffect(() => {
    if (!open) return;
    const query = name.trim();
    if (query.length < 2 || selectedMatchesName) {
      setSearchResults([]);
      setSearchState('idle');
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearchState('loading');
      try {
        const response = await fetch(`/api/market/search-assets?q=${encodeURIComponent(query)}`, {
          cache: 'no-store',
        });
        const payload = await response.json() as { ok?: boolean; items?: AssetSearchItem[] };
        if (cancelled) return;
        if (!response.ok || payload.ok === false) {
          setSearchResults([]);
          setSearchState('error');
          return;
        }
        setSearchResults(Array.isArray(payload.items) ? payload.items : []);
        setSearchState('ready');
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setSearchState('error');
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [name, open, selectedMatchesName]);

  function validate() {
    const nextErrors: Record<string, string> = {};
    const monthly = Number(monthlyContribution || 0);
    const expected = Number(expectedReturn || 0);

    if (!name.trim()) nextErrors.name = labels.errors.nameRequired;
    if (selectedAsset && hasLinkedPrice && !hasQuantity) nextErrors.quantity = labels.errors.quantityPositive;
    if ((!selectedAsset || !hasLinkedPrice) && (!currentValue || Number.isNaN(valueForValidation) || valueForValidation <= 0)) {
      nextErrors.currentValue = labels.errors.valuePositive;
    }
    if (monthlyContribution && (Number.isNaN(monthly) || monthly < 0)) nextErrors.monthlyContribution = labels.errors.contributionPositive;
    if (expectedReturn && (Number.isNaN(expected) || expected < 0 || expected > 100)) nextErrors.expectedReturn = labels.errors.returnRange;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNameChange(value: string) {
    setName(value);
    if (selectedAsset && value.trim() !== localizedAssetName(selectedAsset, dir)) {
      setSelectedAsset(null);
    }
  }

  function handleSelectAsset(asset: AssetSearchItem) {
    const localizedName = localizedAssetName(asset, dir);
    setSelectedAsset(asset);
    setName(localizedName);
    setType(assetInvestmentType(asset.asset_type));
    setSearchResults([]);
    setSearchState('idle');

    if (asset.price !== null && Number.isFinite(asset.price)) {
      if (hasQuantity) {
        setCurrentValue(String(Number((asset.price * quantityValue).toFixed(3))));
      } else {
        setCurrentValue('');
      }
      setManualValueEdited(false);
    }
    if (!notes.trim()) {
      setNotes(labels.fetchedPriceNote);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    const finalCurrentValue = marketValue ?? Number(currentValue);
    await onSave({
      name: name.trim(),
      type,
      currentValue: finalCurrentValue,
      monthlyContribution: Number(monthlyContribution || 0),
      startDate,
      riskLevel,
      expectedAnnualReturn: expectedReturn ? Number(expectedReturn) : undefined,
      notes: notes.trim() || undefined,
      symbol: selectedAsset?.symbol,
      providerSymbol: selectedAsset?.provider_symbol ?? undefined,
      market: selectedAsset ? localizedMarketName(selectedAsset, dir) : undefined,
      assetType: selectedAsset?.asset_type,
      currency: selectedAsset?.currency ?? activeCurrency,
      quantity: hasQuantity ? quantityValue : undefined,
      currentPrice: hasLinkedPrice ? selectedPrice : undefined,
      currentMarketValue: finalCurrentValue,
      priceCurrency: activeCurrency,
      lastPrice: selectedPrice ?? undefined,
      lastPriceUpdatedAt: selectedAsset?.updated_at ?? undefined,
      dataSource: selectedAsset?.source,
    });
  }

  if (!open) return null;

  const searchOpen = name.trim().length >= 2 && !selectedMatchesName && searchState !== 'idle';

  return (
    <div className="invest-overlay" role="presentation" onMouseDown={onClose}>
      <div className="invest-modal" role="dialog" aria-modal="true" aria-labelledby="invest-modal-title" onMouseDown={event => event.stopPropagation()}>
        <div className="invest-modal-head">
          <h2 id="invest-modal-title">{mode === 'create' ? labels.titleAdd : labels.titleEdit}</h2>
          <button type="button" className="invest-icon-btn" onClick={onClose} aria-label={labels.close}>
            <X size={18} />
          </button>
        </div>

        <form className="invest-form" onSubmit={handleSubmit}>
          <Field label={labels.name} error={errors.name} required className="span-2">
            <div className="invest-asset-search">
              <div className="invest-input-icon">
                <Search size={16} />
                <input value={name} onChange={event => handleNameChange(event.target.value)} placeholder={labels.namePlaceholder} autoFocus />
              </div>
              {searchOpen && (
                <div className="invest-asset-results" role="listbox">
                  {searchState === 'loading' && (
                    <div className="invest-asset-state">
                      <Loader2 size={17} className="invest-spin" />
                      <span>{labels.assetSearchLoading}</span>
                    </div>
                  )}
                  {searchState === 'error' && (
                    <div className="invest-asset-state invest-asset-state--warning">
                      <AlertCircle size={17} />
                      <span>{labels.assetSearchProviderUnavailable}</span>
                    </div>
                  )}
                  {searchState === 'ready' && searchResults.length === 0 && (
                    <div className="invest-asset-state">
                      <strong>{labels.assetSearchNoResultsTitle}</strong>
                      <span>{labels.assetSearchNoResultsBody}</span>
                    </div>
                  )}
                  {searchState === 'ready' && searchResults.map(asset => (
                    <button key={`${asset.symbol}:${asset.provider_symbol ?? asset.asset_type}`} type="button" className="invest-asset-result" onClick={() => handleSelectAsset(asset)}>
                      <span className="invest-asset-result-icon"><TrendingGlyph assetType={asset.asset_type} /></span>
                      <span className="invest-asset-result-body">
                        <strong>{localizedAssetName(asset, dir)}</strong>
                        <small>
                          <b dir="ltr">{asset.symbol}</b>
                          {' · '}
                          {localizedMarketName(asset, dir) || asset.country || labels.unavailable}
                          {' · '}
                          {labels.assetTypes[asset.asset_type] ?? asset.asset_type}
                        </small>
                      </span>
                      <span className="invest-asset-result-price" dir="ltr">
                        {asset.price !== null && asset.currency
                          ? `${asset.currency} ${formatNumber(asset.price)}`
                          : labels.unavailable}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {selectedAsset && (
            <div className="invest-selected-asset span-2">
              <div>
                <span><CheckCircle2 size={15} /> {labels.selectedAsset}</span>
                <strong>{localizedAssetName(selectedAsset, dir)}</strong>
                <small>
                  <b dir="ltr">{selectedAsset.provider_symbol ?? selectedAsset.symbol}</b>
                  {' · '}
                  {localizedMarketName(selectedAsset, dir) || labels.unavailable}
                  {' · '}
                  {labels.assetTypes[selectedAsset.asset_type] ?? selectedAsset.asset_type}
                </small>
              </div>
              <div>
                <span>{labels.currentPrice}</span>
                <strong dir="ltr">{selectedAsset.price !== null && selectedAsset.currency ? `${selectedAsset.currency} ${formatNumber(selectedAsset.price)}` : labels.unavailable}</strong>
                <small>{labels.lastUpdated}: {formatUpdatedAt(selectedAsset.updated_at) || labels.unavailable}</small>
              </div>
              <div>
                <span>{labels.dataSource}</span>
                <strong>{selectedAsset.source}</strong>
                <small>{selectedAsset.available ? labels.currentPrice : labels.unavailable}</small>
              </div>
            </div>
          )}

          {shouldShowManualWarning && (
            <div className="invest-manual-warning span-2">
              <AlertCircle size={18} />
              <div>
                <strong>{labels.manualLinkWarningTitle}</strong>
                <p>{labels.manualLinkWarningBody}</p>
              </div>
            </div>
          )}

          <Field label={labels.type} required>
            <select value={type} onChange={event => setType(event.target.value as InvestmentType)}>
              {typeOptions.map(option => <option key={option} value={option}>{typeLabel(option)}</option>)}
            </select>
          </Field>

          <Field label={quantityLabel} error={errors.quantity} helper={labels.quantityHelper}>
            <input type="number" min="0" step="0.001" value={quantity} onChange={event => setQuantity(event.target.value)} dir="ltr" />
          </Field>

          {selectedAsset && hasLinkedPrice ? (
            <div className="invest-field">
              <span>{labels.currentSharePrice}</span>
              <div className="invest-readonly-money">
                <span dir="ltr">{activeCurrency}</span>
                <strong dir="ltr">{formatNumber(selectedPrice)}</strong>
              </div>
            </div>
          ) : selectedAsset ? (
            <div className="invest-price-unavailable">
              <AlertCircle size={17} />
              <span>{labels.currentPriceUnavailable}</span>
            </div>
          ) : (
            <Field label={labels.currentValue} error={errors.currentValue} required>
              <div className="invest-money-input">
                <span dir="ltr">{activeCurrency}</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={currentValue}
                  onChange={event => {
                    setCurrentValue(event.target.value);
                    setManualValueEdited(true);
                  }}
                  dir="ltr"
                />
              </div>
            </Field>
          )}

          <Field label={labels.monthly} error={errors.monthlyContribution}>
            <div className="invest-money-input">
              <span dir="ltr">{activeCurrency}</span>
              <input type="number" min="0" step="0.001" value={monthlyContribution} onChange={event => setMonthlyContribution(event.target.value)} dir="ltr" />
            </div>
          </Field>

          {selectedAsset && hasLinkedPrice && (
            <div className="invest-calculation-card span-2">
              <div className="invest-calculation-head">
                <span>{labels.totalMarketValue}</span>
                {marketValue !== null && (
                  <button type="button" onClick={() => {
                    setCurrentValue(String(Number(marketValue.toFixed(3))));
                    setManualValueEdited(false);
                  }}>
                    {labels.recalculate}
                  </button>
                )}
              </div>
              <div className="invest-calculation-grid">
                <div>
                  <span>{labels.currentSharePrice}</span>
                  <strong dir="ltr">{activeCurrency} {formatNumber(selectedPrice)}</strong>
                </div>
                <div>
                  <span>{quantityLabel}</span>
                  <strong dir="ltr">{hasQuantity ? formatNumber(quantityValue) : '-'}</strong>
                </div>
                <div className="invest-calculation-total">
                  <span>{labels.currentMarketValue}</span>
                  <strong dir="ltr">{marketValue !== null ? `${activeCurrency} ${formatNumber(marketValue)}` : '-'}</strong>
                </div>
              </div>
              <small dir="ltr">
                {marketValue !== null
                  ? `${formatNumber(selectedPrice)} × ${formatNumber(quantityValue)} = ${formatNumber(marketValue)} ${activeCurrency}`
                  : labels.quantityHelper}
              </small>
            </div>
          )}

          <Field label={labels.startDate} required>
            <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
          </Field>

          <Field label={labels.risk} required>
            <select value={riskLevel} onChange={event => setRiskLevel(event.target.value as RiskLevel)}>
              {riskOptions.map(option => <option key={option} value={option}>{riskLabel(option)}</option>)}
            </select>
          </Field>

          <Field label={labels.expectedReturn} error={errors.expectedReturn}>
            <div className="invest-suffix-input">
              <input type="number" min="0" max="100" step="0.1" value={expectedReturn} onChange={event => setExpectedReturn(event.target.value)} placeholder="0 - 100" dir="ltr" />
              <span>%</span>
            </div>
          </Field>

          <Field label={labels.notes} className="span-2">
            <textarea value={notes} onChange={event => setNotes(event.target.value)} />
          </Field>

          <div className="invest-form-actions span-2">
            <button type="button" className="invest-secondary-btn" onClick={onClose} disabled={saving}>
              {labels.cancel}
            </button>
            <button type="submit" className="invest-primary-btn" disabled={saving}>
              {mode === 'create' ? labels.save : labels.update}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function localizedAssetName(asset: AssetSearchItem, dir: 'rtl' | 'ltr') {
  if (dir === 'rtl') return asset.name_ar || asset.name || asset.name_en || asset.symbol;
  return asset.name_en || asset.name || asset.name_ar || asset.symbol;
}

function localizedMarketName(asset: AssetSearchItem, dir: 'rtl' | 'ltr') {
  if (dir === 'rtl') return asset.market_ar || asset.market || asset.market_en || '';
  return asset.market_en || asset.market || asset.market_ar || '';
}

function getQuantityLabel(assetType: string | undefined, labels: Props['labels']) {
  const normalized = String(assetType ?? '').toLowerCase();
  if (normalized === 'etf' || normalized === 'fund' || normalized === 'index') return labels.numberOfUnits;
  if (normalized === 'crypto' || normalized === 'forex' || normalized === 'commodity' || normalized === 'gold') return labels.assetQuantity;
  return labels.quantity;
}

function formatUpdatedAt(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function TrendingGlyph({ assetType }: { assetType: string }) {
  return <span dir="ltr">{assetType.slice(0, 2).toUpperCase()}</span>;
}

function Field({
  label,
  error,
  helper,
  required,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`invest-field ${className}`}>
      <span>{label}{required && <b>*</b>}</span>
      {children}
      {helper && !error && <em>{helper}</em>}
      {error && <small>{error}</small>}
    </label>
  );
}
