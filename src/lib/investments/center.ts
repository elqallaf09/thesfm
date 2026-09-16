import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { investmentLinkedSymbol } from '@/lib/investmentCalculations';
import type { Investment } from '@/types/investment';

export const INVESTMENT_CENTER_ASSET_CLASSES = [
  'overview',
  'stocks',
  'real-estate',
  'gold-silver',
  'crypto',
  'funds',
  'bonds',
  'commodities',
] as const;

export type InvestmentCenterAssetClass = typeof INVESTMENT_CENTER_ASSET_CLASSES[number];

export const CANONICAL_INVESTMENT_ASSET_TYPES = [
  'STOCK', 'REAL_ESTATE', 'GOLD', 'SILVER', 'CRYPTO', 'FUND', 'BOND', 'COMMODITY', 'OTHER',
] as const;

export type CanonicalInvestmentAssetType = typeof CANONICAL_INVESTMENT_ASSET_TYPES[number];

const LEGACY_TYPE_TO_CANONICAL: Record<string, CanonicalInvestmentAssetType | null> = {
  stock: 'STOCK',
  stocks: 'STOCK',
  realestate: 'REAL_ESTATE',
  real_estate: 'REAL_ESTATE',
  property: 'REAL_ESTATE',
  gold: 'GOLD',
  silver: 'SILVER',
  crypto: 'CRYPTO',
  fund: 'FUND',
  funds: 'FUND',
  bond: 'BOND',
  bonds: 'BOND',
  commodity: 'COMMODITY',
  commodities: 'COMMODITY',
  other: 'OTHER',
  cash: null,
  project: null,
};

const CLASS_BY_TYPE: Record<CanonicalInvestmentAssetType, InvestmentCenterAssetClass> = {
  STOCK: 'stocks',
  REAL_ESTATE: 'real-estate',
  GOLD: 'gold-silver',
  SILVER: 'gold-silver',
  CRYPTO: 'crypto',
  FUND: 'funds',
  BOND: 'bonds',
  COMMODITY: 'commodities',
  OTHER: 'overview',
};

const ANALYST_TYPE_BY_INVESTMENT_TYPE: Partial<Record<CanonicalInvestmentAssetType, IntelligenceAssetType>> = {
  STOCK: 'STOCK',
  CRYPTO: 'CRYPTO',
  FUND: 'FUND',
  GOLD: 'COMMODITY',
  SILVER: 'COMMODITY',
  COMMODITY: 'COMMODITY',
};

function safeText(value: unknown, maxLength: number) {
  const text = String(value ?? '').trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function safeCurrency(value: unknown) {
  const currency = safeText(value, 3)?.toUpperCase() ?? null;
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function safeMarket(value: unknown) {
  const market = safeText(value, 80);
  return market && /^[A-Za-z0-9 .:_/-]+$/.test(market) ? market : null;
}

function safeUuid(value: unknown) {
  const id = safeText(value, 36)?.toLowerCase() ?? null;
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
    ? id
    : null;
}

export function canonicalInvestmentAssetType(value: unknown): CanonicalInvestmentAssetType | null {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return LEGACY_TYPE_TO_CANONICAL[raw] ?? null;
}

export function investmentCenterAssetClassFor(value: unknown): InvestmentCenterAssetClass {
  const type = canonicalInvestmentAssetType(value);
  return type ? CLASS_BY_TYPE[type] : 'overview';
}

export function isInvestmentCenterAssetClass(value: string): value is InvestmentCenterAssetClass {
  return (INVESTMENT_CENTER_ASSET_CLASSES as readonly string[]).includes(value);
}

export function investmentMatchesCenterAssetClass(investment: Investment, assetClass: InvestmentCenterAssetClass) {
  return assetClass === 'overview'
    || investmentCenterAssetClassFor(investment.assetType ?? investment.type) === assetClass;
}

export type InvestmentAnalysisContext = {
  investmentId: string | null;
  investmentAssetType: CanonicalInvestmentAssetType | null;
  market: string | null;
  currency: string | null;
  source: 'investments';
  privateAsset: boolean;
};

export type InvestmentAnalysisLinkInput = Pick<Investment, 'id' | 'symbol' | 'providerSymbol' | 'assetType' | 'type' | 'market' | 'currency'> & {
  canonicalAssetIdentifier?: string | null;
  horizon?: IntelligenceHorizon;
};

/**
 * Builds the sole Investments -> AI Analyst handoff. It never embeds a second
 * recommendation surface in Investments. For a private asset without a public
 * market identifier, the target remains a supported canonical child route but
 * is marked private so the analyst shows an honest unavailable state instead
 * of sending a made-up ticker to a data provider.
 */
export function investmentAnalysisHref(input: InvestmentAnalysisLinkInput) {
  const investmentId = safeUuid(input.id);
  const investmentAssetType = canonicalInvestmentAssetType(input.assetType ?? input.type);
  const engineAssetType = investmentAssetType ? ANALYST_TYPE_BY_INVESTMENT_TYPE[investmentAssetType] : undefined;
  const linkedSymbol = safeText(input.canonicalAssetIdentifier, 32)
    ?? safeText(investmentLinkedSymbol(input as Investment), 32);
  const hasPublicMarketIdentity = Boolean(linkedSymbol && engineAssetType);
  const privateIdentifier = investmentId
    ? `INV-${investmentId.replace(/-/g, '').slice(0, 28).toUpperCase()}`
    : 'INV-PRIVATE-ASSET';
  const routeSymbol = hasPublicMarketIdentity ? linkedSymbol!.toUpperCase() : privateIdentifier;
  const params = new URLSearchParams({
    assetType: engineAssetType ?? 'STOCK',
    horizon: input.horizon ?? 'POSITION',
    source: 'investments',
  });

  if (investmentId) params.set('investmentId', investmentId);
  if (investmentAssetType) params.set('investmentAssetType', investmentAssetType);
  const market = safeMarket(input.market);
  const currency = safeCurrency(input.currency);
  if (market) params.set('market', market);
  if (currency) params.set('currency', currency);
  if (!hasPublicMarketIdentity) params.set('privateAsset', '1');

  return `/ai-analyst/analyze/${encodeURIComponent(routeSymbol)}?${params.toString()}`;
}

export function investmentAnalysisContextFromQuery(input: {
  investmentId?: string | null;
  investmentAssetType?: string | null;
  market?: string | null;
  currency?: string | null;
  source?: string | null;
  privateAsset?: string | null;
}): InvestmentAnalysisContext | null {
  if (input.source !== 'investments') return null;
  return {
    investmentId: safeUuid(input.investmentId),
    investmentAssetType: canonicalInvestmentAssetType(input.investmentAssetType),
    market: safeMarket(input.market),
    currency: safeCurrency(input.currency),
    source: 'investments',
    privateAsset: input.privateAsset === '1',
  };
}
