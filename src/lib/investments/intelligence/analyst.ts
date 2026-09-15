import type { ValuationEvidence } from './contracts';
import type { RealEstateAssetInput } from './real-estate';
import { collectRealEstateEvidence } from './sources';
import { getRealEstateSourceAdapters } from './source-registry';
import type { FxQuote, ValuationRangeResult } from './valuation-range';
import { buildRealEstateValuationRange } from './valuation-range';

export interface RealEstateAnalystResult {
  status: 'VALUED' | 'INSUFFICIENT_EVIDENCE' | 'SOURCE_COVERAGE_UNAVAILABLE';
  valuation: ValuationRangeResult | null;
  evidence: ValuationEvidence[];
  sourceFailures: Array<{ adapterId: string; reason: string }>;
  evidenceCount: number;
  message: string;
}

export async function analyzeRealEstateAsset(asset: RealEstateAssetInput, outputCurrency: string, fxQuotes: FxQuote[] = []): Promise<RealEstateAnalystResult> {
  const adapters = getRealEstateSourceAdapters(asset.countryCode);
  if (adapters.length === 0) return { status:'SOURCE_COVERAGE_UNAVAILABLE', valuation:null, evidence:[], sourceFailures:[], evidenceCount:0, message:`No verified real-estate evidence adapter is configured for ${asset.countryCode}.` };
  const collected = await collectRealEstateEvidence(asset, adapters);
  const valuation = buildRealEstateValuationRange(asset, collected.evidence, outputCurrency, fxQuotes);
  return { status:valuation.status, valuation, evidence:collected.evidence, sourceFailures:collected.failures, evidenceCount:collected.evidence.length, message:valuation.status==='VALUED'?'Valuation range is backed by the listed evidence and methodology version.':'Available evidence is not sufficient for a defensible current valuation.' };
}
