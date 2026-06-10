// Extracted utility functions from useInvestments.ts
// Pure functions - no React hooks


import { supabase } from '@/integrations/supabase/client';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';
import { firstMoneyValue, parseMoneyValue } from '@/lib/money';
import { normalizeMarketCurrencyCode, resolveMarketCurrency } from '@/lib/market/marketCurrency';

export type DbInvestmentRow = {
  id: string;
  name: string;
  asset_name?: string | null;
  amount: number | string | null;
  user_id?: string | null;
  ai_analysis?: string | null;
  investment_snapshot?: Record<string, unknown> | string | null;
  type?: InvestmentType | null;
  category?: InvestmentType | string | null;
  value?: number | string | null;
  current_value?: number | string | null;
  initial_value?: number | string | null;
  invested_amount?: number | string | null;
  total_invested?: number | string | null;
  purchase_price?: number | string | null;
  purchase_date?: string | null;
  entry_date?: string | null;
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

export type InvestmentMeta = Omit<InvestmentInput, 'name' | 'currentValue'>;
export type InvestmentSelectResult = {
  data: unknown[] | null;
  error: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
};

export const GUEST_KEY = 'sfm_guest_investments';
export const OLD_GUEST_KEY = 'sfm_guest_invest';
export const SNAPSHOT_PREFIX = 'SFM_INVESTMENT_SNAPSHOT_V1:';
const DEBUG_INVESTMENTS = process.env.NODE_ENV === 'development';
export const MARKET_LINKED_TYPES = new Set<InvestmentType>(['stocks', 'fund', 'crypto', 'gold', 'silver']);
let hasLoggedInvestmentDebug = false;


export function debugInvestments(label: string, payload: Record<string, unknown>) {
  if (!DEBUG_INVESTMENTS) return;
  console.log(`[Investments] ${label}`, payload);
}

export function moneyNumber(value: unknown) {
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

export function safeInvestmentSummary(item: Partial<InvestmentInput & Investment>) {
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

function resolveInvestmentCurrency(input: {
  currency?: unknown;
  nativeCurrency?: unknown;
  priceCurrency?: unknown;
  market?: unknown;
  exchange?: unknown;
  symbol?: unknown;
  providerSymbol?: unknown;
  assetType?: unknown;
  fallback?: unknown;
}) {
  const providerCurrency = normalizeMarketCurrencyCode(input.nativeCurrency ?? input.priceCurrency ?? input.currency);
  const resolved = resolveMarketCurrency({
    providerCurrency,
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    exchange: input.exchange ?? input.market,
    market: input.market ?? input.exchange,
    assetType: typeof input.assetType === 'string' ? input.assetType : null,
  });
  return resolved.currency ?? providerCurrency ?? normalizeMarketCurrencyCode(input.fallback);
}

function meaningfulValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function preserve<T>(next: T | undefined, previous: T | undefined): T | undefined {
  return meaningfulValue(next) ? next : previous;
}

export function nowIso() {
  return new Date().toISOString();
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function metaKey(userId?: string | null) {
  return `sfm_investment_meta_${userId || 'anonymous'}`;
}

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => meaningfulValue(entry)),
  ) as Partial<T>;
}

function investmentSnapshotFromInput(item: Investment | InvestmentInput) {
  return compactObject({
    version: 1,
    name: item.name,
    currentValue: item.currentValue,
    ...metaFromInvestment(item),
  });
}

function investmentSnapshotText(item: Investment | InvestmentInput) {
  return `${SNAPSHOT_PREFIX}${JSON.stringify(investmentSnapshotFromInput(item))}`;
}

function parseSnapshotValue(value: unknown, requirePrefix = false): Partial<InvestmentInput> | undefined {
  if (!value) return undefined;
  if (typeof value === 'object') return value as Partial<InvestmentInput>;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (requirePrefix && !trimmed.startsWith(SNAPSHOT_PREFIX)) return undefined;

  const json = trimmed.startsWith(SNAPSHOT_PREFIX) ? trimmed.slice(SNAPSHOT_PREFIX.length) : trimmed;
  try {
    const parsed = JSON.parse(json) as Partial<InvestmentInput>;
    if (!parsed || typeof parsed !== 'object') return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function investmentSnapshotFromRow(row: DbInvestmentRow) {
  return parseSnapshotValue(row.investment_snapshot)
    ?? parseSnapshotValue(row.ai_analysis, true);
}

const CORE_SAVE_KEYS = new Set([
  'user_id',
  'name',
  'amount',
  'type',
  'current_value',
  'monthly_contribution',
  'start_date',
  'risk_level',
  'expected_annual_return',
  'notes',
  'symbol',
  'provider_symbol',
  'market',
  'asset_type',
  'currency',
  'quantity',
  'purchase_price',
  'invested_amount',
  'current_price',
  'current_market_value',
  'price_currency',
  'last_price',
  'last_price_updated_at',
  'data_source',
]);

export const PRICE_REFRESH_UPDATE_KEYS = new Set([
  'current_price',
  'last_price',
  'last_price_updated_at',
  'price_updated_at',
  'valuation_last_updated_at',
  'data_source',
  'price_source',
  'valuation_source',
  // currency & market-value fields: safe to overwrite on every price refresh
  'native_currency',
  'price_currency',
  'current_market_value',
  'native_unit_price',
  'native_market_value',
  'user_currency',
  'fx_rate_to_user_currency',
  'fx_source',
  'fx_last_updated_at',
  'converted_market_value',
  'current_value',
]);

const READONLY_UPDATE_KEYS = new Set([
  'id',
  'user_id',
  'created_at',
  'updated_at',
]);

type InvestmentWriteSource = 'add_form' | 'edit_form' | 'price_refresh' | 'data_repair';

function pickPayload<T extends Record<string, unknown>>(payload: T, allowed: Set<string>) {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.has(key)));
}

export function coreSavePayload(payload: Record<string, unknown>) {
  return pickPayload(payload, CORE_SAVE_KEYS);
}

type InvestmentMutationAttempt = {
  label: string;
  payload: Record<string, unknown>;
  source?: InvestmentWriteSource;
};

type InvestmentMutationResult = {
  data: unknown | null;
  error: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
};

export function mutationErrorMessage(result: InvestmentMutationResult | null) {
  return result?.error?.message || 'Could not save investment';
}

function logInvestmentWriteOperation(input: {
  operation: 'insert' | 'update' | 'upsert';
  source: InvestmentWriteSource;
  id?: string;
  payload: Record<string, unknown>;
}) {
  if (process.env.NODE_ENV !== 'development') return;
  console.log('INVESTMENT WRITE OPERATION', {
    operation: input.operation,
    source: input.source,
    id: input.id,
    payloadKeys: Object.keys(input.payload),
    payload: input.payload,
  });
}

export function buildSnapshotFallbackPayload(data: InvestmentInput, userId?: string) {
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
    notes: data.notes ?? null,
    ai_analysis: investmentSnapshotText(data),
  };
}

