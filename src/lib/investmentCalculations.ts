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

export function investmentNativeCurrency(item: Investment) {
  const providerCurrency = normalizeMarketCurrencyCode(item.nativeCurrency ?? item.priceCurrency ?? item.currency);
  return resolveMarketCurrency({
    providerCurrency,
    symbol: item.symbol,
    providerSymbol: item.providerSymbol,
    exchange: item.market,
    market: item.market,
    assetType: item.assetType ?? item.type,
  }).currency ?? providerCurrency;
}

export function calculateInvestmentHoldingMetrics(
  item: Investment,
  override?: { currentPrice?: number | null; currentValue?: number | null },
): InvestmentHoldingMetrics {
  const linkedSymbol = investmentLinkedSymbol(item);
  const isMarketLinked = isMarketLinkedInvestment(item);
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

  const storedCurrentValue = positiveInvestmentNumber(
    override?.currentValue
    ?? item.nativeMarketValue
    ?? item.currentMarketValue
    ?? item.currentValue,
  );
  const computedCurrentValue = quantity !== null && currentPrice !== null ? quantity * currentPrice : null;
  const currentValue = computedCurrentValue ?? (isMarketLinked ? null : storedCurrentValue);
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
  };
}
