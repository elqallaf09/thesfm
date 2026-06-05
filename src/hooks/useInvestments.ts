'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';
import { firstMoneyValue, parseMoneyValue } from '@/lib/money';

type DbInvestmentRow = {
  id: string;
  name: string;
  amount: number | string | null;
  user_id?: string | null;
  type?: InvestmentType | null;
  category?: InvestmentType | string | null;
  value?: number | string | null;
  current_value?: number | string | null;
  initial_value?: number | string | null;
  invested_amount?: number | string | null;
  purchase_price?: number | string | null;
  purchase_total?: number | string | null;
  monthly_contribution?: number | string | null;
  start_date?: string | null;
  risk_level?: RiskLevel | null;
  expected_return?: number | string | null;
  expected_annual_return?: number | string | null;
  symbol?: string | null;
  provider_symbol?: string | null;
  market?: string | null;
  asset_type?: string | null;
  currency?: string | null;
  quantity?: number | string | null;
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
  data_source?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type InvestmentMeta = Omit<InvestmentInput, 'name' | 'currentValue'>;

const GUEST_KEY = 'sfm_guest_investments';
const OLD_GUEST_KEY = 'sfm_guest_invest';
let hasLoggedInvestmentDebug = false;

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

function rowToInvestment(row: DbInvestmentRow, meta?: Partial<InvestmentMeta>): Investment {
  const createdAt = row.created_at || nowIso();
  const displayAmount = firstMoneyValue(row as Record<string, unknown>, ['converted_market_value', 'current_value', 'amount', 'current_market_value', 'native_market_value', 'invested_amount', 'initial_value', 'purchase_price', 'value']);
  const monthlyAmount = parseMoneyValue(row.monthly_contribution ?? meta?.monthlyContribution);
  const expectedReturn = parseMoneyValue(row.expected_annual_return ?? row.expected_return ?? meta?.expectedAnnualReturn);
  const quantity = parseMoneyValue(row.quantity ?? meta?.quantity);
  const amount = parseMoneyValue(row.amount ?? meta?.amount);
  const purchasePrice = parseMoneyValue(row.purchase_price ?? meta?.purchasePrice);
  const purchaseTotal = parseMoneyValue(row.purchase_total ?? meta?.purchaseTotal ?? row.invested_amount ?? row.initial_value);
  const currentPrice = parseMoneyValue(row.current_price ?? row.last_price ?? meta?.currentPrice ?? meta?.lastPrice);
  const currentMarketValue = parseMoneyValue(row.current_market_value ?? meta?.currentMarketValue);
  const profitLoss = parseMoneyValue(row.profit_loss ?? meta?.profitLoss);
  const profitLossPercent = parseMoneyValue(row.profit_loss_percent ?? meta?.profitLossPercent);
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
  if (process.env.NODE_ENV === 'development' && !hasLoggedInvestmentDebug) {
    hasLoggedInvestmentDebug = true;
    console.log('RAW INVESTMENT ASSET:', row);
    console.log('Investment amount fields:', {
      amount: row.amount,
      value: row.value,
      current_value: row.current_value,
      initial_value: row.initial_value,
      invested_amount: row.invested_amount,
      purchase_price: row.purchase_price,
      monthly_contribution: row.monthly_contribution,
    });
  }
  return {
    id: row.id,
    name: row.name || '',
    type: row.type || (row.category as InvestmentType | undefined) || meta?.type || 'other',
    currentValue: displayAmount.status === 'valid' ? displayAmount.value : 0,
    displayValue: displayAmount.status === 'valid' ? displayAmount.value : null,
    displayValueStatus: displayAmount.status,
    displayValueRaw: displayAmount.raw,
    monthlyContribution: monthlyAmount.status === 'valid' ? monthlyAmount.value : 0,
    monthlyContributionStatus: monthlyAmount.status,
    startDate: row.start_date || meta?.startDate || createdAt.slice(0, 10) || todayInput(),
    riskLevel: row.risk_level || meta?.riskLevel || 'medium',
    expectedAnnualReturn: expectedReturn.status === 'valid' ? expectedReturn.value : meta?.expectedAnnualReturn ?? 0,
    notes: row.notes ?? meta?.notes ?? '',
    symbol: row.symbol ?? meta?.symbol,
    providerSymbol: row.provider_symbol ?? meta?.providerSymbol,
    market: row.market ?? meta?.market,
    assetType: row.asset_type ?? meta?.assetType,
    currency: row.currency ?? meta?.currency,
    amount: amount.status === 'valid' ? amount.value : meta?.amount,
    purchasePrice: purchasePrice.status === 'valid' ? purchasePrice.value : meta?.purchasePrice,
    purchaseTotal: purchaseTotal.status === 'valid' ? purchaseTotal.value : meta?.purchaseTotal,
    currentPrice: currentPrice.status === 'valid' ? currentPrice.value : meta?.currentPrice,
    currentMarketValue: currentMarketValue.status === 'valid'
      ? currentMarketValue.value
      : displayAmount.status === 'valid'
        ? displayAmount.value
        : meta?.currentMarketValue,
    profitLoss: profitLoss.status === 'valid' ? profitLoss.value : meta?.profitLoss,
    profitLossPercent: profitLossPercent.status === 'valid' ? profitLossPercent.value : meta?.profitLossPercent,
    defaultCurrencyValue: defaultCurrencyValue.status === 'valid' ? defaultCurrencyValue.value : meta?.defaultCurrencyValue,
    unit: row.unit ?? meta?.unit,
    priceCurrency: row.price_currency ?? meta?.priceCurrency ?? row.currency ?? meta?.currency,
    nativeCurrency: row.native_currency ?? meta?.nativeCurrency ?? row.price_currency ?? row.currency ?? meta?.priceCurrency ?? meta?.currency,
    nativeUnitPrice: nativeUnitPrice.status === 'valid' ? nativeUnitPrice.value : meta?.nativeUnitPrice,
    nativeMarketValue: nativeMarketValue.status === 'valid'
      ? nativeMarketValue.value
      : currentMarketValue.status === 'valid'
        ? currentMarketValue.value
        : meta?.nativeMarketValue,
    userCurrency: row.user_currency ?? meta?.userCurrency,
    fxRateToUserCurrency: fxRateToUserCurrency.status === 'valid' ? fxRateToUserCurrency.value : meta?.fxRateToUserCurrency,
    convertedMarketValue: convertedMarketValue.status === 'valid' ? convertedMarketValue.value : meta?.convertedMarketValue,
    fxSource: row.fx_source ?? meta?.fxSource,
    fxLastUpdatedAt: row.fx_last_updated_at ?? meta?.fxLastUpdatedAt,
    valuationSource: row.valuation_source ?? meta?.valuationSource ?? row.data_source ?? meta?.dataSource,
    valuationLastUpdatedAt: row.valuation_last_updated_at ?? meta?.valuationLastUpdatedAt ?? row.last_price_updated_at ?? meta?.lastPriceUpdatedAt,
    quantity: quantity.status === 'valid' ? quantity.value : meta?.quantity,
    lastPrice: lastPrice.status === 'valid' ? lastPrice.value : meta?.lastPrice,
    lastPriceUpdatedAt: row.last_price_updated_at ?? meta?.lastPriceUpdatedAt,
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
        setItems((full.data ?? []).map(row => rowToInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id])));
        setIsLoading(false);
        return;
      }

      const extended = await supabase
        .from('investment_items')
        .select('id,name,amount,type,current_value,monthly_contribution,start_date,risk_level,expected_annual_return,notes,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled && !extended.error) {
        setItems((extended.data ?? []).map(row => rowToInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id])));
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
          setItems((legacy.data ?? []).map(row => rowToInvestment(row as DbInvestmentRow, meta[(row as DbInvestmentRow).id])));
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

    const extendedPayload = {
      user_id: user.id,
      name: data.name,
      amount: data.currentValue,
      type: data.type,
      current_value: data.currentValue,
      monthly_contribution: data.monthlyContribution,
      start_date: data.startDate,
      risk_level: data.riskLevel,
      expected_annual_return: data.expectedAnnualReturn ?? null,
      symbol: data.symbol ?? null,
      provider_symbol: data.providerSymbol ?? null,
      market: data.market ?? null,
      asset_type: data.assetType ?? null,
      currency: data.currency ?? null,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
      purchase_price: data.purchasePrice ?? null,
      purchase_total: data.purchaseTotal ?? data.amount ?? null,
      profit_loss: data.profitLoss ?? null,
      profit_loss_percent: data.profitLossPercent ?? null,
      default_currency_value: data.defaultCurrencyValue ?? data.convertedMarketValue ?? data.currentValue,
      location: data.location ?? null,
      property_type: data.propertyType ?? null,
      expected_monthly_income: data.expectedMonthlyIncome ?? null,
      expected_monthly_expense: data.expectedMonthlyExpense ?? null,
      maturity_date: data.maturityDate ?? null,
      current_price: data.currentPrice ?? data.lastPrice ?? null,
      current_market_value: data.nativeMarketValue ?? data.currentMarketValue ?? data.currentValue,
      price_currency: data.priceCurrency ?? data.currency ?? null,
      native_currency: data.nativeCurrency ?? data.priceCurrency ?? data.currency ?? null,
      native_unit_price: data.nativeUnitPrice ?? data.currentPrice ?? data.lastPrice ?? null,
      native_market_value: data.nativeMarketValue ?? data.currentMarketValue ?? data.currentValue,
      user_currency: data.userCurrency ?? null,
      fx_rate_to_user_currency: data.fxRateToUserCurrency ?? null,
      converted_market_value: data.convertedMarketValue ?? data.currentValue,
      fx_source: data.fxSource ?? null,
      fx_last_updated_at: data.fxLastUpdatedAt ?? null,
      valuation_source: data.valuationSource ?? data.dataSource ?? data.priceSource ?? null,
      valuation_last_updated_at: data.valuationLastUpdatedAt ?? data.lastPriceUpdatedAt ?? null,
      last_price: data.lastPrice ?? null,
      last_price_updated_at: data.lastPriceUpdatedAt ?? null,
      data_source: data.dataSource ?? null,
      project_id: data.projectId ?? null,
      metal_type: data.metalType ?? null,
      metal_product_type: data.metalProductType ?? null,
      metal_karat: data.metalKarat ?? null,
      metal_purity: data.metalPurity ?? null,
      grams: data.grams ?? null,
      pure_metal_grams: data.pureMetalGrams ?? null,
      price_source: data.priceSource ?? data.dataSource ?? null,
      notes: data.notes ?? null,
    };

    const created = await supabase.from('investment_items').insert(extendedPayload).select('*').single();
    if (!created.error && created.data) {
      const next = rowToInvestment(created.data as DbInvestmentRow);
      setItems(prev => [next, ...prev]);
      return next;
    }

    const legacy = await supabase.from('investment_items').insert({
      user_id: user.id,
      name: data.name,
      amount: data.currentValue,
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

    const extendedPayload = {
      name: data.name,
      amount: data.currentValue,
      type: data.type,
      current_value: data.currentValue,
      monthly_contribution: data.monthlyContribution,
      start_date: data.startDate,
      risk_level: data.riskLevel,
      expected_annual_return: data.expectedAnnualReturn ?? null,
      symbol: data.symbol ?? null,
      provider_symbol: data.providerSymbol ?? null,
      market: data.market ?? null,
      asset_type: data.assetType ?? null,
      currency: data.currency ?? null,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
      purchase_price: data.purchasePrice ?? null,
      purchase_total: data.purchaseTotal ?? data.amount ?? null,
      profit_loss: data.profitLoss ?? null,
      profit_loss_percent: data.profitLossPercent ?? null,
      default_currency_value: data.defaultCurrencyValue ?? data.convertedMarketValue ?? data.currentValue,
      location: data.location ?? null,
      property_type: data.propertyType ?? null,
      expected_monthly_income: data.expectedMonthlyIncome ?? null,
      expected_monthly_expense: data.expectedMonthlyExpense ?? null,
      maturity_date: data.maturityDate ?? null,
      current_price: data.currentPrice ?? data.lastPrice ?? null,
      current_market_value: data.nativeMarketValue ?? data.currentMarketValue ?? data.currentValue,
      price_currency: data.priceCurrency ?? data.currency ?? null,
      native_currency: data.nativeCurrency ?? data.priceCurrency ?? data.currency ?? null,
      native_unit_price: data.nativeUnitPrice ?? data.currentPrice ?? data.lastPrice ?? null,
      native_market_value: data.nativeMarketValue ?? data.currentMarketValue ?? data.currentValue,
      user_currency: data.userCurrency ?? null,
      fx_rate_to_user_currency: data.fxRateToUserCurrency ?? null,
      converted_market_value: data.convertedMarketValue ?? data.currentValue,
      fx_source: data.fxSource ?? null,
      fx_last_updated_at: data.fxLastUpdatedAt ?? null,
      valuation_source: data.valuationSource ?? data.dataSource ?? data.priceSource ?? null,
      valuation_last_updated_at: data.valuationLastUpdatedAt ?? data.lastPriceUpdatedAt ?? null,
      last_price: data.lastPrice ?? null,
      last_price_updated_at: data.lastPriceUpdatedAt ?? null,
      data_source: data.dataSource ?? null,
      project_id: data.projectId ?? null,
      metal_type: data.metalType ?? null,
      metal_product_type: data.metalProductType ?? null,
      metal_karat: data.metalKarat ?? null,
      metal_purity: data.metalPurity ?? null,
      grams: data.grams ?? null,
      pure_metal_grams: data.pureMetalGrams ?? null,
      price_source: data.priceSource ?? data.dataSource ?? null,
      notes: data.notes ?? null,
    };

    const extended = await supabase.from('investment_items').update(extendedPayload).eq('id', id).eq('user_id', user.id);
    if (!extended.error) {
      setItems(prev => prev.map(item => item.id === id ? nextItem : item));
      return nextItem;
    }

    const legacy = await supabase.from('investment_items').update({
      name: data.name,
      amount: data.currentValue,
    }).eq('id', id).eq('user_id', user.id);

    if (legacy.error) throw new Error(legacy.error.message || extended.error.message);

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
