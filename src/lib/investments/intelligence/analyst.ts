import 'server-only';
import type { ValuationEvidence } from './contracts';
import type { RealEstateAssetInput } from './real-estate';
import { collectRealEstateEvidence } from './sources';
import { getRealEstateSourceAdapters } from './source-registry';
import type { FxQuote, ValuationRangeResult } from './valuation-range';
import { buildRealEstateValuationRange } from './valuation-range';
import type { OfficialPropertyContext } from './official-context';
import { collectQatarPropertyContext, qatarContextUnavailable } from './adapters/qatar-open-data';

export interface RealEstateAnalystResult {
  status: 'VALUED' | 'INSUFFICIENT_EVIDENCE' | 'SOURCE_COVERAGE_UNAVAILABLE' | 'SOURCE_DATA_REVIEW_REQUIRED';
  valuation: ValuationRangeResult | null;
  evidence: ValuationEvidence[];
  sourceFailures: Array<{ adapterId: string; reason: string }>;
  evidenceCount: number;
  message: string;
  officialContext?: OfficialPropertyContext;
}

export async function analyzeRealEstateAsset(asset: RealEstateAssetInput, outputCurrency: string, fxQuotes: FxQuote[] = []): Promise<RealEstateAnalystResult> {
  const adapters = getRealEstateSourceAdapters(asset.countryCode);
  let officialContext: OfficialPropertyContext | undefined;
  if (asset.countryCode === 'QA') {
    try { officialContext = await collectQatarPropertyContext(asset); }
    catch { officialContext = qatarContextUnavailable(); }
  }
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
