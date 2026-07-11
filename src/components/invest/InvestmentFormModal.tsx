'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  Coins,
  FolderKanban,
  Gem,
  Home,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { currencyDisplayName, getCurrency, getCurrencyOptions, type CurrencyLocale } from '@/lib/currencies';
import { parseMoneyValue } from '@/lib/money';
import { formatMarketPrice, normalizeMarketCurrencyCode, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { MARKET_EXCHANGE_OPTIONS, normalizeMarketExchange, type MarketExchangeId } from '@/lib/market/marketExchangeOptions';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';

type Mode = 'create' | 'edit';
type SearchState = 'idle' | 'loading' | 'ready' | 'error';
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type FxState = {
  state: LoadState;
  from: string;
  to: string;
  rate: number | null;
  source?: string | null;
  lastUpdated?: string | null;
  message?: string;
};

type ParsedFormNumber = {
  status: 'missing' | 'valid' | 'invalid';
  value: number | null;
};

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
  price_unit?: 'major' | 'fils' | 'pence' | null;
  price: number | null;
  change?: number | null;
  change_percent?: number | null;
  updated_at: string | null;
  source: string;
  search_source?: string;
  available: boolean;
  unavailable_reason?: string;
};

type MetalPrice = {
  price: number;
  currency: string;
  unit: 'gram';
  lastUpdated: string;
};

type MetalsState = {
  state: LoadState;
  currency: string;
  source: string;
  gold: MetalPrice | null;
  silver: MetalPrice | null;
  message?: string;
};

interface Props {
  open: boolean;
  mode: Mode;
  currency: string;
  dir: 'rtl' | 'ltr';
  labels: {
    titleAdd: string;
    titleEdit: string;
    subtitle: string;
    close: string;
    name: string;
    namePlaceholder: string;
    type: string;
    exchange: string;
    exchangeAll: string;
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
    saving: string;
    update: string;
    updating: string;
    cancel: string;
    saveAnother: string;
    assetSearchLoading: string;
    assetSearchNoResultsTitle: string;
    assetSearchNoResultsBody: string;
    assetSearchProviderUnavailable: string;
    symbolsSyncing: string;
    savedAssetMissingFromDirectory: string;
    selectedAsset: string;
    currentPrice: string;
    lastUpdated: string;
    dataSource: string;
    unavailable: string;
    fetchedPriceNote: string;
    totalMarketValue: string;
    assetTypes: Record<string, string>;
    sectionAssetType: string;
    sectionAssetDetails: string;
    sectionQuantityCost: string;
    sectionExtraDetails: string;
    assetSearchPlaceholder: string;
    cryptoSearchPlaceholder: string;
    fundSearchPlaceholder: string;
    symbolRequired: string;
    symbolOptional: string;
    marketOptional: string;
    marketSource: string;
    investmentCurrency: string;
    purchasePricePerShare: string;
    currentPricePerShare: string;
    purchasePricePerUnit: string;
    currentPricePerUnit: string;
    purchasePricePerCoin: string;
    currentPricePerCoin: string;
    purchasePricePerGram: string;
    currentPricePerGram: string;
    purchaseTotal: string;
    purchaseTotalHelper: string;
    cryptoQuantityHelper: string;
    cryptoPurchasePriceHelper: string;
    cryptoPurchaseTotalHelper: string;
    currentValueAuto: string;
    goldProductType: string;
    silverProductType: string;
    grams: string;
    count: string;
    metalCount: string;
    propertyName: string;
    propertyLocation: string;
    propertyPurchasePrice: string;
    propertyCurrentValue: string;
    propertyMonthlyIncome: string;
    propertyType: string;
    cashName: string;
    cashAmount: string;
    annualYield: string;
    maturityDate: string;
    projectName: string;
    projectCapital: string;
    projectMonthlyIncome: string;
    projectMonthlyExpense: string;
    projectNetProfit: string;
    otherAmount: string;
    otherCurrentValue: string;
    summaryTitle: string;
    summaryIncomplete: string;
    summaryPurchaseTotal: string;
    summaryCurrentValue: string;
    summaryProfitLoss: string;
    summaryProfitLossPercent: string;
    summaryCurrency: string;
    summaryDefaultCurrencyValue: string;
    fxUnavailable: string;
    fxLoading: string;
    fxRate: string;
    fxRetry: string;
    validationSummary: string;
    manualPriceHint: string;
    livePriceHint: string;
    searchMustSelect: string;
    metalsPriceLoading: string;
    metalsPriceUnavailable: string;
    goldUnits: Record<string, string>;
    silverUnits: Record<string, string>;
    propertyTypes: Record<string, string>;
    errors: {
      nameRequired: string;
      valuePositive: string;
      contributionPositive: string;
      quantityPositive: string;
      quantityRequired: string;
      returnRange: string;
      assetRequired: string;
      purchasePriceRequired: string;
      purchaseBasisRequired: string;
      numericInvalid: string;
      currentValueRequired: string;
      gramsPositive: string;
      startDateRequired: string;
      fxRequired: string;
      expensePositive: string;
    };
  };
  typeOptions: InvestmentType[];
  riskOptions: RiskLevel[];
  typeLabel: (type: InvestmentType) => string;
  riskLabel: (risk: RiskLevel) => string;
  initialValues?: Investment | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: InvestmentInput, options?: { addAnother?: boolean }) => Promise<void> | void;
}

const MARKET_TYPES: InvestmentType[] = ['stocks', 'fund', 'crypto'];
const GOLD_PRODUCT_GRAMS: Record<string, number | null> = {
  bar: null,
  lira: 7.2,
  gram: 1,
  ounce: 31.1034768,
  other: null,
};
const SILVER_PRODUCT_GRAMS: Record<string, number | null> = {
  gram: 1,
  ten_gram: 10,
  twenty_gram: 20,
  ounce: 31.1034768,
  lira: 7.2,
  half_lira: 3.6,
  kilo: 1000,
  other: null,
};

function hasInputValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}

function parseFormNumber(value: string | number | null | undefined): ParsedFormNumber {
  if (!hasInputValue(value)) return { status: 'missing', value: null };
  const parsed = parseMoneyValue(value);
  if (parsed.status === 'valid' && Number.isFinite(parsed.value)) {
    return { status: 'valid', value: parsed.value };
  }
  return { status: 'invalid', value: null };
}

function parsedValue(parsed: ParsedFormNumber) {
  return parsed.status === 'valid' ? parsed.value : null;
}

function positiveParsedValue(parsed: ParsedFormNumber) {
  return parsed.status === 'valid' && parsed.value !== null && parsed.value > 0 ? parsed.value : null;
}

function positiveProduct(a: number | null | undefined, b: number | null | undefined) {
  if (a === null || a === undefined || b === null || b === undefined || a <= 0 || b <= 0) return null;
  return a * b;
}

function toInputNumber(value: number | string | null | undefined, max = 10) {
  const parsed = typeof value === 'number' ? null : parseMoneyValue(value);
  const numeric = typeof value === 'number' ? value : parsed?.status === 'valid' ? parsed.value : null;
  if (numeric === null || numeric === undefined || !Number.isFinite(numeric)) return '';
  return Number(numeric.toFixed(max)).toString();
}

function formatNumber(value: number, decimals = 4) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function isMarketType(type: InvestmentType) {
  return MARKET_TYPES.includes(type);
}

function normalizedCurrency(value: string | null | undefined, fallback: string) {
  const next = String(value || fallback || 'KWD').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(next) ? next : fallback.toUpperCase();
}

function resolveFormCurrency(input: {
  currency?: unknown;
  nativeCurrency?: unknown;
  priceCurrency?: unknown;
  market?: unknown;
  symbol?: unknown;
  providerSymbol?: unknown;
  assetType?: unknown;
  fallback: string;
}) {
  const providerCurrency = normalizeMarketCurrencyCode(input.nativeCurrency ?? input.priceCurrency ?? input.currency);
  const resolved = resolveMarketCurrency({
    providerCurrency,
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    exchange: input.market,
    market: input.market,
    assetType: typeof input.assetType === 'string' ? input.assetType : null,
  });
  return resolved.currency ?? providerCurrency ?? normalizedCurrency(null, input.fallback);
}

function assetInvestmentType(assetType: string): InvestmentType {
  const normalized = assetType.toLowerCase();
  if (normalized === 'stock') return 'stocks';
  if (normalized === 'etf' || normalized === 'index' || normalized === 'fund') return 'fund';
  if (normalized === 'crypto') return 'crypto';
  return 'other';
}

function assetFromInvestment(item: Investment | null | undefined): AssetSearchItem | null {
  const symbol = item?.symbol || item?.providerSymbol;
  if (!item || !symbol || !isMarketType(item.type)) return null;
  return {
    name: item.name,
    name_en: item.name,
    symbol,
    provider_symbol: item.providerSymbol ?? item.symbol ?? null,
    market: item.market ?? null,
    asset_type: item.assetType ?? (item.type === 'fund' ? 'etf' : item.type === 'crypto' ? 'crypto' : 'stock'),
    currency: item.currency ?? item.nativeCurrency ?? null,
    price: item.lastPrice ?? item.currentPrice ?? null,
    updated_at: item.lastPriceUpdatedAt ?? null,
    source: item.dataSource ?? item.priceSource ?? '',
    search_source: 'saved_investment',
    available: typeof (item.lastPrice ?? item.currentPrice) === 'number' && Number.isFinite(item.lastPrice ?? item.currentPrice),
  };
}

function localizedAssetName(asset: AssetSearchItem, dir: 'rtl' | 'ltr') {
  if (dir === 'rtl') return asset.name_ar || asset.name || asset.name_en || asset.symbol;
  return asset.name_en || asset.name || asset.name_ar || asset.symbol;
}

function localizedMarketName(asset: AssetSearchItem, dir: 'rtl' | 'ltr') {
  if (dir === 'rtl') return asset.market_ar || asset.market || asset.market_en || '';
  return asset.market_en || asset.market || asset.market_ar || '';
}