export async function insertInvestmentWithAttempts(attempts: InvestmentMutationAttempt[]) {
  let last: InvestmentMutationResult | null = null;

  for (const attempt of attempts) {
    logInvestmentWriteOperation({
      operation: 'insert',
      source: attempt.source ?? 'add_form',
      payload: attempt.payload,
    });
    const result = await supabase
      .from('investment_items')
      .insert(attempt.payload)
      .select('*')
      .single() as unknown as InvestmentMutationResult;

    if (!result.error && result.data) {
      debugInvestments('saved investment row', {
        attempt: attempt.label,
        keys: Object.keys(attempt.payload),
      });
      return result.data;
    }

    last = result;
    debugInvestments('investment insert attempt failed', {
      attempt: attempt.label,
      message: result.error?.message,
      code: result.error?.code,
      details: result.error?.details,
      hint: result.error?.hint,
      keys: Object.keys(attempt.payload),
    });
  }

  throw new Error(mutationErrorMessage(last));
}

export async function updateInvestmentWithAttempts(id: string, userId: string, attempts: InvestmentMutationAttempt[]) {
  let last: InvestmentMutationResult | null = null;

  for (const attempt of attempts) {
    if (Object.keys(attempt.payload).length === 0) continue;
    logInvestmentWriteOperation({
      operation: 'update',
      source: attempt.source ?? 'edit_form',
      id,
      payload: attempt.payload,
    });
    const result = await supabase
      .from('investment_items')
      .update(attempt.payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single() as unknown as InvestmentMutationResult;

    if (!result.error && result.data) {
      debugInvestments('saved investment row', {
        attempt: attempt.label,
        id,
        keys: Object.keys(attempt.payload),
      });
      return result.data;
    }

    last = result;
    debugInvestments('investment update attempt failed', {
      attempt: attempt.label,
      id,
      message: result.error?.message,
      code: result.error?.code,
      details: result.error?.details,
      hint: result.error?.hint,
      keys: Object.keys(attempt.payload),
    });
  }

  throw new Error(mutationErrorMessage(last));
}

export function normalizeInvestmentForSave(data: InvestmentInput) {
  const quantity = moneyNumber(data.quantity);
  const enteredPurchasePrice = moneyNumber(data.purchasePrice);
  const explicitPurchaseTotal = coalesceNumber(data.purchaseTotal, data.amount);
  const purchasePrice = enteredPurchasePrice
    ?? (
      quantity !== undefined && quantity > 0 && explicitPurchaseTotal !== undefined && explicitPurchaseTotal > 0
        ? explicitPurchaseTotal / quantity
        : undefined
    );
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

export function mergeInvestmentForUpdate(previous: Investment, data: InvestmentInput): InvestmentInput {
  const market = preserve(data.market, previous.market);
  const symbol = preserve(data.symbol, previous.symbol);
  const providerSymbol = preserve(data.providerSymbol, previous.providerSymbol);
  const assetType = preserve(data.assetType, previous.assetType);
  const resolvedCurrency = resolveInvestmentCurrency({
    currency: data.currency,
    nativeCurrency: data.nativeCurrency,
    priceCurrency: data.priceCurrency,
    market,
    symbol,
    providerSymbol,
    assetType: assetType ?? data.type,
    fallback: previous.nativeCurrency ?? previous.priceCurrency ?? previous.currency,
  });

  return {
    ...data,
    monthlyContribution: preserve(data.monthlyContribution, previous.monthlyContribution) ?? 0,
    startDate: preserve(data.startDate, previous.startDate) ?? todayInput(),
    riskLevel: preserve(data.riskLevel, previous.riskLevel) ?? 'medium',
    expectedAnnualReturn: preserve(data.expectedAnnualReturn, previous.expectedAnnualReturn),
    notes: preserve(data.notes, previous.notes),
    symbol,
    providerSymbol,
    market,
    assetType,
    currency: resolvedCurrency ?? preserve(data.currency, previous.currency),
    quantity: preserve(data.quantity, previous.quantity),
    amount: preserve(data.amount, previous.amount),
    purchasePrice: preserve(data.purchasePrice, previous.purchasePrice),
    purchaseTotal: preserve(data.purchaseTotal, previous.purchaseTotal),
    currentPrice: preserve(data.currentPrice, previous.currentPrice),
    currentMarketValue: preserve(data.currentMarketValue, previous.currentMarketValue),
    profitLoss: preserve(data.profitLoss, previous.profitLoss),
    profitLossPercent: preserve(data.profitLossPercent, previous.profitLossPercent),
    defaultCurrencyValue: preserve(data.defaultCurrencyValue, previous.defaultCurrencyValue),
    unit: preserve(data.unit, previous.unit),
    priceCurrency: resolvedCurrency ?? preserve(data.priceCurrency, previous.priceCurrency),
    nativeCurrency: resolvedCurrency ?? preserve(data.nativeCurrency, previous.nativeCurrency),
    nativeUnitPrice: preserve(data.nativeUnitPrice, previous.nativeUnitPrice),
    nativeMarketValue: preserve(data.nativeMarketValue, previous.nativeMarketValue),
    userCurrency: preserve(data.userCurrency, previous.userCurrency),
    fxRateToUserCurrency: preserve(data.fxRateToUserCurrency, previous.fxRateToUserCurrency),
    convertedMarketValue: preserve(data.convertedMarketValue, previous.convertedMarketValue),
    fxSource: preserve(data.fxSource, previous.fxSource),
    fxLastUpdatedAt: preserve(data.fxLastUpdatedAt, previous.fxLastUpdatedAt),
    valuationSource: preserve(data.valuationSource, previous.valuationSource),
    valuationLastUpdatedAt: preserve(data.valuationLastUpdatedAt, previous.valuationLastUpdatedAt),
    lastPrice: preserve(data.lastPrice, previous.lastPrice),
    lastPriceUpdatedAt: preserve(data.lastPriceUpdatedAt, previous.lastPriceUpdatedAt),
    dataSource: preserve(data.dataSource, previous.dataSource),
    projectId: preserve(data.projectId, previous.projectId),
    projectName: preserve(data.projectName, previous.projectName),
    location: preserve(data.location, previous.location),
    propertyType: preserve(data.propertyType, previous.propertyType),
    expectedMonthlyIncome: preserve(data.expectedMonthlyIncome, previous.expectedMonthlyIncome),
    expectedMonthlyExpense: preserve(data.expectedMonthlyExpense, previous.expectedMonthlyExpense),
    maturityDate: preserve(data.maturityDate, previous.maturityDate),
    metalType: preserve(data.metalType, previous.metalType),
    metalProductType: preserve(data.metalProductType, previous.metalProductType),
    metalKarat: preserve(data.metalKarat, previous.metalKarat),
    metalPurity: preserve(data.metalPurity, previous.metalPurity),
    grams: preserve(data.grams, previous.grams),
    pureMetalGrams: preserve(data.pureMetalGrams, previous.pureMetalGrams),
    priceSource: preserve(data.priceSource, previous.priceSource),
  };
}

export type InvestmentMarketPriceUpdate = {
  currentPrice?: unknown;
  currentMarketValue?: unknown;
  defaultCurrencyValue?: unknown;
  convertedMarketValue?: unknown;
  lastPrice?: unknown;
  lastPriceUpdatedAt?: string | null;
  dataSource?: string | null;
  priceSource?: string | null;
  valuationSource?: string | null;
  valuationLastUpdatedAt?: string | null;
  priceCurrency?: string | null;
  nativeCurrency?: string | null;
  nativeUnitPrice?: unknown;
  nativeMarketValue?: unknown;
  userCurrency?: string | null;
  fxRateToUserCurrency?: unknown;
  fxSource?: string | null;
  fxLastUpdatedAt?: string | null;
};

export function buildPriceRefreshPayload(data: InvestmentMarketPriceUpdate) {
  const currentPrice = coalesceNumber(data.currentPrice, data.lastPrice, data.nativeUnitPrice);
  const lastPrice = coalesceNumber(data.lastPrice, data.currentPrice, data.nativeUnitPrice);
  const currentMarketValue = coalesceNumber(data.currentMarketValue, data.nativeMarketValue);
  const convertedMarketValue = coalesceNumber(data.convertedMarketValue, data.defaultCurrencyValue);
  const updatedAt = data.lastPriceUpdatedAt ?? data.valuationLastUpdatedAt ?? (currentPrice !== undefined ? nowIso() : null);
  const resolvedCurrency = normalizeMarketCurrencyCode(data.nativeCurrency ?? data.priceCurrency) ?? data.nativeCurrency ?? data.priceCurrency ?? null;

  return cleanInvestmentUpdatePayload({
    current_price: currentPrice,
    last_price: lastPrice,
    last_price_updated_at: updatedAt,
    price_updated_at: updatedAt,
    valuation_last_updated_at: updatedAt,
    data_source: data.dataSource,
    price_source: data.priceSource ?? data.dataSource,
    valuation_source: data.valuationSource ?? data.dataSource ?? data.priceSource,
    // currency
    native_currency: resolvedCurrency,
    price_currency: resolvedCurrency,
    // market values
    current_market_value: currentMarketValue,
    native_unit_price: currentPrice,
    native_market_value: currentMarketValue,
    current_value: convertedMarketValue ?? currentMarketValue,
    converted_market_value: convertedMarketValue,
    // FX
    user_currency: data.userCurrency ?? null,
    fx_rate_to_user_currency: coalesceNumber(data.fxRateToUserCurrency),
    fx_source: data.fxSource ?? null,
    fx_last_updated_at: data.fxLastUpdatedAt ?? null,
  }, { allowedKeys: PRICE_REFRESH_UPDATE_KEYS });
}

export function mergeMarketPriceIntoInvestment(previous: Investment, data: InvestmentMarketPriceUpdate, updatedAt: string): Investment {
  const currentPrice = coalesceNumber(data.currentPrice, data.lastPrice, data.nativeUnitPrice);
  const quantity = moneyNumber(previous.quantity);
  const purchasePrice = moneyNumber(previous.purchasePrice);
  const purchaseTotal = moneyNumber(previous.purchaseTotal) ?? positiveProduct(quantity, purchasePrice);
  const currentMarketValue = coalesceNumber(data.currentMarketValue, data.nativeMarketValue)
    ?? positiveProduct(quantity, currentPrice)
    ?? previous.currentMarketValue;
  const convertedMarketValue = coalesceNumber(data.convertedMarketValue, data.defaultCurrencyValue);
  const accountValue = convertedMarketValue ?? currentMarketValue ?? finitePreviousValue(previous);
  const profitLoss = currentMarketValue !== undefined && purchaseTotal !== undefined
    ? currentMarketValue - purchaseTotal
    : previous.profitLoss;
  const profitLossPercent = profitLoss !== undefined && purchaseTotal !== undefined && purchaseTotal > 0
    ? (profitLoss / purchaseTotal) * 100
    : previous.profitLossPercent;
  const priceCurrency = normalizeMarketCurrencyCode(data.nativeCurrency ?? data.priceCurrency)
    ?? previous.nativeCurrency
    ?? previous.priceCurrency;

  return {
    ...previous,
    currentValue: accountValue,
    displayValue: accountValue,
    displayValueStatus: 'valid',
    currentPrice: currentPrice ?? previous.currentPrice,
    currentMarketValue,
    profitLoss,
    profitLossPercent,
    defaultCurrencyValue: convertedMarketValue ?? previous.defaultCurrencyValue,
    priceCurrency: priceCurrency ?? previous.priceCurrency,
    nativeCurrency: priceCurrency ?? previous.nativeCurrency,
    nativeUnitPrice: currentPrice ?? previous.nativeUnitPrice,
    nativeMarketValue: currentMarketValue ?? previous.nativeMarketValue,
    userCurrency: normalizeMarketCurrencyCode(data.userCurrency) ?? previous.userCurrency,
    fxRateToUserCurrency: moneyNumber(data.fxRateToUserCurrency) ?? previous.fxRateToUserCurrency,
    convertedMarketValue: convertedMarketValue ?? previous.convertedMarketValue,
    fxSource: data.fxSource ?? previous.fxSource,
    fxLastUpdatedAt: data.fxLastUpdatedAt ?? previous.fxLastUpdatedAt,
    valuationSource: data.valuationSource ?? data.dataSource ?? data.priceSource ?? previous.valuationSource,
    valuationLastUpdatedAt: data.valuationLastUpdatedAt ?? data.lastPriceUpdatedAt ?? previous.valuationLastUpdatedAt,
    lastPrice: currentPrice ?? previous.lastPrice,
    lastPriceUpdatedAt: data.lastPriceUpdatedAt ?? data.valuationLastUpdatedAt ?? previous.lastPriceUpdatedAt,
    dataSource: data.dataSource ?? previous.dataSource,
    priceSource: data.priceSource ?? data.dataSource ?? previous.priceSource,
    updatedAt,
  };
}

function finitePreviousValue(previous: Investment) {
  return moneyNumber(previous.currentValue) ?? previous.displayValue ?? 0;
}

type CleanInvestmentUpdateOptions = {
  allowedKeys?: Set<string>;
  allowNullKeys?: Set<string>;
  allowEmptyStringKeys?: Set<string>;
  dropZeroKeys?: Set<string>;
};

export function cleanInvestmentUpdatePayload<T extends Record<string, unknown>>(
  payload: T,
  options: CleanInvestmentUpdateOptions = {},
) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => {
      if (READONLY_UPDATE_KEYS.has(key)) return false;
      if (options.allowedKeys && !options.allowedKeys.has(key)) return false;
      if (value === undefined) return false;
      if (value === null) return Boolean(options.allowNullKeys?.has(key));
      if (typeof value === 'string' && value.trim().length === 0) {
        return Boolean(options.allowEmptyStringKeys?.has(key));
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) return false;
        if (value === 0 && options.dropZeroKeys?.has(key)) return false;
      }
      return true;
    }),
  );
}

