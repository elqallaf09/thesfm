import type { Investment } from '@/types/investment';
import { normalizeMarketCurrencyCode, resolveMarketCurrency } from '@/lib/market/marketCurrency';

export type InvestmentHoldingMetrics = {
  linkedSymbol: string;
  quantity: number | null;
  purchasePrice: number | null;
  currentPrice: number | null;
  totalInvested: number | null;
  currentValue: number | null;
  profitLossAmount: number | null;
  profitLossPercent: number | null;
  canCalculateProfitLoss: boolean;
  isMarketLinked: boolean;
  holdingCurrency: string | null;
  quoteCurrency: string | null;
  conversionState: 'same_currency' | 'valid' | 'stale' | 'unavailable';
};

const MARKET_LINKED_TYPES = new Set<Investment['type']>(['stocks', 'fund', 'crypto', 'gold', 'silver']);

export function finiteInvestmentNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveInvestmentNumber(value: unknown) {
  const parsed = finiteInvestmentNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function metalKind(item: Investment) {
  const normalized = String(item.metalType || item.type || '').trim().toLowerCase();
  if (normalized === 'gold' || normalized === 'silver') return normalized;
  return null;
}

export function defaultInvestmentMetalSymbol(item: Investment) {
  const kind = metalKind(item);
  if (kind === 'gold') return 'XAUUSD';
  if (kind === 'silver') return 'XAGUSD';
  return '';
}

export function investmentLinkedSymbol(item: Investment) {
  return String(item.providerSymbol || item.symbol || defaultInvestmentMetalSymbol(item)).trim().toUpperCase();
}

export function isMarketLinkedInvestment(item: Investment) {
  return Boolean(investmentLinkedSymbol(item)) && MARKET_LINKED_TYPES.has(item.type);
}

function investmentPricedQuantity(item: Investment) {
  if (metalKind(item)) {
    return positiveInvestmentNumber(item.pureMetalGrams)
      ?? positiveInvestmentNumber(item.grams)
      ?? positiveInvestmentNumber(item.quantity);
  }
  return positiveInvestmentNumber(item.quantity);
}

export function investmentHoldingCurrency(item: Investment) {
  const quoteCurrency = normalizeMarketCurrencyCode(item.priceCurrency ?? item.nativeCurrency);
  return normalizeMarketCurrencyCode(item.currency)
    ?? (quoteCurrency ? null : normalizeMarketCurrencyCode(item.userCurrency))
    ?? quoteCurrency;
}

export function investmentQuoteCurrency(item: Investment) {
  const providerCurrency = normalizeMarketCurrencyCode(item.priceCurrency ?? item.nativeCurrency);
  return resolveMarketCurrency({
    providerCurrency,
    symbol: item.symbol,
    providerSymbol: item.providerSymbol,
    exchange: item.market,
    market: item.market,
    assetType: item.assetType ?? item.type,
  }).currency ?? providerCurrency;
}

/** @deprecated Use investmentQuoteCurrency for market prices or investmentHoldingCurrency for holding values. */
export const investmentNativeCurrency = investmentQuoteCurrency;

function conversionState(item: Investment, holdingCurrency: string | null, quoteCurrency: string | null, currentValue: number | null) {
  if (holdingCurrency && quoteCurrency && holdingCurrency === quoteCurrency) return 'same_currency' as const;
  if (currentValue === null) return 'unavailable' as const;
  const source = String(item.fxSource ?? '').toLowerCase();
  if (source.includes('stale') || source.includes('unavailable')) return 'stale' as const;
  return 'valid' as const;
}

export function calculateInvestmentHoldingMetrics(
  item: Investment,
  override?: { currentPrice?: number | null; currentValue?: number | null },
): InvestmentHoldingMetrics {
  const linkedSymbol = investmentLinkedSymbol(item);
  const isMarketLinked = isMarketLinkedInvestment(item);
  const holdingCurrency = investmentHoldingCurrency(item);
  const quoteCurrency = investmentQuoteCurrency(item);
  const quantity = investmentPricedQuantity(item);
  // item.purchaseTotal comes from purchase_total/invested_amount DB columns.
  // item.amount holds the original investment value at creation time and is never
  // overwritten by price-refresh updates — safe last-resort fallback for legacy rows.
  const storedPurchaseTotal = positiveInvestmentNumber(item.purchaseTotal)
    ?? positiveInvestmentNumber(item.amount);
  // Derive per-unit purchase price from total/quantity when not explicitly stored
  const purchasePriceRaw = positiveInvestmentNumber(item.purchasePrice);
  const purchasePrice = purchasePriceRaw
    ?? (quantity !== null && quantity > 0 && storedPurchaseTotal !== null
        ? storedPurchaseTotal / quantity
        : null);
  const currentPrice = positiveInvestmentNumber(
    override?.currentPrice
    ?? item.lastPrice
    ?? item.currentPrice
    ?? (isMarketLinked ? undefined : item.nativeUnitPrice),
  );
  const totalInvested = quantity !== null && purchasePrice !== null
    ? quantity * purchasePrice
    : storedPurchaseTotal;

  const explicitHoldingValue = positiveInvestmentNumber(override?.currentValue ?? item.currentValue);
  const reportingValueInHoldingCurrency = normalizeMarketCurrencyCode(item.userCurrency) === holdingCurrency
    ? positiveInvestmentNumber(item.convertedMarketValue)
    : null;
  const storedQuoteValue = positiveInvestmentNumber(item.nativeMarketValue ?? item.currentMarketValue);
  const computedQuoteValue = quantity !== null && currentPrice !== null ? quantity * currentPrice : null;
  const sameCurrencyValue = holdingCurrency && quoteCurrency && holdingCurrency === quoteCurrency
    ? computedQuoteValue ?? storedQuoteValue
    : null;
  const currentValue = override?.currentValue !== undefined
    ? positiveInvestmentNumber(override.currentValue)
    : sameCurrencyValue
      ?? explicitHoldingValue
      ?? reportingValueInHoldingCurrency
      ?? (isMarketLinked ? null : storedQuoteValue);
  const canCalculateProfitLoss = totalInvested !== null && currentValue !== null && (!isMarketLinked || currentPrice !== null);
  const profitLossAmount = canCalculateProfitLoss ? currentValue - totalInvested : null;
  const profitLossPercent = profitLossAmount !== null && totalInvested !== null && totalInvested > 0
    ? (profitLossAmount / totalInvested) * 100
    : null;

  return {
    linkedSymbol,
    quantity,
    purchasePrice,
    currentPrice,
    totalInvested,
    currentValue,
    profitLossAmount,
    profitLossPercent,
    canCalculateProfitLoss,
    isMarketLinked,
    holdingCurrency,
    quoteCurrency,
    conversionState: conversionState(item, holdingCurrency, quoteCurrency, currentValue),
  };
}
