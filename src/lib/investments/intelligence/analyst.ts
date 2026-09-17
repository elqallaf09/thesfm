import 'server-only';
import type { ValuationEvidence } from './contracts';
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
import { collectLaCountyPropertyContext, isLosAngelesCountyAsset, laCountyContextUnavailable } from './adapters/la-county-assessor';

export interface RealEstateAnalystResult {
  status: 'VALUED' | 'INSUFFICIENT_EVIDENCE' | 'SOURCE_COVERAGE_UNAVAILABLE' | 'SOURCE_DATA_REVIEW_REQUIRED';
  valuation: ValuationRangeResult | null;
  evidence: ValuationEvidence[];
  sourceFailures: Array<{ adapterId: string; reason: string }>;
  evidenceCount: number;
  message: string;
  officialContext?: OfficialPropertyContext;
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
  if (isLosAngelesCountyAsset(asset)) {
    try { return await collectLaCountyPropertyContext(asset); } catch { return laCountyContextUnavailable(); }
  }
  return undefined;
}

export async function analyzeRealEstateAsset(asset: RealEstateAssetInput, outputCurrency: string, fxQuotes: FxQuote[] = []): Promise<RealEstateAnalystResult> {
  const adapters = getRealEstateSourceAdapters(asset.countryCode);
  const officialContext = await collectOfficialContext(asset);
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
  const collected = await collectRealEstateEvidence(asset, adapters);
  // Context rows must NEVER pass to the valuation engine or snapshot persistence.
  const valuation = buildRealEstateValuationRange(asset, collected.evidence, outputCurrency, fxQuotes);
  return {
    status: valuation.status, valuation, evidence: collected.evidence,
    sourceFailures: [...contextFailures, ...collected.failures], evidenceCount: collected.evidence.length,
    message: valuation.status === 'VALUED' ? 'Valuation range is backed by the listed evidence and methodology version.' : 'Available evidence is not sufficient for a defensible current valuation.',
    ...(officialContext ? { officialContext } : {}),
  };
}
