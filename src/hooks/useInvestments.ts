'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';
import { firstMoneyValue, parseMoneyValue } from '@/lib/money';

type DbInvestmentRow = {
  id: string;
  name: string;
  asset_name?: string | null;
  amount: number | string | null;
  user_id?: string | null;
  type?: InvestmentType | null;
  category?: InvestmentType | string | null;
  value?: number | string | null;
  current_value?: number | string | null;
  initial_value?: number | string | null;
  invested_amount?: number | string | null;
  total_invested?: number | string | null;
  purchase_price?: number | string | null;
  average_buy_price?: number | string | null;
  purchase_total?: number | string | null;
  monthly_contribution?: number | string | null;
  start_date?: string | null;
  risk_level?: RiskLevel | null;
  expected_return?: number | string | null;
  expected_annual_return?: number | string | null;
  symbol?: string | null;
  provider_symbol?: string | null;
  market?: string | null;
  exchange?: string | null;
  asset_type?: string | null;
  currency?: string | null;
  quantity?: number | string | null;
  shares?: number | string | null;
  unit?: string | null;
  profit_loss?: number | string | null;
  profit_loss_percent?: number | string | null;
  default_currency_value?: number | string | null;
  location?: string | null;
  property_type?: string | null;
  expected_monthly_income?: number | string | null;
  expected_monthly_expense?: number | string | null;
  maturity_date?: string | null;
  project_id?: string | null;
  metal_type?: string | null;
  metal_product_type?: string | null;
  metal_karat?: number | string | null;
  metal_purity?: number | string | null;
  grams?: number | string | null;
  pure_metal_grams?: number | string | null;
  price_source?: string | null;
  current_price?: number | string | null;
  current_market_value?: number | string | null;
  price_currency?: string | null;
  native_currency?: string | null;
  native_unit_price?: number | string | null;
  native_market_value?: number | string | null;
  user_currency?: string | null;
  fx_rate_to_user_currency?: number | string | null;
  converted_market_value?: number | string | null;
  fx_source?: string | null;
  fx_last_updated_at?: string | null;
  valuation_source?: string | null;
  valuation_last_updated_at?: string | null;
  last_price?: number | string | null;
  last_price_updated_at?: string | null;
  price_updated_at?: string | null;
  data_source?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type InvestmentMeta = Omit<InvestmentInput, 'name' | 'currentValue'>;

const GUEST_KEY = 'sfm_guest_investments';
const OLD_GUEST_KEY = 'sfm_guest_invest';
const DEBUG_INVESTMENTS = process.env.NODE_ENV === 'development';
const MARKET_LINKED_TYPES = new Set<InvestmentType>(['stocks', 'fund', 'crypto', 'gold', 'silver']);
let hasLoggedInvestmentDebug = false;

function debugInvestments(label: string, payload: Record<string, unknown>) {
  if (!DEBUG_INVESTMENTS) return;
  console.log(`[Investments] ${label}`, payload);
}

function moneyNumber(value: unknown) {
  const parsed = parseMoneyValue(value);
  return parsed.status === 'valid' ? parsed.value : undefined;
}

function coalesceNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = moneyNumber(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function positiveProduct(a: number | undefined, b: number | undefined) {
  if (a === undefined || b === undefined || a <= 0 || b <= 0) return undefined;
  return a * b;
}

function isMarketLinkedInput(item: Pick<InvestmentInput, 'type' | 'symbol' | 'providerSymbol'>) {
  return Boolean(item.symbol || item.providerSymbol) && MARKET_LINKED_TYPES.has(item.type);
}

function safeInvestmentSummary(item: Partial<InvestmentInput & Investment>) {
  return {
    id: 'id' in item ? item.id : undefined,
    name: item.name,
    type: item.type,
    symbol: item.symbol,
    providerSymbol: item.providerSymbol,
    market: item.market,
    currency: item.currency ?? item.nativeCurrency ?? item.priceCurrency,
    quantity: item.quantity,
    purchasePrice: item.purchasePrice,
    purchaseTotal: item.purchaseTotal,
    currentPrice: item.currentPrice ?? item.lastPrice,
    currentMarketValue: item.currentMarketValue ?? item.nativeMarketValue,
    lastPriceUpdatedAt: item.lastPriceUpdatedAt ?? item.valuationLastUpdatedAt,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function metaKey(userId?: string | null) {
  return `sfm_investment_meta_${userId || 'anonymous'}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeInvestmentForSave(data: InvestmentInput) {
  const quantity = moneyNumber(data.quantity);
  const purchasePrice = moneyNumber(data.purchasePrice);
  const explicitPurchaseTotal = coalesceNumber(data.purchaseTotal, data.amount);
  const purchaseTotal = explicitPurchaseTotal ?? positiveProduct(quantity, purchasePrice);
  const currentPrice = coalesceNumber(data.currentPrice, data.lastPrice);
  const isMarketLinked = isMarketLinkedInput(data);
  const computedCurrentMarketValue = positiveProduct(quantity, currentPrice);
  const explicitCurrentMarketValue = coalesceNumber(data.currentMarketValue, data.nativeMarketValue);
  const fallbackCurrentValue = coalesceNumber(data.currentValue);
  const currentMarketValue = computedCurrentMarketValue
    ?? (isMarketLinked && currentPrice === undefined ? undefined : explicitCurrentMarketValue)
    ?? (isMarketLinked ? undefined : fallbackCurrentValue);
  const accountValue = coalesceNumber(data.defaultCurrencyValue, data.convertedMarketValue, data.currentValue, currentMarketValue, purchaseTotal) ?? 0;
  const defaultCurrencyValue = coalesceNumber(data.defaultCurrencyValue, data.convertedMarketValue, accountValue);
  const convertedMarketValue = coalesceNumber(data.convertedMarketValue, data.defaultCurrencyValue, accountValue);
  const profitLoss = purchaseTotal !== undefined && currentMarketValue !== undefined
    ? currentMarketValue - purchaseTotal
    : moneyNumber(data.profitLoss);
  const profitLossPercent = purchaseTotal !== undefined && purchaseTotal > 0 && profitLoss !== undefined
    ? (profitLoss / purchaseTotal) * 100
    : moneyNumber(data.profitLossPercent);

  return {
    quantity,
    purchasePrice,
    purchaseTotal,
    currentPrice,
    currentMarketValue,
    accountValue,
    defaultCurrencyValue,
    convertedMarketValue,
    profitLoss,
    profitLossPercent,
    nativeUnitPrice: currentPrice,
    nativeMarketValue: currentMarketValue,
    lastPrice: currentPrice,
  };
}

function buildInvestmentPayload(data: InvestmentInput, userId?: string) {
  const normalized = normalizeInvestmentForSave(data);
  return {
    ...(userId ? { user_id: userId } : {}),
    name: data.name,
    amount: normalized.accountValue,
    type: data.type,
    current_value: normalized.accountValue,
    monthly_contribution: moneyNumber(data.monthlyContribution) ?? 0,
    start_date: data.startDate,
    risk_level: data.riskLevel,
    expected_annual_return: moneyNumber(data.expectedAnnualReturn) ?? null,
    symbol: data.symbol ?? null,
    provider_symbol: data.providerSymbol ?? null,
    market: data.market ?? null,
    asset_type: data.assetType ?? null,
    currency: data.currency ?? data.nativeCurrency ?? data.priceCurrency ?? null,
    quantity: normalized.quantity ?? null,
    unit: data.unit ?? null,
    purchase_price: normalized.purchasePrice ?? null,
    purchase_total: normalized.purchaseTotal ?? null,
    profit_loss: normalized.profitLoss ?? null,
    profit_loss_percent: normalized.profitLossPercent ?? null,
    default_currency_value: normalized.defaultCurrencyValue ?? null,
    location: data.location ?? null,
    property_type: data.propertyType ?? null,
    expected_monthly_income: moneyNumber(data.expectedMonthlyIncome) ?? null,
    expected_monthly_expense: moneyNumber(data.expectedMonthlyExpense) ?? null,
    maturity_date: data.maturityDate ?? null,
    current_price: normalized.currentPrice ?? null,
    current_market_value: normalized.currentMarketValue ?? null,
    price_currency: data.priceCurrency ?? data.currency ?? data.nativeCurrency ?? null,
    native_currency: data.nativeCurrency ?? data.priceCurrency ?? data.currency ?? null,
    native_unit_price: normalized.nativeUnitPrice ?? null,
    native_market_value: normalized.nativeMarketValue ?? null,
    user_currency: data.userCurrency ?? null,
    fx_rate_to_user_currency: moneyNumber(data.fxRateToUserCurrency) ?? null,
    converted_market_value: normalized.convertedMarketValue ?? null,
    fx_source: data.fxSource ?? null,
    fx_last_updated_at: data.fxLastUpdatedAt ?? null,
    valuation_source: data.valuationSource ?? data.dataSource ?? data.priceSource ?? null,
    valuation_last_updated_at: normalized.currentPrice !== undefined ? data.valuationLastUpdatedAt ?? data.lastPriceUpdatedAt ?? null : null,
    last_price: normalized.lastPrice ?? null,
    last_price_updated_at: normalized.currentPrice !== undefined ? data.lastPriceUpdatedAt ?? data.valuationLastUpdatedAt ?? null : null,
    data_source: data.dataSource ?? null,
    project_id: data.projectId ?? null,
    metal_type: data.metalType ?? null,
    metal_product_type: data.metalProductType ?? null,
    metal_karat: moneyNumber(data.metalKarat) ?? null,
    metal_purity: moneyNumber(data.metalPurity) ?? null,
    grams: moneyNumber(data.grams) ?? null,
    pure_metal_grams: moneyNumber(data.pureMetalGrams) ?? null,
    price_source: data.priceSource ?? data.dataSource ?? null,
    notes: data.notes ?? null,
  };
}

function rowToInvestment(row: DbInvestmentRow, meta?: Partial<InvestmentMeta>): Investment {
  const createdAt = row.created_at || nowIso();
  const displayAmount = firstMoneyValue(row as Record<string, unknown>, ['converted_market_value', 'current_value', 'amount', 'current_market_value', 'native_market_value', 'invested_amount', 'initial_value', 'purchase_price', 'value']);
  const monthlyAmount = parseMoneyValue(row.monthly_contribution ?? meta?.monthlyContribution);
  const expectedReturn = parseMoneyValue(row.expected_annual_return ?? row.expected_return ?? meta?.expectedAnnualReturn);
  const quantity = parseMoneyValue(row.quantity ?? row.shares ?? meta?.quantity);
  const amount = parseMoneyValue(row.amount ?? meta?.amount);
  const purchasePrice = parseMoneyValue(row.purchase_price ?? row.average_buy_price ?? meta?.purchasePrice);
  const quantityValue = quantity.status === 'valid' ? quantity.value : meta?.quantity;
  const purchasePriceValue = purchasePrice.status === 'valid' ? purchasePrice.value : meta?.purchasePrice;
  const purchaseTotal = parseMoneyValue(row.purchase_total ?? row.total_invested ?? meta?.purchaseTotal ?? row.invested_amount ?? row.initial_value);
  const purchaseTotalValue = purchaseTotal.status === 'valid'
    ? purchaseTotal.value
    : positiveProduct(quantityValue, purchasePriceValue) ?? meta?.purchaseTotal;
  const currentPrice = parseMoneyValue(row.current_price ?? row.last_price ?? meta?.currentPrice ?? meta?.lastPrice);
  const currentPriceValue = currentPrice.status === 'valid' ? currentPrice.value : meta?.currentPrice ?? meta?.lastPrice;
  const currentMarketValue = parseMoneyValue(row.current_market_value ?? row.native_market_value ?? meta?.currentMarketValue ?? meta?.nativeMarketValue);
  const currentMarketValueValue = currentMarketValue.status === 'valid'
    ? currentMarketValue.value
    : positiveProduct(quantityValue, currentPriceValue) ?? meta?.currentMarketValue ?? meta?.nativeMarketValue;
  const profitLoss = parseMoneyValue(row.profit_loss ?? meta?.profitLoss);
  const profitLossValue = profitLoss.status === 'valid'
    ? profitLoss.value
    : purchaseTotalValue !== undefined && currentMarketValueValue !== undefined
      ? currentMarketValueValue - purchaseTotalValue
      : meta?.profitLoss;
  const profitLossPercent = parseMoneyValue(row.profit_loss_percent ?? meta?.profitLossPercent);
  const profitLossPercentValue = profitLossPercent.status === 'valid'
    ? profitLossPercent.value
    : purchaseTotalValue !== undefined && purchaseTotalValue > 0 && profitLossValue !== undefined
      ? (profitLossValue / purchaseTotalValue) * 100
      : meta?.profitLossPercent;
  const defaultCurrencyValue = parseMoneyValue(row.default_currency_value ?? meta?.defaultCurrencyValue ?? row.converted_market_value ?? row.current_value ?? row.amount);
  const expectedMonthlyIncome = parseMoneyValue(row.expected_monthly_income ?? meta?.expectedMonthlyIncome);
  const expectedMonthlyExpense = parseMoneyValue(row.expected_monthly_expense ?? meta?.expectedMonthlyExpense);
  const nativeUnitPrice = parseMoneyValue(row.native_unit_price ?? meta?.nativeUnitPrice ?? row.current_price ?? row.last_price ?? meta?.currentPrice ?? meta?.lastPrice);
  const nativeMarketValue = parseMoneyValue(row.native_market_value ?? meta?.nativeMarketValue ?? row.current_market_value ?? meta?.currentMarketValue);
  const fxRateToUserCurrency = parseMoneyValue(row.fx_rate_to_user_currency ?? meta?.fxRateToUserCurrency);
  const convertedMarketValue = parseMoneyValue(row.converted_market_value ?? meta?.convertedMarketValue ?? row.current_value ?? row.amount);
  const lastPrice = parseMoneyValue(row.last_price ?? row.current_price ?? meta?.lastPrice ?? meta?.currentPrice);
  const metalKarat = parseMoneyValue(row.metal_karat ?? meta?.metalKarat);
  const metalPurity = parseMoneyValue(row.metal_purity ?? meta?.metalPurity);
  const grams = parseMoneyValue(row.grams ?? meta?.grams);
  const pureMetalGrams = parseMoneyValue(row.pure_metal_grams ?? meta?.pureMetalGrams);
  const resolvedDisplayValue = displayAmount.status === 'valid' ? displayAmount.value : purchaseTotalValue ?? null;
  const resolvedDisplayStatus = resolvedDisplayValue !== null ? 'valid' : displayAmount.status;
  if (process.env.NODE_ENV === 'development' && !hasLoggedInvestmentDebug) {
    hasLoggedInvestmentDebug = true;
    debugInvestments('loaded row field availability', {
      hasAmount: row.amount != null,
      hasCurrentPrice: row.current_price != null || row.last_price != null,
      hasPurchasePrice: row.purchase_price != null,
      hasQuantity: row.quantity != null || row.shares != null,
      hasPurchaseTotal: row.purchase_total != null || row.total_invested != null || row.invested_amount != null,
      hasProviderSymbol: Boolean(row.provider_symbol || row.symbol),
      hasCurrency: Boolean(row.currency || row.native_currency || row.price_currency),
      parsed: {
        quantity: quantityValue,
        purchasePrice: purchasePriceValue,
        purchaseTotal: purchaseTotalValue,
        currentPrice: currentPriceValue,
        currentMarketValue: currentMarketValueValue,
      },
    });
  }
  return {
    id: row.id,
    name: row.name || row.asset_name || '',
    type: row.type || (row.category as InvestmentType | undefined) || meta?.type || 'other',
    currentValue: resolvedDisplayValue ?? 0,
    displayValue: resolvedDisplayValue,
    displayValueStatus: resolvedDisplayStatus,
    displayValueRaw: displayAmount.raw,
    monthlyContribution: monthlyAmount.status === 'valid' ? monthlyAmount.value : 0,
    monthlyContributionStatus: monthlyAmount.status,
    startDate: row.start_date || meta?.startDate || createdAt.slice(0, 10) || todayInput(),
    riskLevel: row.risk_level || meta?.riskLevel || 'medium',
    expectedAnnualReturn: expectedReturn.status === 'valid' ? expectedReturn.value : meta?.expectedAnnualReturn ?? 0,
    notes: row.notes ?? meta?.notes ?? '',
    symbol: row.symbol ?? meta?.symbol,
    providerSymbol: row.provider_symbol ?? meta?.providerSymbol,
    market: row.market ?? row.exchange ?? meta?.market,
    assetType: row.asset_type ?? meta?.assetType,
    currency: row.currency ?? row.native_currency ?? row.price_currency ?? meta?.currency,
    amount: amount.status === 'valid' ? amount.value : meta?.amount,
    purchasePrice: purchasePriceValue,
    purchaseTotal: purchaseTotalValue,
    currentPrice: currentPriceValue,
    currentMarketValue: currentMarketValueValue !== undefined
      ? currentMarketValueValue
      : displayAmount.status === 'valid'
        ? displayAmount.value
        : meta?.currentMarketValue,
    profitLoss: profitLossValue,
    profitLossPercent: profitLossPercentValue,
    defaultCurrencyValue: defaultCurrencyValue.status === 'valid' ? defaultCurrencyValue.value : meta?.defaultCurrencyValue,
    unit: row.unit ?? meta?.unit,
    priceCurrency: row.price_currency ?? meta?.priceCurrency ?? row.currency ?? meta?.currency,
    nativeCurrency: row.native_currency ?? meta?.nativeCurrency ?? row.price_currency ?? row.currency ?? meta?.priceCurrency ?? meta?.currency,
    nativeUnitPrice: nativeUnitPrice.status === 'valid' ? nativeUnitPrice.value : meta?.nativeUnitPrice,
    nativeMarketValue: nativeMarketValue.status === 'valid'
      ? nativeMarketValue.value
      : currentMarketValueValue !== undefined
        ? currentMarketValueValue
        : meta?.nativeMarketValue,
    userCurrency: row.user_currency ?? meta?.userCurrency,
    fxRateToUserCurrency: fxRateToUserCurrency.status === 'valid' ? fxRateToUserCurrency.value : meta?.fxRateToUserCurrency,
    convertedMarketValue: convertedMarketValue.status === 'valid' ? convertedMarketValue.value : meta?.convertedMarketValue,
    fxSource: row.fx_source ?? meta?.fxSource,
    fxLastUpdatedAt: row.fx_last_updated_at ?? meta?.fxLastUpdatedAt,
    valuationSource: row.valuation_source ?? meta?.valuationSource ?? row.data_source ?? meta?.dataSource,
    valuationLastUpdatedAt: row.valuation_last_updated_at ?? meta?.valuationLastUpdatedAt ?? row.last_price_updated_at ?? row.price_updated_at ?? meta?.lastPriceUpdatedAt,
    quantity: quantityValue,
    lastPrice: lastPrice.status === 'valid' ? lastPrice.value : meta?.lastPrice,
    lastPriceUpdatedAt: row.last_price_updated_at ?? row.price_updated_at ?? meta?.lastPriceUpdatedAt,
    dataSource: row.data_source ?? meta?.dataSource,
    projectId: row.project_id ?? meta?.projectId,
    projectName: meta?.projectName,
    location: row.location ?? meta?.location,
    propertyType: row.property_type ?? meta?.propertyType,
    expectedMonthlyIncome: expectedMonthlyIncome.status === 'valid' ? expectedMonthlyIncome.value : meta?.expectedMonthlyIncome,
    expectedMonthlyExpense: expectedMonthlyExpense.status === 'valid' ? expectedMonthlyExpense.value : meta?.expectedMonthlyExpense,
    maturityDate: row.maturity_date ?? meta?.maturityDate,
    metalType: row.metal_type ?? meta?.metalType,
    metalProductType: row.metal_product_type ?? meta?.metalProductType,
    metalKarat: metalKarat.status === 'valid' ? metalKarat.value : meta?.metalKarat,
    metalPurity: metalPurity.status === 'valid' ? metalPurity.value : meta?.metalPurity,
    grams: grams.status === 'valid' ? grams.value : meta?.grams,
    pureMetalGrams: pureMetalGrams.status === 'valid' ? pureMetalGrams.value : meta?.pureMetalGrams,
    priceSource: row.price_source ?? meta?.priceSource ?? row.data_source ?? meta?.dataSource,
    createdAt,
    updatedAt: row.updated_at || createdAt,
  };
}

function toLegacyRow(item: Investment): DbInvestmentRow {
  return {
    id: item.id,
    name: item.name,
    amount: item.displayValue ?? item.currentValue,
    created_at: item.createdAt,
  };
}

function metaFromInvestment(item: Investment | InvestmentInput): InvestmentMeta {
  return {
    type: item.type,
    monthlyContribution: item.monthlyContribution,
    startDate: item.startDate,
    riskLevel: item.riskLevel,
    expectedAnnualReturn: item.expectedAnnualReturn,
    notes: item.notes,
    symbol: item.symbol,
    providerSymbol: item.providerSymbol,
    market: item.market,
    assetType: item.assetType,
    currency: item.currency,
    quantity: item.quantity,
    amount: item.amount,
    purchasePrice: item.purchasePrice,
    purchaseTotal: item.purchaseTotal,
    currentPrice: item.currentPrice,
    currentMarketValue: item.currentMarketValue,
    profitLoss: item.profitLoss,
    profitLossPercent: item.profitLossPercent,
    defaultCurrencyValue: item.defaultCurrencyValue,
    unit: item.unit,
    priceCurrency: item.priceCurrency,
    nativeCurrency: item.nativeCurrency,
    nativeUnitPrice: item.nativeUnitPrice,
    nativeMarketValue: item.nativeMarketValue,
    userCurrency: item.userCurrency,
    fxRateToUserCurrency: item.fxRateToUserCurrency,
    convertedMarketValue: item.convertedMarketValue,
    fxSource: item.fxSource,
    fxLastUpdatedAt: item.fxLastUpdatedAt,
    valuationSource: item.valuationSource,
    valuationLastUpdatedAt: item.valuationLastUpdatedAt,
    lastPrice: item.lastPrice,
    lastPriceUpdatedAt: item.lastPriceUpdatedAt,
    dataSource: item.dataSource,
    projectId: item.projectId,
    projectName: item.projectName,
    location: item.location,
    propertyType: item.propertyType,
    expectedMonthlyIncome: item.expectedMonthlyIncome,
    expectedMonthlyExpense: item.expectedMonthlyExpense,
    maturityDate: item.maturityDate,
    metalType: item.metalType,
    metalProductType: item.metalProductType,
    metalKarat: item.metalKarat,
    metalPurity: item.metalPurity,
    grams: item.grams,
    pureMetalGrams: item.pureMetalGrams,
    priceSource: item.priceSource,
  };
}

export function useInvestments() {
  const { user, isGuest, loading } = useAuth();
  const [items, setItems] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userMetaKey = useMemo(() => metaKey(user?.id), [user?.id]);

  const persistGuest = useCallback((next: Investment[]) => {
    setItems(next);
    writeJson(GUEST_KEY, next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (loading) return;
      setIsLoading(true);
      setError(null);

      if (isGuest || !user) {
        const saved = readJson<Investment[]>(GUEST_KEY, []);
        const legacy = saved.length > 0 ? saved : readJson<DbInvestmentRow[]>(OLD_GUEST_KEY, []).map(row => rowToInvestment(row));
        if (!cancelled) {
          setItems(legacy);
          setIsLoading(false);
        }
        return;
      }

      const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
      const full = await supabase
        .from('investment_items')
        .select('id,user_id,name,type,category,amount,value,current_value,initial_value,invested_amount,purchase_price,purchase_total,monthly_contribution,expected_return,expected_annual_return,risk_level,currency,start_date,notes,symbol,provider_symbol,market,asset_type,quantity,unit,profit_loss,profit_loss_percent,default_currency_value,location,property_type,expected_monthly_income,expected_monthly_expense,maturity_date,current_price,current_market_value,price_currency,native_currency,native_unit_price,native_market_value,user_currency,fx_rate_to_user_currency,converted_market_value,fx_source,fx_last_updated_at,valuation_source,valuation_last_updated_at,last_price,last_price_updated_at,data_source,project_id,metal_type,metal_product_type,metal_karat,metal_purity,grams,pure_metal_grams,price_source,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled && !full.error) {
        const mapped = (full.data ?? []).map(row => rowToInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id]));
        debugInvestments('fetched investments', {
          source: 'full',
          count: mapped.length,
          sample: mapped.slice(0, 3).map(safeInvestmentSummary),
        });
        setItems(mapped);
        setIsLoading(false);
        return;
      }

      const extended = await supabase
        .from('investment_items')
        .select('id,name,amount,type,current_value,monthly_contribution,start_date,risk_level,expected_annual_return,notes,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled && !extended.error) {
        const mapped = (extended.data ?? []).map(row => rowToInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id]));
        debugInvestments('fetched investments', {
          source: 'extended-fallback',
          count: mapped.length,
          sample: mapped.slice(0, 3).map(safeInvestmentSummary),
        });
        setItems(mapped);
        setIsLoading(false);
        return;
      }

      const legacy = await supabase
        .from('investment_items')
        .select('id,name,amount,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (legacy.error) {
          setError(legacy.error.message);
          setItems([]);
        } else {
          const mapped = (legacy.data ?? []).map(row => rowToInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id]));
          debugInvestments('fetched investments', {
            source: 'legacy-fallback',
            count: mapped.length,
            sample: mapped.slice(0, 3).map(safeInvestmentSummary),
          });
          setItems(mapped);
        }
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isGuest, loading, persistGuest, user, userMetaKey]);

  const add = useCallback(async (data: InvestmentInput) => {
    const createdAt = nowIso();
    const optimistic: Investment = {
      ...data,
      id: newId(),
      displayValue: data.currentValue,
      displayValueStatus: 'valid',
      createdAt,
      updatedAt: createdAt,
    };

    if (isGuest || !user) {
      persistGuest([optimistic, ...items]);
      return optimistic;
    }

    const extendedPayload = buildInvestmentPayload(data, user.id);
    debugInvestments('add payload', safeInvestmentSummary({
      ...data,
      quantity: extendedPayload.quantity ?? undefined,
      purchasePrice: extendedPayload.purchase_price ?? undefined,
      purchaseTotal: extendedPayload.purchase_total ?? undefined,
      currentPrice: extendedPayload.current_price ?? undefined,
      currentMarketValue: extendedPayload.current_market_value ?? undefined,
    }));

    const created = await supabase.from('investment_items').insert(extendedPayload).select('*').single();
    if (!created.error && created.data) {
      const next = rowToInvestment(created.data as DbInvestmentRow, metaFromInvestment(data));
      debugInvestments('insert returned row', safeInvestmentSummary(next));
      setItems(prev => [next, ...prev]);
      return next;
    }
    debugInvestments('rich insert failed, using legacy fallback', {
      message: created.error?.message,
      code: created.error?.code,
      details: created.error?.details,
      hint: created.error?.hint,
    });

    const legacy = await supabase.from('investment_items').insert({
      user_id: user.id,
      name: data.name,
      amount: extendedPayload.amount,
    }).select('id,name,amount,created_at').single();

    if (legacy.error || !legacy.data) throw new Error(legacy.error?.message || created.error?.message || 'Could not save investment');

    const next = rowToInvestment(legacy.data as DbInvestmentRow, metaFromInvestment(data));
    const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
    writeJson(userMetaKey, { ...meta, [next.id]: metaFromInvestment(data) });
    setItems(prev => [next, ...prev]);
    return next;
  }, [isGuest, items, persistGuest, user, userMetaKey]);

  const update = useCallback(async (id: string, data: InvestmentInput) => {
    const updatedAt = nowIso();
    const previous = items.find(item => item.id === id);
    if (!previous) throw new Error('Investment not found');

    const nextItem: Investment = {
      ...previous,
      ...data,
      displayValue: data.currentValue,
      displayValueStatus: 'valid',
      updatedAt,
    };

    if (isGuest || !user) {
      persistGuest(items.map(item => item.id === id ? nextItem : item));
      return nextItem;
    }

    const extendedPayload = buildInvestmentPayload(data);
    debugInvestments('update payload', safeInvestmentSummary({
      ...data,
      id,
      quantity: extendedPayload.quantity ?? undefined,
      purchasePrice: extendedPayload.purchase_price ?? undefined,
      purchaseTotal: extendedPayload.purchase_total ?? undefined,
      currentPrice: extendedPayload.current_price ?? undefined,
      currentMarketValue: extendedPayload.current_market_value ?? undefined,
    }));

    const extended = await supabase
      .from('investment_items')
      .update(extendedPayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (!extended.error && extended.data) {
      const next = rowToInvestment(extended.data as DbInvestmentRow, metaFromInvestment(data));
      debugInvestments('update returned row', safeInvestmentSummary(next));
      setItems(prev => prev.map(item => item.id === id ? next : item));
      return next;
    }
    debugInvestments('rich update failed, using legacy fallback', {
      message: extended.error?.message,
      code: extended.error?.code,
      details: extended.error?.details,
      hint: extended.error?.hint,
    });

    const legacy = await supabase.from('investment_items').update({
      name: data.name,
      amount: extendedPayload.amount,
    }).eq('id', id).eq('user_id', user.id);

    if (legacy.error) throw new Error(legacy.error.message || extended.error?.message || 'Could not update investment');

    const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
    writeJson(userMetaKey, { ...meta, [id]: metaFromInvestment(data) });
    setItems(prev => prev.map(item => item.id === id ? nextItem : item));
    return nextItem;
  }, [isGuest, items, persistGuest, user, userMetaKey]);

  const remove = useCallback(async (id: string) => {
    if (isGuest || !user) {
      persistGuest(items.filter(item => item.id !== id));
      return;
    }

    const result = await supabase.from('investment_items').delete().eq('id', id).eq('user_id', user.id);
    if (result.error) throw new Error(result.error.message);

    const meta = readJson<Record<string, InvestmentMeta>>(userMetaKey, {});
    const rest = { ...meta };
    delete rest[id];
    writeJson(userMetaKey, rest);
    setItems(prev => prev.filter(item => item.id !== id));
  }, [isGuest, items, persistGuest, user, userMetaKey]);

  return {
    items,
    isLoading,
    error,
    add,
    update,
    remove,
  };
}