function formatUpdatedAt(value: string | null | undefined) {
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

function TypeIcon({ type }: { type: InvestmentType }) {
  if (type === 'gold') return <Gem size={16} />;
  if (type === 'silver') return <Coins size={16} />;
  if (type === 'crypto') return <Coins size={16} />;
  if (type === 'project') return <FolderKanban size={16} />;
  if (type === 'realEstate') return <Home size={16} />;
  if (type === 'cash') return <Banknote size={16} />;
  return <Building2 size={16} />;
}

function assetSearchPrice(asset: AssetSearchItem, locale: string, unavailable: string) {
  if (asset.price === null || !asset.currency) return unavailable;
  return formatMarketPrice({
    price: asset.price,
    currency: asset.currency,
    symbol: asset.symbol,
    providerSymbol: asset.provider_symbol,
    exchange: asset.market_en ?? asset.market,
    market: asset.market_en ?? asset.market,
    assetType: asset.asset_type,
    locale,
    includeKuwaitDinarEquivalent: true,
  });
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
  const currencyInfo = useMemo(() => getCurrency(currency), [currency]);
  const accountCurrency = normalizedCurrency(currencyInfo.code || currency, 'KWD');
  const locale = dir === 'rtl' ? 'ar' : 'en';
  const currencyLocale: CurrencyLocale = locale === 'ar' ? 'ar' : 'en';

  const [type, setType] = useState<InvestmentType>('stocks');
  const [name, setName] = useState('');
  const [investmentCurrency, setInvestmentCurrency] = useState(accountCurrency);
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseTotalInput, setPurchaseTotalInput] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('residential');
  const [expectedMonthlyIncome, setExpectedMonthlyIncome] = useState('');
  const [expectedMonthlyExpense, setExpectedMonthlyExpense] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [metalUnit, setMetalUnit] = useState('bar');
  const [metalGrams, setMetalGrams] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchItem | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<MarketExchangeId | ''>('');
  const [searchResults, setSearchResults] = useState<AssetSearchItem[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [metals, setMetals] = useState<MetalsState>({
    state: 'idle',
    currency: accountCurrency,
    source: '',
    gold: null,
    silver: null,
  });
  const [fx, setFx] = useState<FxState>({ state: 'idle', from: '', to: '', rate: null });
  const [fxReloadKey, setFxReloadKey] = useState(0);

  const formCurrency = normalizedCurrency(investmentCurrency, accountCurrency);
  const currencyOptions = useMemo(() => {
    const seen = new Set<string>();
    return [getCurrency(accountCurrency), getCurrency(formCurrency), ...getCurrencyOptions(currencyLocale)]
      .filter(item => {
        const code = normalizedCurrency(item.code, '');
        if (!code || seen.has(code)) return false;
        seen.add(code);
        return true;
      });
  }, [accountCurrency, currencyLocale, formCurrency]);
  const selectedPrice = selectedAsset?.price ?? null;
  const hasLiveAssetPrice = selectedPrice !== null && Number.isFinite(selectedPrice) && selectedPrice > 0;
  const isMetal = type === 'gold' || type === 'silver';
  const isRealEstate = type === 'realEstate';
  const isCash = type === 'cash';
  const isProject = type === 'project';
  const isOther = type === 'other';
  const assetSearchType = type === 'fund' ? 'etf' : type === 'crypto' ? 'crypto' : type === 'stocks' ? 'stock' : undefined;
  const selectedMatchesName = Boolean(selectedAsset && name.trim() === localizedAssetName(selectedAsset, dir));
  const shouldSearchAssets = open && isMarketType(type);
  const searchPlaceholder = type === 'crypto'
    ? labels.cryptoSearchPlaceholder
    : type === 'fund'
      ? labels.fundSearchPlaceholder
      : labels.assetSearchPlaceholder;

  const quantityParsed = parseFormNumber(quantity);
  const purchaseUnitPriceParsed = parseFormNumber(purchasePrice);
  const purchaseTotalInputParsed = parseFormNumber(purchaseTotalInput);
  const manualCurrentUnitPriceParsed = parseFormNumber(currentPrice);
  const manualCurrentValueParsed = parseFormNumber(currentValue);
  const metalGramsParsed = parseFormNumber(metalGrams);
  const monthlyContributionParsed = parseFormNumber(monthlyContribution);
  const expectedReturnParsed = parseFormNumber(expectedReturn);
  const expectedMonthlyIncomeParsed = parseFormNumber(expectedMonthlyIncome);
  const expectedMonthlyExpenseParsed = parseFormNumber(expectedMonthlyExpense);
  const quantityValue = parsedValue(quantityParsed);
  const purchaseUnitPrice = parsedValue(purchaseUnitPriceParsed);
  const enteredPurchaseTotal = parsedValue(purchaseTotalInputParsed);
  const manualCurrentUnitPrice = parsedValue(manualCurrentUnitPriceParsed);
  const manualCurrentValue = parsedValue(manualCurrentValueParsed);
  const metalGramsValue = parsedValue(metalGramsParsed);
  const monthlyContributionValue = parsedValue(monthlyContributionParsed);
  const expectedReturnValue = parsedValue(expectedReturnParsed);
  const expectedMonthlyIncomeValue = parsedValue(expectedMonthlyIncomeParsed);
  const expectedMonthlyExpenseValue = parsedValue(expectedMonthlyExpenseParsed);
  const marketPurchaseUnitPrice = isMarketType(type)
    ? positiveParsedValue(purchaseUnitPriceParsed) ?? (
      quantityValue !== null && quantityValue > 0 && enteredPurchaseTotal !== null && enteredPurchaseTotal > 0
        ? enteredPurchaseTotal / quantityValue
        : null
    )
    : purchaseUnitPrice;
  const metalLivePrice = type === 'gold' ? metals.gold?.price ?? null : type === 'silver' ? metals.silver?.price ?? null : null;
  const metalLiveCurrency = normalizedCurrency(type === 'gold' ? metals.gold?.currency : type === 'silver' ? metals.silver?.currency : formCurrency, formCurrency);
  const effectiveLiveMetalPrice = metalLiveCurrency === formCurrency ? metalLivePrice : null;
  const unitPrice = isMarketType(type)
    ? hasLiveAssetPrice
      ? selectedPrice
      : manualCurrentUnitPrice
    : isMetal
      ? effectiveLiveMetalPrice && effectiveLiveMetalPrice > 0
        ? effectiveLiveMetalPrice
        : manualCurrentUnitPrice
      : null;
  const metalTotalGrams = isMetal && quantityValue !== null && quantityValue > 0 && metalGramsValue !== null && metalGramsValue > 0
    ? quantityValue * metalGramsValue
    : null;

  const marketPurchaseTotal = isMarketType(type)
    ? positiveProduct(quantityValue, positiveParsedValue(purchaseUnitPriceParsed)) ?? (enteredPurchaseTotal !== null && enteredPurchaseTotal > 0 ? enteredPurchaseTotal : null)
    : null;
  const marketCurrentValue = isMarketType(type) && quantityValue !== null && quantityValue > 0 && unitPrice !== null && unitPrice > 0
    ? quantityValue * unitPrice
    : null;
  const metalPurchaseTotal = isMetal && metalTotalGrams !== null && purchaseUnitPrice !== null && purchaseUnitPrice > 0
    ? metalTotalGrams * purchaseUnitPrice
    : null;
  const metalCurrentValue = isMetal && metalTotalGrams !== null && unitPrice !== null && unitPrice > 0
    ? metalTotalGrams * unitPrice
    : null;
  const realEstatePurchaseTotal = isRealEstate && purchaseUnitPrice !== null && purchaseUnitPrice > 0 ? purchaseUnitPrice : null;
  const realEstateCurrentValue = isRealEstate && manualCurrentValue !== null && manualCurrentValue > 0 ? manualCurrentValue : null;
  const cashAmount = isCash && manualCurrentValue !== null && manualCurrentValue > 0 ? manualCurrentValue : null;
  const projectCapital = isProject && purchaseUnitPrice !== null && purchaseUnitPrice > 0 ? purchaseUnitPrice : null;
  const projectNetProfit = isProject && expectedMonthlyIncomeValue !== null && expectedMonthlyExpenseValue !== null
    ? expectedMonthlyIncomeValue - expectedMonthlyExpenseValue
    : null;
  const otherPurchaseTotal = isOther && purchaseUnitPrice !== null && purchaseUnitPrice > 0 ? purchaseUnitPrice : null;
  const otherCurrentValue = isOther && manualCurrentValue !== null && manualCurrentValue > 0 ? manualCurrentValue : null;

  const purchaseTotal = marketPurchaseTotal
    ?? metalPurchaseTotal
    ?? realEstatePurchaseTotal
    ?? cashAmount
    ?? projectCapital
    ?? otherPurchaseTotal;
  const nativeCurrentValue = marketCurrentValue
    ?? metalCurrentValue
    ?? realEstateCurrentValue
    ?? cashAmount
    ?? projectCapital
    ?? otherCurrentValue
    ?? null;
  const nativeValueForFx = nativeCurrentValue ?? purchaseTotal;
  const profitLoss = purchaseTotal !== null && nativeCurrentValue !== null
    ? nativeCurrentValue - purchaseTotal
    : isProject
      ? projectNetProfit
      : null;
  const profitLossPercent = purchaseTotal !== null && purchaseTotal > 0 && nativeCurrentValue !== null
    ? (profitLoss! / purchaseTotal) * 100
    : null;
  const isSameAccountCurrency = formCurrency === accountCurrency;
  const convertedCurrentValue = nativeCurrentValue !== null
    ? isSameAccountCurrency
      ? nativeCurrentValue
      : fx.state === 'ready' && fx.rate !== null
        ? nativeCurrentValue * fx.rate
        : null
    : null;
  const convertedValueForSave = nativeValueForFx !== null
    ? isSameAccountCurrency
      ? nativeValueForFx
      : fx.state === 'ready' && fx.rate !== null
        ? nativeValueForFx * fx.rate
        : null
    : null;
  const convertedPurchaseTotal = purchaseTotal !== null
    ? isSameAccountCurrency
      ? purchaseTotal
      : fx.state === 'ready' && fx.rate !== null
        ? purchaseTotal * fx.rate
        : null
    : null;
  const summaryReady = purchaseTotal !== null && purchaseTotal > 0 && nativeCurrentValue !== null && nativeCurrentValue > 0;

  const resetCreateForm = useCallback((nextType: InvestmentType = 'stocks') => {
    setType(nextType);
    setName('');
    setInvestmentCurrency(accountCurrency);
    setQuantity('');
    setPurchasePrice('');
    setPurchaseTotalInput('');
    setCurrentPrice('');
    setCurrentValue('');
    setMonthlyContribution('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setRiskLevel('medium');
    setExpectedReturn('');
    setNotes('');
    setLocation('');
    setPropertyType('residential');
    setExpectedMonthlyIncome('');
    setExpectedMonthlyExpense('');
    setMaturityDate('');
    setMetalUnit('bar');
    setMetalGrams('');
    setErrors({});
    setSelectedAsset(null);
    setSelectedExchange('');
    setSearchResults([]);
    setSearchState('idle');
    setSearchMessage(null);
  }, [accountCurrency]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSearchResults([]);
    setSearchState('idle');
    setSearchMessage(null);

    if (mode === 'edit' && initialValues) {
      const nextType = initialValues.type || 'other';
      const initialMarketPurchaseTotal = initialValues.purchaseTotal
        ?? positiveProduct(initialValues.quantity, initialValues.purchasePrice)
        ?? undefined;
      const initialDirectPurchaseTotal = initialValues.purchaseTotal ?? initialValues.purchasePrice ?? initialValues.amount;
      const initialAsset = assetFromInvestment(initialValues);
      const initialCurrency = resolveFormCurrency({
        currency: initialValues.currency,
        nativeCurrency: initialValues.nativeCurrency,
        priceCurrency: initialValues.priceCurrency,
        market: initialValues.market,
        symbol: initialValues.symbol,
        providerSymbol: initialValues.providerSymbol,
        assetType: initialValues.assetType ?? nextType,
        fallback: accountCurrency,
      });
      setType(nextType);
      setName(initialValues.name || '');
      setInvestmentCurrency(initialCurrency);
      setQuantity(toInputNumber(initialValues.quantity, 10));
      setPurchasePrice(toInputNumber(nextType === 'realEstate' || nextType === 'project' || nextType === 'other'
        ? initialDirectPurchaseTotal
        : initialValues.purchasePrice, 10));
      setPurchaseTotalInput(toInputNumber(isMarketType(nextType) ? initialMarketPurchaseTotal : undefined, 10));
      setCurrentPrice(toInputNumber(initialValues.currentPrice ?? initialValues.lastPrice, 10));
      setCurrentValue(toInputNumber(initialValues.nativeMarketValue ?? initialValues.currentMarketValue ?? initialValues.currentValue, 10));
      setMonthlyContribution(toInputNumber(initialValues.monthlyContribution, 10));
      setStartDate(initialValues.startDate || new Date().toISOString().slice(0, 10));
      setRiskLevel(initialValues.riskLevel || 'medium');
      setExpectedReturn(initialValues.expectedAnnualReturn === undefined ? '' : toInputNumber(initialValues.expectedAnnualReturn, 4));
      setNotes(initialValues.notes || '');
      setLocation(initialValues.location || '');
      setPropertyType(initialValues.propertyType || 'residential');
      setExpectedMonthlyIncome(toInputNumber(initialValues.expectedMonthlyIncome, 10));
      setExpectedMonthlyExpense(toInputNumber(initialValues.expectedMonthlyExpense, 10));
      setMaturityDate(initialValues.maturityDate || '');
      setMetalUnit(initialValues.metalProductType || (nextType === 'silver' ? 'gram' : 'bar'));
      setMetalGrams(toInputNumber(initialValues.grams && initialValues.quantity ? initialValues.grams / initialValues.quantity : initialValues.grams, 10));
      setSelectedAsset(initialAsset);
      setSelectedExchange(normalizeMarketExchange(initialValues.market) ?? '');
      if (process.env.NODE_ENV === 'development') {
        console.log('[Investments] prefilled edit form values', {
          id: initialValues.id,
          name: initialValues.name,
          type: nextType,
          symbol: initialValues.symbol,
          providerSymbol: initialValues.providerSymbol,
          market: initialValues.market,
          currency: initialCurrency,
          quantity: initialValues.quantity,
          purchasePrice: initialValues.purchasePrice,
          purchaseTotal: initialMarketPurchaseTotal ?? initialDirectPurchaseTotal,
          currentPrice: initialValues.currentPrice ?? initialValues.lastPrice,
          startDate: initialValues.startDate,
          hasSelectedAsset: Boolean(initialAsset),
        });
      }
      return;
    }

    resetCreateForm('stocks');
  }, [accountCurrency, initialValues, mode, open, resetCreateForm]);

  useEffect(() => {
    if (!open || !shouldSearchAssets) return;
    const query = name.trim();
    if (query.length < 2 || selectedMatchesName) {
      setSearchResults([]);
      setSearchState('idle');
      setSearchMessage(null);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearchState('loading');
      try {
        const params = new URLSearchParams({ q: query });
        if (assetSearchType) params.set('assetType', assetSearchType);
        if (selectedExchange) params.set('exchange', selectedExchange);
        const response = await fetch(`/api/market/search-assets?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json() as { ok?: boolean; items?: AssetSearchItem[]; message?: string };
        if (cancelled) return;
        if (!response.ok || payload.ok === false) {
          setSearchResults([]);
          setSearchState('error');
          setSearchMessage(null);
          return;
        }
        setSearchResults(Array.isArray(payload.items) ? payload.items : []);
        setSearchMessage(payload.message ?? null);
        setSearchState('ready');
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setSearchState('error');
          setSearchMessage(null);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [assetSearchType, name, open, selectedExchange, selectedMatchesName, shouldSearchAssets]);

  useEffect(() => {
    if (!open || !isMetal) return;
    let cancelled = false;

    async function loadMetals() {
      setMetals(prev => ({ ...prev, state: 'loading', message: undefined }));
      const targets = Array.from(new Set([formCurrency, accountCurrency, 'USD']));
      for (const target of targets) {
        try {
          const response = await fetch(`/api/market/metals?currency=${encodeURIComponent(target)}`, { cache: 'no-store' });
          const payload = await response.json() as {
            success?: boolean;
            source?: string;
            gold?: MetalPrice;
            silver?: MetalPrice;
          };
          const gold = payload.gold?.price && payload.gold.price > 0 ? payload.gold : null;
          const silver = payload.silver?.price && payload.silver.price > 0 ? payload.silver : null;
          if (!cancelled && response.ok && payload.success && payload.source !== 'mock' && gold && silver) {
            setMetals({
              state: 'ready',
              currency: normalizedCurrency(gold.currency || silver.currency, target),
              source: payload.source || '',
              gold,
              silver,
            });
            return;
          }
        } catch {
          // Try the next real currency target before surfacing an error.
        }
      }

      if (!cancelled) {
        setMetals({
          state: 'error',
          currency: formCurrency,
          source: '',
          gold: null,
          silver: null,
          message: labels.metalsPriceUnavailable,
        });
      }
    }

    void loadMetals();
    return () => {
      cancelled = true;
    };
  }, [accountCurrency, formCurrency, isMetal, labels.metalsPriceUnavailable, open]);

  useEffect(() => {
    if (!open || !nativeValueForFx || nativeValueForFx <= 0) {
      setFx({ state: 'idle', from: '', to: '', rate: null });
      return;
    }
    if (isSameAccountCurrency) {
      setFx({
        state: 'ready',
        from: formCurrency,
        to: accountCurrency,
        rate: 1,
        source: 'same_currency',
        lastUpdated: new Date().toISOString(),
      });
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setFx({ state: 'loading', from: formCurrency, to: accountCurrency, rate: null });
      try {
        const params = new URLSearchParams({ from: formCurrency, to: accountCurrency });
        const response = await fetch(`/api/market/fx/rate?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json() as {
          ok?: boolean;
          rate?: number | null;
          source?: string | null;
          lastUpdated?: string | null;
          error?: string;
        };
        if (cancelled) return;
        const rate = Number(payload.rate);
        if (!response.ok || payload.ok === false || !Number.isFinite(rate) || rate <= 0) {
          setFx({ state: 'error', from: formCurrency, to: accountCurrency, rate: null, message: payload.error || labels.fxUnavailable });
          return;
        }
        setFx({
          state: 'ready',
          from: formCurrency,
          to: accountCurrency,
          rate,
          source: payload.source || 'FX provider',
          lastUpdated: payload.lastUpdated || new Date().toISOString(),
        });
      } catch {
        if (!cancelled) setFx({ state: 'error', from: formCurrency, to: accountCurrency, rate: null, message: labels.fxUnavailable });
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [accountCurrency, formCurrency, fxReloadKey, isSameAccountCurrency, labels.fxUnavailable, nativeValueForFx, open]);

  useEffect(() => {
    if (!isMetal) return;
    const grams = type === 'gold' ? GOLD_PRODUCT_GRAMS[metalUnit] : SILVER_PRODUCT_GRAMS[metalUnit];
    if (grams !== undefined && grams !== null) setMetalGrams(toInputNumber(grams, 6));
  }, [isMetal, metalUnit, type]);

  function buildErrors() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = labels.errors.nameRequired;
    if (!startDate) nextErrors.startDate = labels.errors.startDateRequired;
    const marketQuantity = positiveParsedValue(quantityParsed);
    const purchasePricePositive = positiveParsedValue(purchaseUnitPriceParsed);
    const purchaseTotalPositive = positiveParsedValue(purchaseTotalInputParsed);

    function validatePositiveNumber(key: string, parsed: ParsedFormNumber, requiredMessage: string) {
      if (parsed.status === 'invalid') {
        nextErrors[key] = labels.errors.numericInvalid;
        return false;
      }
      if (parsed.value === null || parsed.value <= 0) {
        nextErrors[key] = requiredMessage;
        return false;
      }
      return true;
    }

    if (isMarketType(type)) {
      if (!selectedAsset) nextErrors.asset = labels.errors.assetRequired;
      if (quantityParsed.status === 'invalid') nextErrors.quantity = labels.errors.numericInvalid;
      else if (marketQuantity === null) nextErrors.quantity = labels.errors.quantityRequired;

      const hasPurchasePriceInput = hasInputValue(purchasePrice);
      const hasPurchaseTotalCostInput = hasInputValue(purchaseTotalInput);
      if (hasPurchasePriceInput && !validatePositiveNumber('purchasePrice', purchaseUnitPriceParsed, labels.errors.purchasePriceRequired)) {
        nextErrors.purchasePrice = purchaseUnitPriceParsed.status === 'invalid' ? labels.errors.numericInvalid : labels.errors.purchasePriceRequired;
      }
      if (hasPurchaseTotalCostInput && !validatePositiveNumber('purchaseTotal', purchaseTotalInputParsed, labels.errors.purchasePriceRequired)) {
        nextErrors.purchaseTotal = purchaseTotalInputParsed.status === 'invalid' ? labels.errors.numericInvalid : labels.errors.purchasePriceRequired;
      }
      if (purchasePricePositive === null && purchaseTotalPositive === null && !nextErrors.purchasePrice && !nextErrors.purchaseTotal) {
        nextErrors.purchaseBasis = labels.errors.purchaseBasisRequired;
        nextErrors.purchasePrice = labels.errors.purchaseBasisRequired;
        nextErrors.purchaseTotal = labels.errors.purchaseBasisRequired;
      }
      if (hasInputValue(currentPrice)) validatePositiveNumber('currentPrice', manualCurrentUnitPriceParsed, labels.errors.valuePositive);
    }

    if (isMetal) {
      validatePositiveNumber('quantity', quantityParsed, labels.errors.quantityPositive);
      validatePositiveNumber('grams', metalGramsParsed, labels.errors.gramsPositive);
      validatePositiveNumber('purchasePrice', purchaseUnitPriceParsed, labels.errors.purchasePriceRequired);
      if (hasInputValue(currentPrice)) validatePositiveNumber('currentPrice', manualCurrentUnitPriceParsed, labels.errors.valuePositive);
    }

    if (isRealEstate) {
      validatePositiveNumber('purchasePrice', purchaseUnitPriceParsed, labels.errors.purchasePriceRequired);
      validatePositiveNumber('currentValue', manualCurrentValueParsed, labels.errors.currentValueRequired);
    }

    if (isCash) {
      validatePositiveNumber('currentValue', manualCurrentValueParsed, labels.errors.valuePositive);
    }

    if (isProject) {
      validatePositiveNumber('purchasePrice', purchaseUnitPriceParsed, labels.errors.purchasePriceRequired);
      if (expectedMonthlyIncomeParsed.status === 'invalid') nextErrors.expectedMonthlyIncome = labels.errors.numericInvalid;
      else if (expectedMonthlyIncomeValue !== null && expectedMonthlyIncomeValue < 0) nextErrors.expectedMonthlyIncome = labels.errors.valuePositive;
      if (expectedMonthlyExpenseParsed.status === 'invalid') nextErrors.expectedMonthlyExpense = labels.errors.numericInvalid;
      else if (expectedMonthlyExpenseValue !== null && expectedMonthlyExpenseValue < 0) nextErrors.expectedMonthlyExpense = labels.errors.expensePositive;
    }

    if (isOther) {
      validatePositiveNumber('purchasePrice', purchaseUnitPriceParsed, labels.errors.purchasePriceRequired);
      validatePositiveNumber('currentValue', manualCurrentValueParsed, labels.errors.currentValueRequired);
    }

    if (monthlyContributionParsed.status === 'invalid') nextErrors.monthlyContribution = labels.errors.numericInvalid;
    else if (monthlyContributionValue !== null && monthlyContributionValue < 0) nextErrors.monthlyContribution = labels.errors.contributionPositive;
    if (expectedReturnParsed.status === 'invalid') nextErrors.expectedReturn = labels.errors.numericInvalid;
    else if (expectedReturnValue !== null && (expectedReturnValue < -100 || expectedReturnValue > 1000)) nextErrors.expectedReturn = labels.errors.returnRange;
    if (nativeValueForFx !== null && nativeValueForFx > 0 && !isSameAccountCurrency && (fx.state !== 'ready' || fx.rate === null)) {
      nextErrors.fx = labels.errors.fxRequired;
    }
    return nextErrors;
  }

  function validate() {
    const nextErrors = buildErrors();
    setErrors(nextErrors);
    if (process.env.NODE_ENV === 'development') {
      console.log('[Investments] form validation result', {
        mode,
        valid: Object.keys(nextErrors).length === 0,
        disabledReasons: Array.from(new Set(Object.values(nextErrors))),
        formValues: {
          type,
          name,
          currency: formCurrency,
          quantity,
          purchasePrice,
          purchaseTotal: purchaseTotalInput,
          currentPrice,
          monthlyContribution,
          expectedReturn,
          startDate,
        },
      });
    }
    return Object.keys(nextErrors).length === 0;
  }

  function handleTypeChange(nextType: InvestmentType) {
    setType(nextType);
    setErrors({});
    setSearchResults([]);
    setSearchState('idle');
    setSearchMessage(null);
    setSelectedAsset(null);
    if (!isMarketType(nextType) || nextType === 'crypto') setSelectedExchange('');
    setQuantity('');
    setPurchasePrice('');
    setPurchaseTotalInput('');
    setCurrentPrice('');
    setCurrentValue('');
    setLocation('');
    setExpectedMonthlyIncome('');
    setExpectedMonthlyExpense('');
    setMaturityDate('');
    setNotes('');
    if (nextType === 'gold') {
      setName(labels.goldUnits.bar || typeLabel(nextType));
      setMetalUnit('bar');
      setQuantity('1');
      setMetalGrams('');
    } else if (nextType === 'silver') {
      setName(labels.silverUnits.gram || typeLabel(nextType));
      setMetalUnit('gram');
      setQuantity('1');
      setMetalGrams('1');
    } else {
      setName('');
      setMetalUnit('bar');
      setMetalGrams('');
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    const shouldKeepSavedAsset = mode === 'edit' && selectedAsset?.search_source === 'saved_investment';
    if (!shouldKeepSavedAsset && selectedAsset && value.trim() !== localizedAssetName(selectedAsset, dir)) {
      setSelectedAsset(null);
      setCurrentPrice('');
    }
  }

  function handleExchangeChange(value: string) {
    const nextExchange = normalizeMarketExchange(value) ?? '';
    setSelectedExchange(nextExchange);
    setSelectedAsset(null);
    setSearchResults([]);
    setSearchState('idle');
    setSearchMessage(null);
    setCurrentPrice('');
  }

  function handleSelectAsset(asset: AssetSearchItem) {
    const localizedName = localizedAssetName(asset, dir);
    setSelectedAsset(asset);
    setName(localizedName);
    setType(assetInvestmentType(asset.asset_type));
    setInvestmentCurrency(normalizedCurrency(asset.currency, accountCurrency));
    setSelectedExchange(normalizeMarketExchange(asset.market_en ?? asset.market) ?? selectedExchange);
    setSearchResults([]);
    setSearchState('idle');
    setSearchMessage(null);
    setCurrentPrice('');
    if (!notes.trim()) setNotes(labels.fetchedPriceNote);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    const monthlyContributionForSave = monthlyContributionParsed.status === 'valid' ? monthlyContributionParsed.value : undefined;
    const expectedReturnForSave = expectedReturnParsed.status === 'valid' ? expectedReturnParsed.value : undefined;
    const expectedMonthlyIncomeForSave = expectedMonthlyIncomeParsed.status === 'valid' ? expectedMonthlyIncomeParsed.value : undefined;
    const expectedMonthlyExpenseForSave = expectedMonthlyExpenseParsed.status === 'valid' ? expectedMonthlyExpenseParsed.value : undefined;
    const purchaseUnitPriceForSave = isMarketType(type) ? marketPurchaseUnitPrice : purchaseUnitPrice;
    const nativeValue = nativeCurrentValue ?? purchaseTotal ?? 0;
    const accountValue = convertedValueForSave ?? nativeValue;
    const addAnother = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === 'another';
    const marketOrMetalUnitPrice = unitPrice ?? undefined;
    const savedSymbol = mode === 'edit' ? initialValues?.symbol : undefined;
    const savedProviderSymbol = mode === 'edit' ? initialValues?.providerSymbol : undefined;
    const savedMarket = mode === 'edit' ? initialValues?.market : undefined;
    const savedAssetType = mode === 'edit' ? initialValues?.assetType : undefined;
    const resolvedSymbol = selectedAsset?.symbol ?? savedSymbol;
    const resolvedProviderSymbol = selectedAsset?.provider_symbol ?? savedProviderSymbol;
    const resolvedMarket = selectedAsset ? localizedMarketName(selectedAsset, dir) : savedMarket;
    const resolvedAssetType = selectedAsset?.asset_type ?? savedAssetType ?? (isMetal ? 'commodity' : type);
    const resolvedCurrency = resolveFormCurrency({
      currency: formCurrency,
      market: resolvedMarket,
      symbol: resolvedSymbol,
      providerSymbol: resolvedProviderSymbol,
      assetType: resolvedAssetType,
      fallback: accountCurrency,
    });
    const priceSource = isMetal
      ? metals.source || initialValues?.priceSource || initialValues?.dataSource || undefined
      : selectedAsset?.source ?? initialValues?.priceSource ?? initialValues?.dataSource;
    const lastUpdated = isMetal
      ? type === 'gold'
        ? metals.gold?.lastUpdated ?? initialValues?.lastPriceUpdatedAt
        : metals.silver?.lastUpdated ?? initialValues?.lastPriceUpdatedAt
      : selectedAsset?.updated_at ?? initialValues?.lastPriceUpdatedAt ?? initialValues?.valuationLastUpdatedAt ?? undefined;

    const input: InvestmentInput = {
      name: name.trim(),
      type,
      currentValue: accountValue,
      amount: accountValue,
      monthlyContribution: monthlyContributionForSave ?? (mode === 'edit' ? initialValues?.monthlyContribution : undefined) ?? 0,
      startDate,
      riskLevel,
      expectedAnnualReturn: expectedReturnForSave ?? undefined,
      notes: notes.trim() || undefined,
      symbol: resolvedSymbol,
      providerSymbol: resolvedProviderSymbol,
      market: resolvedMarket,
      assetType: resolvedAssetType,
      currency: resolvedCurrency,
      quantity: (isMarketType(type) || isMetal) && quantityValue !== null ? quantityValue : undefined,
      unit: isMetal ? metalUnit : undefined,
      purchasePrice: purchaseUnitPriceForSave ?? undefined,
      purchaseTotal: purchaseTotal ?? undefined,
      currentPrice: marketOrMetalUnitPrice,
      currentMarketValue: nativeCurrentValue ?? undefined,
      profitLoss: profitLoss ?? undefined,
      profitLossPercent: profitLossPercent ?? undefined,
      defaultCurrencyValue: convertedCurrentValue ?? convertedValueForSave ?? undefined,
      priceCurrency: resolvedCurrency,
      nativeCurrency: resolvedCurrency,
      nativeUnitPrice: marketOrMetalUnitPrice,
      nativeMarketValue: nativeCurrentValue ?? nativeValue,
      userCurrency: accountCurrency,
      fxRateToUserCurrency: isSameAccountCurrency ? 1 : fx.rate ?? undefined,
      convertedMarketValue: convertedCurrentValue ?? convertedValueForSave ?? undefined,
      fxSource: isSameAccountCurrency ? 'same_currency' : fx.source ?? undefined,
      fxLastUpdatedAt: isSameAccountCurrency ? new Date().toISOString() : fx.lastUpdated ?? undefined,
      valuationSource: priceSource,
      valuationLastUpdatedAt: lastUpdated,
      lastPrice: marketOrMetalUnitPrice,
      lastPriceUpdatedAt: lastUpdated,
      dataSource: priceSource,
      location: location.trim() || undefined,
      propertyType: isRealEstate ? propertyType : undefined,
      expectedMonthlyIncome: expectedMonthlyIncomeForSave ?? undefined,
      expectedMonthlyExpense: expectedMonthlyExpenseForSave ?? undefined,
      maturityDate: isCash && maturityDate ? maturityDate : undefined,
      metalType: type === 'gold' ? 'gold' : type === 'silver' ? 'silver' : undefined,
      metalProductType: isMetal ? metalUnit : undefined,
      grams: metalTotalGrams ?? undefined,
      pureMetalGrams: metalTotalGrams ?? undefined,
      priceSource,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('[Investments] form values before save', {
        mode,
        type: input.type,
        name: input.name,
        symbol: input.symbol,
        providerSymbol: input.providerSymbol,
        market: input.market,
        currency: input.currency,
        quantity: input.quantity,
        purchasePrice: input.purchasePrice,
        purchaseTotal: input.purchaseTotal,
        currentPrice: input.currentPrice,
        currentMarketValue: input.currentMarketValue,
        lastPriceUpdatedAt: input.lastPriceUpdatedAt,
        hasSelectedAsset: Boolean(selectedAsset),
      });
    }

    await onSave(input, { addAnother });
    if (addAnother && mode === 'create') resetCreateForm(type);
  }

  if (!open) return null;

  const searchOpen = shouldSearchAssets && name.trim().length >= 2 && !selectedMatchesName && searchState !== 'idle';
  const validationErrors = buildErrors();
  const validationMessages = Array.from(new Set(Object.values(validationErrors)));
  const saveDisabled = saving || validationMessages.length > 0;
  const primaryButtonText = saving
    ? mode === 'create'
      ? labels.saving
      : labels.updating
    : mode === 'create'
      ? labels.save
      : labels.update;
  const nativeValueText = nativeCurrentValue !== null
    ? formatMarketPrice({ price: nativeCurrentValue, currency: formCurrency, locale })
    : labels.unavailable;
  const accountValueText = convertedCurrentValue !== null
    ? formatMarketPrice({ price: convertedCurrentValue, currency: accountCurrency, locale })
    : labels.unavailable;
  const purchaseValueText = purchaseTotal !== null
    ? formatMarketPrice({ price: purchaseTotal, currency: formCurrency, locale })
    : labels.unavailable;
  const profitText = profitLoss !== null
    ? formatMarketPrice({ price: profitLoss, currency: isProject ? formCurrency : formCurrency, locale })
    : labels.unavailable;
  const activePriceHint = (isMarketType(type) && hasLiveAssetPrice) || (isMetal && effectiveLiveMetalPrice)
    ? labels.livePriceHint
    : labels.manualPriceHint;
  const selectedUnitSymbol = selectedAsset?.symbol || (type === 'crypto' ? 'BTC' : labels.assetTypes[assetSearchType ?? 'stock'] ?? '');
  const marketQuantityLabel = type === 'fund'
    ? labels.numberOfUnits
    : type === 'crypto'
      ? labels.assetQuantity
      : labels.quantity;
  const marketQuantityHelper = type === 'crypto'
    ? labels.cryptoQuantityHelper.replace('{symbol}', selectedUnitSymbol)
    : labels.quantityHelper;
  const purchaseUnitLabel = type === 'fund'
    ? labels.purchasePricePerUnit
    : type === 'crypto'
      ? labels.purchasePricePerCoin
      : labels.purchasePricePerShare;
  const currentUnitLabel = type === 'fund'
    ? labels.currentPricePerUnit
    : type === 'crypto'
      ? labels.currentPricePerCoin
      : labels.currentPricePerShare;
  const purchaseUnitHelper = type === 'crypto'
    ? labels.cryptoPurchasePriceHelper.replace('{symbol}', selectedUnitSymbol)
    : undefined;
  const purchaseTotalHelper = type === 'crypto'
    ? labels.cryptoPurchaseTotalHelper
    : labels.purchaseTotalHelper;

  return (
    <div className="invest-overlay" role="presentation" onMouseDown={onClose}>
      <div className="invest-modal invest-modal--asset" role="dialog" aria-modal="true" aria-labelledby="invest-modal-title" onMouseDown={event => event.stopPropagation()}>
        <div className="invest-modal-head invest-modal-head--asset">
          <div>
            <h2 id="invest-modal-title">{mode === 'create' ? labels.titleAdd : labels.titleEdit}</h2>
            <p>{labels.subtitle}</p>
          </div>
          <button type="button" className="invest-icon-btn" onClick={onClose} aria-label={labels.close}>
            <X size={18} />
          </button>
        </div>

        <form className="invest-form invest-form--asset" onSubmit={handleSubmit} noValidate>
          <FormSection title={labels.sectionAssetType} icon={<Building2 size={17} />} />
          <div className="invest-type-grid span-2">
            {typeOptions.map(option => (
              <button
                type="button"
                key={option}
                className={type === option ? 'selected' : ''}
                onClick={() => handleTypeChange(option)}
              >
                <TypeIcon type={option} />
                <span>{typeLabel(option)}</span>
              </button>
            ))}
          </div>

          <FormSection title={labels.sectionAssetDetails} icon={<CheckCircle2 size={17} />} />
          {isMarketType(type) ? (
            <>
              {type !== 'crypto' && (
                <Field label={labels.exchange} className="span-2">
                  <select value={selectedExchange} onChange={event => handleExchangeChange(event.target.value)}>
                    <option value="">{labels.exchangeAll}</option>
                    {MARKET_EXCHANGE_OPTIONS.map(option => (
                      <option key={option.id} value={option.id}>
                        {dir === 'rtl' ? option.labelAr : option.labelEn}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label={labels.name} error={errors.name || errors.asset} required className="span-2">
                <div className="invest-asset-search">
                  <div className="invest-input-icon">
                    <Search size={16} />
                    <input value={name} onChange={event => handleNameChange(event.target.value)} placeholder={searchPlaceholder} autoFocus />
                  </div>
                  {!selectedAsset && name.trim().length >= 2 && <em>{labels.searchMustSelect}</em>}
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
                          <strong>{searchMessage === 'SYMBOLS_SYNCING' ? labels.symbolsSyncing : labels.assetSearchNoResultsTitle}</strong>
                          <span>{labels.assetSearchNoResultsBody}</span>
                          {selectedAsset?.search_source === 'saved_investment' && (
                            <span>{labels.savedAssetMissingFromDirectory}</span>
                          )}
                        </div>
                      )}
                      {searchState === 'ready' && searchResults.map(asset => (
                        <button key={`${asset.symbol}:${asset.provider_symbol ?? asset.asset_type}:${asset.name_en ?? asset.name}`} type="button" className="invest-asset-result" onClick={() => handleSelectAsset(asset)}>
                          <AssetIdentity className="invest-asset-result-icon" symbol={asset.symbol} name={localizedAssetName(asset, dir)} assetType={asset.asset_type} exchange={asset.market ?? undefined} size="sm" decorative />
                          <span className="invest-asset-result-body">
                            <strong>{localizedAssetName(asset, dir)}</strong>
                            <small>
                              <b dir="ltr">{asset.symbol}</b>
                              {' · '}
                              {localizedMarketName(asset, dir) || asset.country || labels.unavailable}
                              {' · '}
                              {labels.assetTypes[asset.asset_type] ?? asset.asset_type}
                              {' · '}
                              {asset.currency || labels.unavailable}
                            </small>
                          </span>
                          <span className="invest-asset-result-price" dir="ltr">
                            {assetSearchPrice(asset, locale, labels.unavailable)}
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
                    <AssetIdentity symbol={selectedAsset.symbol} name={localizedAssetName(selectedAsset, dir)} assetType={selectedAsset.asset_type} exchange={selectedAsset.market ?? undefined} size="md" decorative />
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
                    <strong dir="ltr">{assetSearchPrice(selectedAsset, locale, labels.unavailable)}</strong>
                    <small>{labels.lastUpdated}: {formatUpdatedAt(selectedAsset.updated_at) || labels.unavailable}</small>
                  </div>
                  <div>
                    <span>{labels.dataSource}</span>
                    <strong>{selectedAsset.source || labels.unavailable}</strong>
                    <small>{selectedAsset.available ? labels.currentPrice : labels.unavailable}</small>
                  </div>
                </div>
              )}

              <Field label={labels.symbolRequired} required>
                <input value={selectedAsset?.symbol ?? ''} readOnly dir="ltr" />
              </Field>
              <Field label={type === 'crypto' ? labels.marketSource : labels.marketOptional}>
                <input value={selectedAsset ? localizedMarketName(selectedAsset, dir) || 'Crypto' : type === 'crypto' ? 'Crypto' : ''} readOnly />
              </Field>
            </>
          ) : (
            <>
              <Field
                label={isRealEstate ? labels.propertyName : isCash ? labels.cashName : isProject ? labels.projectName : labels.name}
                error={errors.name}
                required
              >
                <input value={name} onChange={event => setName(event.target.value)} placeholder={labels.namePlaceholder} autoFocus />
              </Field>
              {isRealEstate && (
                <Field label={labels.propertyLocation}>
                  <input value={location} onChange={event => setLocation(event.target.value)} />
                </Field>
              )}
              {isRealEstate && (
                <Field label={labels.propertyType}>
                  <select value={propertyType} onChange={event => setPropertyType(event.target.value)}>
                    {Object.entries(labels.propertyTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
              )}
            </>
          )}

          <Field label={labels.investmentCurrency} required>
            <select value={formCurrency} onChange={event => setInvestmentCurrency(event.target.value)}>
              {currencyOptions.map(item => (
                <option key={item.code} value={item.code}>{item.code} - {currencyDisplayName(item, currencyLocale)}</option>
              ))}
            </select>
          </Field>

          <FormSection title={labels.sectionQuantityCost} icon={<Coins size={17} />} />

          {isMarketType(type) && (
            <>
              <Field label={marketQuantityLabel} error={errors.quantity} helper={marketQuantityHelper} required>
                <input type="number" min="0" step="any" value={quantity} onChange={event => setQuantity(event.target.value)} dir="ltr" inputMode="decimal" />
              </Field>
              <Field label={purchaseUnitLabel} error={errors.purchasePrice} helper={purchaseUnitHelper}>
                <MoneyInput currency={formCurrency} value={purchasePrice} onChange={setPurchasePrice} />
              </Field>
              <Field label={labels.purchaseTotal} error={errors.purchaseTotal || errors.purchaseBasis} helper={purchaseTotalHelper}>
                <MoneyInput currency={formCurrency} value={purchaseTotalInput} onChange={setPurchaseTotalInput} />
              </Field>
              {hasLiveAssetPrice ? (
                <ReadonlyMoney label={currentUnitLabel} currency={formCurrency} value={selectedPrice!} helper={labels.livePriceHint} />
              ) : (
                <Field label={currentUnitLabel} error={errors.currentPrice} helper={activePriceHint}>
                  <MoneyInput currency={formCurrency} value={currentPrice} onChange={setCurrentPrice} />
                </Field>
              )}
              <ReadonlyMoney label={labels.summaryPurchaseTotal} currency={formCurrency} value={marketPurchaseTotal} />
              <ReadonlyMoney label={labels.currentMarketValue} currency={formCurrency} value={marketCurrentValue} />
            </>
          )}

          {isMetal && (
            <>
              <Field label={type === 'gold' ? labels.goldProductType : labels.silverProductType} required>
                <select value={metalUnit} onChange={event => setMetalUnit(event.target.value)}>
                  {Object.entries(type === 'gold' ? labels.goldUnits : labels.silverUnits).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label={labels.grams} error={errors.grams} required>
                <input type="number" min="0" step="any" value={metalGrams} onChange={event => setMetalGrams(event.target.value)} dir="ltr" inputMode="decimal" />
              </Field>
              <Field label={labels.metalCount || labels.count} error={errors.quantity} required>
                <input type="number" min="0" step="any" value={quantity} onChange={event => setQuantity(event.target.value)} dir="ltr" inputMode="decimal" />
              </Field>
              <Field label={labels.purchasePricePerGram} error={errors.purchasePrice} required>
                <MoneyInput currency={formCurrency} value={purchasePrice} onChange={setPurchasePrice} />
              </Field>
              {effectiveLiveMetalPrice && effectiveLiveMetalPrice > 0 ? (
                <ReadonlyMoney label={labels.currentPricePerGram} currency={formCurrency} value={effectiveLiveMetalPrice} helper={labels.livePriceHint} />
              ) : (
                <Field label={labels.currentPricePerGram} error={errors.currentPrice} helper={metals.state === 'loading' ? labels.metalsPriceLoading : labels.manualPriceHint}>
                  <MoneyInput currency={formCurrency} value={currentPrice} onChange={setCurrentPrice} />
                </Field>
              )}
              {metals.state === 'error' && (
                <div className="invest-price-unavailable span-2">
                  <AlertCircle size={17} />
                  <span>{metals.message || labels.metalsPriceUnavailable}</span>
                </div>
              )}
              <ReadonlyMoney label={labels.purchaseTotal} currency={formCurrency} value={metalPurchaseTotal} />
              <ReadonlyMoney label={labels.currentMarketValue} currency={formCurrency} value={metalCurrentValue} />
            </>
          )}

          {isRealEstate && (
            <>
              <Field label={labels.propertyPurchasePrice} error={errors.purchasePrice} required>
                <MoneyInput currency={formCurrency} value={purchasePrice} onChange={setPurchasePrice} />
              </Field>
              <Field label={labels.propertyCurrentValue} error={errors.currentValue} required>
                <MoneyInput currency={formCurrency} value={currentValue} onChange={setCurrentValue} />
              </Field>
              <Field label={labels.propertyMonthlyIncome}>
                <MoneyInput currency={formCurrency} value={expectedMonthlyIncome} onChange={setExpectedMonthlyIncome} />
              </Field>
            </>
          )}

          {isCash && (
            <>
              <Field label={labels.cashAmount} error={errors.currentValue} required>
                <MoneyInput currency={formCurrency} value={currentValue} onChange={setCurrentValue} />
              </Field>
              <Field label={labels.annualYield} error={errors.expectedReturn}>
                <PercentInput value={expectedReturn} onChange={setExpectedReturn} />
              </Field>
              <Field label={labels.maturityDate}>
                <input type="date" value={maturityDate} onChange={event => setMaturityDate(event.target.value)} />
              </Field>
            </>
          )}

          {isProject && (
            <>
              <Field label={labels.projectCapital} error={errors.purchasePrice} required>
                <MoneyInput currency={formCurrency} value={purchasePrice} onChange={setPurchasePrice} />
              </Field>
              <Field label={labels.projectMonthlyIncome} error={errors.expectedMonthlyIncome}>
                <MoneyInput currency={formCurrency} value={expectedMonthlyIncome} onChange={setExpectedMonthlyIncome} />
              </Field>
              <Field label={labels.projectMonthlyExpense} error={errors.expectedMonthlyExpense}>
                <MoneyInput currency={formCurrency} value={expectedMonthlyExpense} onChange={setExpectedMonthlyExpense} />
              </Field>
              <ReadonlyMoney label={labels.projectNetProfit} currency={formCurrency} value={projectNetProfit} />
            </>
          )}

          {isOther && (
            <>
              <Field label={labels.otherAmount} error={errors.purchasePrice} required>
                <MoneyInput currency={formCurrency} value={purchasePrice} onChange={setPurchasePrice} />
              </Field>
              <Field label={labels.otherCurrentValue} error={errors.currentValue} required>
                <MoneyInput currency={formCurrency} value={currentValue} onChange={setCurrentValue} />
              </Field>
            </>
          )}

          <InvestmentSummary
            labels={labels}
            ready={summaryReady}
            purchaseValueText={purchaseValueText}
            nativeValueText={nativeValueText}
            profitText={profitText}
            profitPercent={profitLossPercent}
            currency={formCurrency}
            accountCurrency={accountCurrency}
            accountValueText={accountValueText}
            showAccountValue={!isSameAccountCurrency}
            fxState={fx}
            onRetryFx={() => setFxReloadKey(key => key + 1)}
          />
          {errors.fx && <div className="invest-inline-alert span-2"><AlertCircle size={16} /> {errors.fx}</div>}

          <FormSection title={labels.sectionExtraDetails} icon={<Banknote size={17} />} />
          {!isCash && (
            <Field label={labels.expectedReturn} error={errors.expectedReturn}>
              <PercentInput value={expectedReturn} onChange={setExpectedReturn} />
            </Field>
          )}
          <Field label={labels.monthly} error={errors.monthlyContribution}>
            <MoneyInput currency={formCurrency} value={monthlyContribution} onChange={setMonthlyContribution} />
          </Field>
          <Field label={labels.startDate} error={errors.startDate} required>
            <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
          </Field>
          <Field label={labels.risk} required>
            <select value={riskLevel} onChange={event => setRiskLevel(event.target.value as RiskLevel)}>
              {riskOptions.map(option => <option key={option} value={option}>{riskLabel(option)}</option>)}
            </select>
          </Field>
          <Field label={labels.notes} className="span-2">
            <textarea value={notes} onChange={event => setNotes(event.target.value)} />
          </Field>

          {validationMessages.length > 0 && (
            <div className="invest-validation-summary span-2" role="alert">
              <AlertCircle size={17} />
              <div>
                <strong>{labels.validationSummary}</strong>
                {validationMessages.map(message => (
                  <span key={message}>{message}</span>
                ))}
              </div>
            </div>
          )}

          <div className="invest-form-actions invest-form-actions--sticky span-2">
            <button type="button" className="invest-secondary-btn" onClick={onClose} disabled={saving}>
              {labels.cancel}
            </button>
            {mode === 'create' && (
              <button type="submit" className="invest-secondary-btn" value="another" disabled={saveDisabled}>
                {saving && <Loader2 size={16} className="invest-spin" />}
                {labels.saveAnother}
              </button>
            )}
            <button type="submit" className="invest-primary-btn" value="close" disabled={saveDisabled}>
              {saving && <Loader2 size={16} className="invest-spin" />}
              {primaryButtonText}
            </button>
          </div>
        </form>

        <style jsx>{`
          .invest-modal--asset {
            width: min(900px, 100%);
          }
          :global(.dark) .invest-overlay {
            background: rgba(2, 8, 23, .68);
          }
          :global(.dark) .invest-modal--asset {
            background: #0b1728;
            border-color: rgba(103, 232, 249, .18);
            box-shadow: 0 30px 90px rgba(0, 0, 0, .58);
          }
          .invest-modal-head--asset {
            align-items: flex-start;
            background: linear-gradient(135deg, rgba(248, 251, 255, .96), rgba(236, 254, 255, .92));
          }
          :global(.dark) .invest-modal-head--asset {
            background: linear-gradient(135deg, rgba(15, 29, 49, .98), rgba(8, 47, 73, .94));
            border-bottom-color: rgba(103, 232, 249, .16);
          }
          :global(.dark) .invest-modal-head--asset h2 {
            color: #F8FAFC;
          }
          .invest-modal-head--asset p {
            margin: 6px 0 0;
            color: var(--sfm-muted);
            font-size: 12px;
            font-weight: 850;
            line-height: 1.6;
          }
          :global(.dark) .invest-modal-head--asset p {
            color: #B8C7D9;
          }
          :global(.dark) .invest-modal--asset .invest-icon-btn {
            background: #10243a;
            border-color: rgba(103, 232, 249, .18);
            color: #E8EEF6;
          }
          :global(.dark) .invest-form--asset {
            background:
              radial-gradient(circle at 100% 0%, rgba(47, 214, 192, .10), transparent 32%),
              #0b1728;
          }
          .invest-form--asset {
            align-items: start;
            gap: 12px;
            padding-bottom: 0;
          }
          .invest-form-section {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 34px;
            margin-top: 2px;
            color: var(--sfm-foreground);
            font-weight: 950;
            border-bottom: 1px solid rgba(14,116,144,.12);
          }
          :global(.dark) .invest-form-section {
            color: #F8FAFC;
            border-bottom-color: rgba(103, 232, 249, .14);
          }
          .invest-form-section span {
            width: 28px;
            height: 28px;
            border-radius: var(--r-sm);
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, rgba(29,140,255,.12), rgba(24,212,212,.16));
            color: #0e7490;
          }
          .invest-type-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
            gap: 8px;
          }
          .invest-type-grid button {
            min-height: 56px;
            border: 1px solid rgba(14,116,144,.16);
            border-radius: var(--r-md);
            background: rgba(255,255,255,.7);
            color: var(--sfm-foreground);
            padding: 9px;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
            gap: 8px;
            text-align: start;
            font: 950 12px Tajawal, Arial, sans-serif;
            cursor: pointer;
            transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease;
          }
          :global(.dark) .invest-type-grid button {
            background: #10243a;
            border-color: rgba(103, 232, 249, .16);
            color: #E8EEF6;
          }
          .invest-type-grid button svg {
            color: #0e7490;
          }
          :global(.dark) .invest-type-grid button svg {
            color: #67E8F9;
          }
          .invest-type-grid button:hover,
          .invest-type-grid button.selected {
            border-color: rgba(24,212,212,.44);
            background: linear-gradient(135deg, #1D8CFF, #2FD6C0);
            color: #FFFFFF;
            box-shadow: 0 12px 28px rgba(14,116,144,.1);
            transform: translateY(-1px);
          }
          .invest-type-grid button:hover svg,
          .invest-type-grid button.selected svg {
            color: #FFFFFF;
          }
          :global(.dark) .invest-type-grid button:hover,
          :global(.dark) .invest-type-grid button.selected {
            border-color: transparent;
            background: linear-gradient(135deg, #1D8CFF, #2FD6C0);
            color: #FFFFFF;
            box-shadow: 0 14px 34px rgba(29, 140, 255, .24);
          }
          :global(.dark) .invest-field > span,
          :global(.dark) .invest-field em,
          :global(.dark) .invest-summary-item span,
          :global(.dark) .invest-selected-asset span {
            color: #B8C7D9;
          }
          :global(.dark) .invest-modal--asset input,
          :global(.dark) .invest-modal--asset select,
          :global(.dark) .invest-modal--asset textarea {
            background: #10243a;
            border-color: rgba(103, 232, 249, .18);
            color: #F8FAFC;
          }
          :global(.dark) .invest-modal--asset input::placeholder,
          :global(.dark) .invest-modal--asset textarea::placeholder {
            color: #8EA6C3;
            opacity: 1;
          }
          :global(.dark) .invest-input-icon,
          :global(.dark) .invest-money-input,
          :global(.dark) .invest-suffix-input,
          :global(.dark) .invest-readonly-money {
            background: #10243a;
            border-color: rgba(103, 232, 249, .18);
            color: #F8FAFC;
          }
          :global(.dark) .invest-input-icon:focus-within,
          :global(.dark) .invest-money-input:focus-within,
          :global(.dark) .invest-suffix-input:focus-within {
            background: #0f1d31;
            border-color: #2FD6C0;
            box-shadow: 0 0 0 4px rgba(47, 214, 192, .14);
          }
          :global(.dark) .invest-input-icon svg {
            color: #8EA6C3;
          }
          .invest-asset-search {
            position: relative;
            min-width: 0;
          }
          .invest-asset-search em {
            display: block;
            margin-top: 7px;
          }
          .invest-asset-results {
            position: absolute;
            z-index: 6;
            inset-inline: 0;
            top: calc(100% + 8px);
            display: grid;
            gap: 8px;
            padding: 10px;
            border: 1px solid rgba(167,243,240,.24);
            border-radius: var(--r-xl);
            background: rgba(255,255,255,.98);
            box-shadow: 0 22px 55px rgba(3,18,37,.18);
            max-height: 320px;
            overflow: auto;
          }
          .dark .invest-asset-results {
            background: rgba(15,29,49,.98);
            border-color: rgba(167,243,240,.18);
          }
          :global(.dark) .invest-asset-results {
            background: #0f1d31;
            border-color: rgba(103, 232, 249, .18);
            box-shadow: 0 24px 70px rgba(0, 0, 0, .46);
          }
          .invest-asset-state {
            display: grid;
            gap: 6px;
            justify-items: start;
            padding: 13px;
            border-radius: var(--r-md);
            background: var(--sfm-light-card);
            color: var(--sfm-muted);
            font: 850 12px Tajawal,Arial,sans-serif;
            line-height: 1.7;
          }
          .invest-asset-state strong {
            color: var(--sfm-foreground);
            font-size: 13px;
          }
          :global(.dark) .invest-asset-state {
            background: #10243a;
            color: #B8C7D9;
          }
          :global(.dark) .invest-asset-state strong {
            color: #F8FAFC;
          }
          .invest-asset-state--warning,
          .invest-inline-alert {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #B45309;
            background: rgba(245,158,11,.1);
            border: 1px solid rgba(245,158,11,.18);
          }
          .invest-asset-result {
            width: 100%;
            min-width: 0;
            border: 1px solid rgba(167,243,240,.14);
            background: var(--sfm-card);
            border-radius: var(--r-lg);
            padding: 10px;
            display: grid;
            grid-template-columns: 38px minmax(0,1fr) auto;
            gap: 10px;
            align-items: center;
            text-align: start;
            color: var(--sfm-foreground);
            cursor: pointer;
          }
          :global(.dark) .invest-asset-result {
            background: #10243a;
            border-color: rgba(103, 232, 249, .14);
            color: #F8FAFC;
          }
          .invest-asset-result:hover {
            border-color: rgba(47,214,192,.45);
            box-shadow: 0 10px 24px rgba(15,23,42,.08);
            transform: translateY(-1px);
          }
          :global(.dark) .invest-asset-result:hover {
            background: #123052;
            box-shadow: 0 14px 34px rgba(0, 0, 0, .28);
          }
          .invest-asset-result-icon {
            width: 38px;
            height: 38px;
            border-radius: var(--r-md);
            background: linear-gradient(135deg,rgba(29,140,255,.13),rgba(24,212,212,.16));
            display: grid;
            place-items: center;
            color: #0f766e;
            font: 950 11px Arial,sans-serif;
          }
          :global(.dark) .invest-asset-result-icon {
            color: #67E8F9;
            background: rgba(47, 214, 192, .12);
          }
          .invest-asset-result-body {
            display: grid;
            gap: 4px;
            min-width: 0;
          }
          .invest-asset-result-body strong {
            font-size: 13px;
            font-weight: 950;
            color: var(--sfm-foreground);
            overflow-wrap: anywhere;
          }
          .invest-asset-result-body small {
            font-size: 11px;
            font-weight: 850;
            color: var(--sfm-muted);
            overflow-wrap: anywhere;
          }
          .invest-asset-result-price {
            font: 950 12px Arial,sans-serif;
            color: #0f766e;
            white-space: nowrap;
          }
          :global(.dark) .invest-asset-result-price {
            color: #67E8F9;
          }
          .invest-selected-asset,
          .invest-summary-box {
            display: grid;
            gap: 10px;
            padding: 12px;
            border: 1px solid rgba(47,214,192,.24);
            border-radius: var(--r-xl);
            background: linear-gradient(135deg,rgba(45,212,191,.12),rgba(29,140,255,.08));
          }
          .invest-selected-asset {
            grid-template-columns: minmax(0,1.2fr) minmax(0,.8fr) minmax(0,.8fr);
          }
          .invest-selected-asset>div,
          .invest-summary-item {
            background: rgba(255,255,255,.62);
            border: 1px solid rgba(167,243,240,.16);
            border-radius: var(--r-lg);
            padding: 11px;
            display: grid;
            gap: 5px;
            min-width: 0;
          }
          .dark .invest-selected-asset>div,
          .dark .invest-summary-item {
            background: rgba(15,29,49,.58);
            border-color: rgba(167,243,240,.14);
          }
          :global(.dark) .invest-selected-asset,
          :global(.dark) .invest-summary-box {
            background: linear-gradient(135deg, rgba(29, 140, 255, .10), rgba(47, 214, 192, .08));
            border-color: rgba(103, 232, 249, .20);
          }
          :global(.dark) .invest-selected-asset>div,
          :global(.dark) .invest-summary-item {
            background: #10243a;
            border-color: rgba(103, 232, 249, .16);
          }
          .invest-selected-asset span:not(.asset-avatar),
          .invest-summary-item span {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--sfm-muted);
            font-size: 11px;
            font-weight: 950;
          }
          .invest-selected-asset strong,
          .invest-summary-item strong {
            font-size: 14px;
            color: var(--sfm-foreground);
            font-weight: 950;
            overflow-wrap: anywhere;
          }
          .invest-selected-asset small,
          .invest-summary-item small {
            font-size: 11px;
            color: var(--sfm-muted);
            font-weight: 850;
            line-height: 1.5;
          }
          :global(.dark) .invest-selected-asset strong,
          :global(.dark) .invest-summary-item strong,
          :global(.dark) .invest-summary-head strong,
          :global(.dark) .invest-readonly-money strong {
            color: #F8FAFC;
          }
          :global(.dark) .invest-selected-asset small,
          :global(.dark) .invest-summary-item small {
            color: #9fb0c6;
          }
          .invest-summary-box {
            align-content: start;
          }
          .invest-summary-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
          .invest-summary-head strong {
            color: var(--sfm-foreground);
            font-size: 14px;
            font-weight: 950;
          }
          .invest-summary-head button {
            height: var(--control-h-sm);
            border-radius: var(--r-md);
            border: 1px solid rgba(47,214,192,.24);
            background: rgba(45,212,191,.12);
            color: #0f766e;
            font: 950 12px Tajawal,Arial,sans-serif;
            cursor: pointer;
            padding: 0 12px;
          }
          .invest-summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 9px;
          }
          .invest-summary-empty {
            margin: 0;
            border: 1px dashed rgba(14,116,144,.22);
            border-radius: var(--r-lg);
            background: rgba(236,254,255,.52);
            color: var(--sfm-muted);
            padding: 13px;
            font-size: 12px;
            font-weight: 850;
            line-height: 1.7;
          }
          :global(.dark) .invest-summary-empty {
            background: #10243a;
            border-color: rgba(103, 232, 249, .18);
            color: #B8C7D9;
          }
          .invest-inline-alert {
            border-radius: var(--r-md);
            padding: 11px 12px;
            font: 900 12px Tajawal, Arial, sans-serif;
          }
          .invest-price-unavailable {
            min-height: 44px;
            border-radius: var(--r-md);
            padding: 11px 12px;
            font: 900 12px Tajawal,Arial,sans-serif;
          }
          .invest-validation-summary {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 10px;
            align-items: start;
            border: 1px solid rgba(245,158,11,.22);
            border-radius: var(--r-lg);
            background: linear-gradient(135deg, rgba(255,251,235,.92), rgba(236,254,255,.72));
            color: #92400e;
            padding: 12px 13px;
            font: 850 12px Tajawal, Arial, sans-serif;
            line-height: 1.65;
          }
          :global(.dark) .invest-validation-summary {
            background: linear-gradient(135deg, rgba(69,26,3,.42), rgba(8,47,73,.42));
            border-color: rgba(245,158,11,.24);
            color: #fbbf24;
          }
          .invest-validation-summary svg {
            margin-top: 2px;
            color: #b45309;
          }
          .invest-validation-summary div {
            display: grid;
            gap: 3px;
            min-width: 0;
          }
          .invest-validation-summary strong {
            color: var(--sfm-foreground);
            font-size: 13px;
            font-weight: 950;
          }
          .invest-validation-summary span {
            color: inherit;
            font-weight: 850;
          }
          .invest-form-actions--sticky {
            position: sticky;
            bottom: 0;
            z-index: 2;
            margin-inline: -20px;
            padding: 13px 20px;
            border-top: 1px solid rgba(167,243,240,.12);
            background: rgba(248,251,255,.94);
            backdrop-filter: blur(10px);
          }
          :global(.dark) .invest-form-actions--sticky {
            background: rgba(8, 18, 32, .96);
            border-top-color: rgba(103, 232, 249, .16);
          }
          :global(.dark) .invest-form-actions--sticky .invest-secondary-btn {
            background: #10243a;
            border-color: rgba(103, 232, 249, .18);
            color: #F8FAFC;
          }
          :global(.dark) .invest-form-actions--sticky .invest-secondary-btn:not(:disabled):hover {
            background: #123052;
            border-color: rgba(47, 214, 192, .34);
          }
          :global(.dark) .invest-form-actions--sticky .invest-primary-btn {
            background: linear-gradient(135deg, #1D8CFF, #2FD6C0);
            color: #FFFFFF;
          }
          :global(.dark) .invest-form-actions--sticky button:disabled {
            opacity: .52;
            color: #9fb0c6;
            background: #15263b;
            border-color: rgba(103, 232, 249, .12);
          }
          @media (max-width: 760px) {
            .invest-type-grid,
            .invest-summary-grid,
            .invest-selected-asset {
              grid-template-columns: 1fr;
            }
            .invest-asset-result {
              grid-template-columns: 34px minmax(0,1fr);
              align-items: start;
            }
            .invest-asset-result-price {
              grid-column: 2;
              justify-self: start;
            }
            .invest-form-actions--sticky {
              display: grid;
              grid-template-columns: 1fr;
              margin-inline: -20px;
            }
            .invest-form-actions--sticky button {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function FormSection({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="invest-form-section span-2">
      <span>{icon}</span>
      {title}
    </div>
  );
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
  children: ReactNode;
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

function MoneyInput({ currency, value, onChange }: { currency: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="invest-money-input">
      <span dir="ltr">{currency}</span>
      <input type="number" min="0" step="any" value={value} onChange={event => onChange(event.target.value)} dir="ltr" inputMode="decimal" />
    </div>
  );
}

function PercentInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="invest-suffix-input">
      <input type="number" min="-100" max="1000" step="any" value={value} onChange={event => onChange(event.target.value)} dir="ltr" />
      <span>%</span>
    </div>
  );
}

function ReadonlyMoney({ label, currency, value, helper }: { label: string; currency: string; value: number | null | undefined; helper?: string }) {
  return (
    <div className="invest-field">
      <span>{label}</span>
      <div className="invest-readonly-money">
        <span dir="ltr">{currency}</span>
        <strong dir="ltr">{value !== null && value !== undefined && Number.isFinite(value) ? formatNumber(value) : '-'}</strong>
      </div>
      {helper && <em>{helper}</em>}
    </div>
  );
}

function InvestmentSummary({
  labels,
  ready,
  purchaseValueText,
  nativeValueText,
  profitText,
  profitPercent,
  currency,
  accountCurrency,
  accountValueText,
  showAccountValue,
  fxState,
  onRetryFx,
}: {
  labels: Props['labels'];
  ready: boolean;
  purchaseValueText: string;
  nativeValueText: string;
  profitText: string;
  profitPercent: number | null;
  currency: string;
  accountCurrency: string;
  accountValueText: string;
  showAccountValue: boolean;
  fxState: FxState;
  onRetryFx: () => void;
}) {
  return (
    <div className="invest-summary-box span-2">
      <div className="invest-summary-head">
        <strong>{labels.summaryTitle}</strong>
        {showAccountValue && (
          <button type="button" onClick={onRetryFx}>{labels.fxRetry}</button>
        )}
      </div>
      {!ready ? (
        <p className="invest-summary-empty">{labels.summaryIncomplete}</p>
      ) : (
        <div className="invest-summary-grid">
          <SummaryItem label={labels.summaryPurchaseTotal} value={purchaseValueText} />
          <SummaryItem label={labels.summaryCurrentValue} value={nativeValueText} />
          <SummaryItem label={labels.summaryProfitLoss} value={profitText} />
          <SummaryItem label={labels.summaryProfitLossPercent} value={profitPercent !== null ? `${formatNumber(profitPercent, 2)}%` : labels.unavailable} />
          <SummaryItem label={labels.summaryCurrency} value={currency} />
          {showAccountValue && (
            <SummaryItem
              label={labels.summaryDefaultCurrencyValue}
              value={fxState.state === 'loading' ? labels.fxLoading : accountValueText}
              helper={fxState.state === 'ready' && fxState.rate !== null ? `${labels.fxRate}: 1 ${currency} = ${formatNumber(fxState.rate, 8)} ${accountCurrency}` : fxState.message || labels.fxUnavailable}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="invest-summary-item">
      <span>{label}</span>
      <strong dir="ltr">{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
}

