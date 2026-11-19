import type { Investment } from '@/types/investment';
import type { TvQuote } from './types';
import { investmentCenterAssetClassFor } from '@/lib/investments/center';
import { freshness, portfolioNumber, recordedBaseCost, recordedBaseValue, recordedValue, valuationTimestamp } from '@/lib/investments/recordedPortfolio';

export type TvPortfolioPosition = {
  id: string; name: string; symbol: string | null; assetClass: string; quantity: number | null;
  value: { amount: number; currency: string } | null; baseValue: number | null; baseCost: number | null;
  platform: string | null; source: string | null; valuedAt: string | null; freshness: 'recorded' | 'stale' | 'missing';
  valuationKind?: 'market' | 'recorded' | 'manual'; quoteStatus?: TvQuote['status'];
  valuationIssue?: 'identity_unverified' | 'quantity_unavailable' | 'units_unverified' | 'quote_unavailable' | 'fx_unavailable';
  recordedValue?: { amount: number; currency: string } | null; recordedBaseValue?: number | null;
  recordedValuedAt?: string | null; recordedSource?: string | null;
  fxSource?: string | null; fxAt?: string | null;
};
export type TvPortfolioSnapshot = {
  currency: string; generatedAt: string; total: number; positions: TvPortfolioPosition[];
  totalValue: number | null; totalCost: number | null; valueCoverage: number; costCoverage: number;
  marketCoverage?: number; marketEligible?: number;
  allocation: { assetClass: string; amount: number; count: number }[];
};
/** A minimal projection of the same normalized records used by the website. */
export function tvPortfolioSnapshot(items: Investment[], currency: string, now = Date.now()): TvPortfolioSnapshot {
  const positions = items.map(item => ({
    id: item.id, name: item.name, symbol: item.symbol || item.providerSymbol || null,
    assetClass: investmentCenterAssetClassFor(item.assetType || item.type), quantity: portfolioNumber(item.quantity),
    value: recordedValue(item), baseValue: recordedBaseValue(item, currency), baseCost: recordedBaseCost(item, currency),
    platform: item.purchasePlatformName || null, source: item.valuationSource || item.dataSource || null,
    valuedAt: valuationTimestamp(item), freshness: freshness(item, now),
  }));
  return summarizeTvPortfolioPositions(positions, currency, new Date(now).toISOString());
}
/** Sum the displayed positions without changing purchase costs or filling missing FX. */
export function summarizeTvPortfolioPositions(positions: TvPortfolioPosition[], currency: string, generatedAt: string): TvPortfolioSnapshot {
  const valueCoverage = positions.filter(item => item.baseValue !== null).length;
  const costCoverage = positions.filter(item => item.baseCost !== null).length;
  const allocation = new Map<string, { assetClass: string; amount: number; count: number }>();
  for (const item of positions) {
    if (item.baseValue === null) continue;
    const group = allocation.get(item.assetClass) || { assetClass: item.assetClass, amount: 0, count: 0 };
    group.amount += item.baseValue; group.count++; allocation.set(item.assetClass, group);
  }
  return { currency, generatedAt, total: positions.length, positions,
    valueCoverage, costCoverage,
    totalValue: valueCoverage ? positions.reduce((sum, item) => sum + (item.baseValue ?? 0), 0) : null,
    totalCost: costCoverage ? positions.reduce((sum, item) => sum + (item.baseCost ?? 0), 0) : null,
    allocation: [...allocation.values()].sort((a, b) => b.amount - a.amount),
  };
}
