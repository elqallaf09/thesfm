import type { Investment } from '@/types/investment';

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

export function investmentLinkedSymbol(item: Investment) {
  return String(item.providerSymbol || item.symbol || '').trim().toUpperCase();
}

export function isMarketLinkedInvestment(item: Investment) {
  return Boolean(investmentLinkedSymbol(item)) && MARKET_LINKED_TYPES.has(item.type);
}

export function investmentNativeCurrency(item: Investment) {
  return item.nativeCurrency || item.priceCurrency || item.currency || null;
}

export function calculateInvestmentHoldingMetrics(
  item: Investment,
  override?: { currentPrice?: number | null; currentValue?: number | null },
): InvestmentHoldingMetrics {
  const linkedSymbol = investmentLinkedSymbol(item);
  const isMarketLinked = isMarketLinkedInvestment(item);
  const quantity = positiveInvestmentNumber(item.quantity);
  const purchasePrice = positiveInvestmentNumber(item.purchasePrice);
  const currentPrice = positiveInvestmentNumber(
    override?.currentPrice
    ?? item.lastPrice
    ?? item.currentPrice
    ?? item.nativeUnitPrice,
  );
  const storedPurchaseTotal = positiveInvestmentNumber(item.purchaseTotal);
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