export function compactUpdatePayload<T extends Record<string, unknown>>(payload: T) {
  const protectedEmptyKeys = new Set([
    'asset_name',
    'symbol',
    'provider_symbol',
    'market',
    'exchange',
    'asset_type',
    'currency',
    'quantity',
    'shares',
    'purchase_price',
    'average_buy_price',
    'purchase_total',
    'total_invested',
    'invested_amount',
    'purchase_date',
    'entry_date',
    'current_price',
    'current_market_value',
    'price_currency',
    'native_currency',
    'native_unit_price',
    'native_market_value',
    'last_price',
    'last_price_updated_at',
    'price_updated_at',
    'valuation_last_updated_at',
    'data_source',
    'investment_snapshot',
  ]);

  return cleanInvestmentUpdatePayload(payload, { dropZeroKeys: protectedEmptyKeys });
}

export function buildInvestmentPayload(data: InvestmentInput, userId?: string) {
  const normalized = normalizeInvestmentForSave(data);
  const priceUpdatedAt = normalized.currentPrice !== undefined
    ? data.lastPriceUpdatedAt ?? data.valuationLastUpdatedAt ?? null
    : null;
  const resolvedCurrency = resolveInvestmentCurrency({
    currency: data.currency,
    nativeCurrency: data.nativeCurrency,
    priceCurrency: data.priceCurrency,
    market: data.market,
    symbol: data.symbol,
    providerSymbol: data.providerSymbol,
    assetType: data.assetType ?? data.type,
  });
  return {
    ...(userId ? { user_id: userId } : {}),
    name: data.name,
    asset_name: data.name,
    amount: normalized.accountValue,
    type: data.type,
    current_value: normalized.accountValue,
    monthly_contribution: moneyNumber(data.monthlyContribution) ?? 0,
    start_date: data.startDate,
    purchase_date: data.startDate,
    entry_date: data.startDate,
    risk_level: data.riskLevel,
    expected_annual_return: moneyNumber(data.expectedAnnualReturn) ?? null,
    symbol: data.symbol ?? null,
    provider_symbol: data.providerSymbol ?? null,
    market: data.market ?? null,
    exchange: data.market ?? null,
    asset_type: data.assetType ?? null,
    currency: resolvedCurrency ?? null,
    quantity: normalized.quantity ?? null,
    shares: normalized.quantity ?? null,
    unit: data.unit ?? null,
    purchase_price: normalized.purchasePrice ?? null,
    average_buy_price: normalized.purchasePrice ?? null,
    purchase_total: normalized.purchaseTotal ?? null,
    total_invested: normalized.purchaseTotal ?? null,
    invested_amount: normalized.purchaseTotal ?? null,
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
    price_currency: resolvedCurrency ?? null,
    native_currency: resolvedCurrency ?? null,
    native_unit_price: normalized.nativeUnitPrice ?? null,
    native_market_value: normalized.nativeMarketValue ?? null,
    user_currency: data.userCurrency ?? null,
    fx_rate_to_user_currency: moneyNumber(data.fxRateToUserCurrency) ?? null,
    converted_market_value: normalized.convertedMarketValue ?? null,
    fx_source: data.fxSource ?? null,
    fx_last_updated_at: data.fxLastUpdatedAt ?? null,
    valuation_source: data.valuationSource ?? data.dataSource ?? data.priceSource ?? null,
    valuation_last_updated_at: priceUpdatedAt,
    last_price: normalized.lastPrice ?? null,
    last_price_updated_at: priceUpdatedAt,
    price_updated_at: priceUpdatedAt,
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
    investment_snapshot: investmentSnapshotFromInput(data),
  };
}

