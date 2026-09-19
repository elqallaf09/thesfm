import 'server-only';
import { normalizePropertyLocation } from '../propertyLocation';
import type { ValuationEvidence } from './contracts';
import { qualifiedTransactionEvidence } from './transactionEvidence';
import type { RealEstateAssetInput } from './real-estate';
import { collectRealEstateEvidence } from './sources';
import { getRealEstateSourceAdapters } from './source-registry';
import type { FxQuote, ValuationRangeResult } from './valuation-range';
import { buildRealEstateValuationRange } from './valuation-range';
import type { OfficialPropertyContext } from './official-context';
import { collectQatarPropertyContext, qatarContextUnavailable } from './adapters/qatar-open-data';
import { collectUkHmlrPropertyContext, ukHmlrContextUnavailable } from './adapters/uk-hmlr-open-data';
import { collectNycPropertyContext, isNewYorkCityAsset, nycContextUnavailable } from './adapters/nyc-dof-open-data';
import { collectCookCountyPropertyContext, cookCountyContextUnavailable, isChicagoCookCountyAsset } from './adapters/cook-county-open-data';

export interface RealEstateAnalystResult {
  status: 'VALUED' | 'INSUFFICIENT_EVIDENCE' | 'SOURCE_COVERAGE_UNAVAILABLE' | 'SOURCE_DATA_REVIEW_REQUIRED';
  valuation: ValuationRangeResult | null;
  evidence: ValuationEvidence[];
  sourceFailures: Array<{ adapterId: string; reason: string }>;
  evidenceCount: number;
  message: string;
  officialContext?: OfficialPropertyContext;
  requestedCurrency?: string;
  nativeCurrencyFallback?: boolean;
  qualifiedEvidenceCount?: number;
}

async function collectOfficialContext(asset: RealEstateAssetInput): Promise<OfficialPropertyContext | undefined> {
  if (asset.countryCode === 'QA') {
    try { return await collectQatarPropertyContext(asset); } catch { return qatarContextUnavailable(); }
  }
  if (asset.countryCode === 'GB') {
    try { return await collectUkHmlrPropertyContext(asset); } catch { return ukHmlrContextUnavailable(); }
  }
  if (isNewYorkCityAsset(asset)) {
    try { return await collectNycPropertyContext(asset); } catch { return nycContextUnavailable(); }
  }
  if (isChicagoCookCountyAsset(asset)) {
    try { return await collectCookCountyPropertyContext(asset); } catch { return cookCountyContextUnavailable(); }
  }
  return undefined;
}

export async function analyzeRealEstateAsset(asset: RealEstateAssetInput, outputCurrency: string, fxQuotes: FxQuote[] = [], purpose: 'valuation' | 'market_context' = 'valuation'): Promise<RealEstateAnalystResult> {
  asset = normalizePropertyLocation(asset);
  const adapters = purpose === 'market_context' ? [] : getRealEstateSourceAdapters(asset.countryCode).filter(adapter => !adapter.supportsAsset || adapter.supportsAsset(asset));
  const [officialContext, collected] = await Promise.all([
    collectOfficialContext(asset),
    adapters.length ? collectRealEstateEvidence(asset, adapters) : Promise.resolve({ evidence: [] as ValuationEvidence[], failures: [] as Array<{ adapterId: string; reason: string }> }),
  ]);
  const contextFailures = officialContext?.status === 'UNAVAILABLE'
    ? [{ adapterId: officialContext.providerId, reason: 'Official public source could not be verified. No fallback prices were supplied.' }] : [];
  if (adapters.length === 0) {
    return {
      status: officialContext && officialContext.status !== 'UNAVAILABLE' ? 'SOURCE_DATA_REVIEW_REQUIRED' : 'SOURCE_COVERAGE_UNAVAILABLE',
      valuation: null, evidence: [], sourceFailures: contextFailures, evidenceCount: 0,
      message: officialContext ? 'Official source connection is separate from valuation readiness. Inspect source dates and limitations.' : `No verified real-estate evidence adapter is configured for ${asset.countryCode}.`,
      ...(officialContext ? { officialContext } : {}),
    };
  }
  // Context rows must NEVER pass to the valuation engine or snapshot persistence.
  let valuation = buildRealEstateValuationRange(asset, collected.evidence, outputCurrency, fxQuotes);
  const qualified = qualifiedTransactionEvidence(collected.evidence);
  // A display-currency preference must not suppress a valid native-currency estimate.
  // Never mix currencies or guess an exchange rate; label the fallback explicitly.
  const currencies = [...new Set(qualified.map(item => item.currency!))];
  let nativeCurrencyFallback = false;
  if (valuation.status !== 'VALUED' && currencies.length === 1 && currencies[0] !== outputCurrency) {
    const native = buildRealEstateValuationRange(asset, collected.evidence, currencies[0]);
    if (native.status === 'VALUED') { valuation = native; nativeCurrencyFallback = true; }
  }
  return {
    status: valuation.status, valuation, evidence: collected.evidence,
    sourceFailures: [...contextFailures, ...collected.failures], evidenceCount: collected.evidence.length,
    requestedCurrency: outputCurrency, nativeCurrencyFallback, qualifiedEvidenceCount: valuation.evidenceIds.length,
    message: valuation.status === 'VALUED' ? 'Valuation range is backed by the listed evidence and methodology version.' : 'Available evidence is not sufficient for a defensible current valuation.',
    ...(officialContext ? { officialContext } : {}),
  };
}