export function normalizeInvestment(row: DbInvestmentRow, meta?: Partial<InvestmentInput>): Investment {
  meta = { ...investmentSnapshotFromRow(row), ...meta };
  const createdAt = row.created_at || nowIso();
  const resolvedName = row.name || row.asset_name || meta?.name || '';
  const resolvedSymbol = row.symbol ?? meta?.symbol;
  const resolvedProviderSymbol = row.provider_symbol ?? meta?.providerSymbol;
  const resolvedMarket = row.market ?? row.exchange ?? meta?.market;
  const resolvedAssetType = row.asset_type ?? meta?.assetType;
  const resolvedCurrency = resolveInvestmentCurrency({
    currency: row.currency ?? meta?.currency,
    nativeCurrency: row.native_currency ?? meta?.nativeCurrency,
    priceCurrency: row.price_currency ?? meta?.priceCurrency,
    market: resolvedMarket,
    exchange: row.exchange,
    symbol: resolvedSymbol,
    providerSymbol: resolvedProviderSymbol,
    assetType: resolvedAssetType ?? row.type ?? meta?.type,
  });
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
      resolvedCurrency,
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
    name: resolvedName,
    type: row.type || (row.category as InvestmentType | undefined) || meta?.type || 'other',
    currentValue: resolvedDisplayValue ?? 0,
    displayValue: resolvedDisplayValue,
    displayValueStatus: resolvedDisplayStatus,
    displayValueRaw: displayAmount.raw,
    monthlyContribution: monthlyAmount.status === 'valid' ? monthlyAmount.value : 0,
    monthlyContributionStatus: monthlyAmount.status,
    startDate: row.purchase_date || row.entry_date || row.start_date || meta?.startDate || createdAt.slice(0, 10) || todayInput(),
    riskLevel: row.risk_level || meta?.riskLevel || 'medium',
    expectedAnnualReturn: expectedReturn.status === 'valid' ? expectedReturn.value : meta?.expectedAnnualReturn ?? 0,
    notes: row.notes ?? meta?.notes ?? '',
    symbol: resolvedSymbol,
    providerSymbol: resolvedProviderSymbol,
    market: resolvedMarket,
    assetType: resolvedAssetType,
    currency: resolvedCurrency ?? meta?.currency,
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
    priceCurrency: resolvedCurrency ?? row.price_currency ?? meta?.priceCurrency ?? row.currency ?? meta?.currency,
    nativeCurrency: resolvedCurrency ?? row.native_currency ?? meta?.nativeCurrency ?? row.price_currency ?? row.currency ?? meta?.priceCurrency ?? meta?.currency,
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

export function toLegacyRow(item: Investment): DbInvestmentRow {
  return {
    id: item.id,
    name: item.name,
    amount: item.displayValue ?? item.currentValue,
    created_at: item.createdAt,
  };
}

export function metaFromInvestment(item: Investment | InvestmentInput): InvestmentMeta {
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

