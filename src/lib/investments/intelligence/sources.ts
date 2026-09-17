import type { EvidenceAuthority, InvestmentEvidenceType, MatchQuality, ValuationEvidence } from './contracts';
import type { RealEstateAssetInput } from './real-estate';

export interface RealEstateSourceObservation {
  externalId?: string;
  evidenceType: InvestmentEvidenceType;
  authority: EvidenceAuthority;
  sourceName: string;
  sourceUrl?: string;
  observedOn?: string;
  amount?: number;
  currency?: string;
  unitValue?: number;
  unitCode?: 'M2' | 'FT2';
  countryCode?: string;
  region?: string;
  city?: string;
  district?: string;
  propertyType?: string;
  limitations?: string;
}

export interface RealEstateEvidenceSourceAdapter {
  id: string;
  supportedCountries: readonly string[];
  authority: EvidenceAuthority;
  search(asset: RealEstateAssetInput): Promise<RealEstateSourceObservation[]>;
}

function normalize(value?: string): string {
  return value?.trim().toLocaleLowerCase('en-US') ?? '';
}

export function geographyMatch(asset: RealEstateAssetInput, observation: RealEstateSourceObservation): MatchQuality {
  if (observation.countryCode && observation.countryCode !== asset.countryCode) return 'WEAK';
  const assetDistrict = normalize(asset.district);
  const sourceDistrict = normalize(observation.district);
  if (assetDistrict && sourceDistrict && assetDistrict === sourceDistrict) return 'EXACT';
  const assetCity = normalize(asset.city ?? asset.municipality);
  const sourceCity = normalize(observation.city);
  if (assetCity && sourceCity && assetCity === sourceCity) return 'STRONG';
  const assetRegion = normalize(asset.region);
  const sourceRegion = normalize(observation.region);
  if (assetRegion && sourceRegion && assetRegion === sourceRegion) return 'PARTIAL';
  return observation.countryCode === asset.countryCode ? 'PARTIAL' : 'UNKNOWN';
}

export function propertyMatch(asset: RealEstateAssetInput, observation: RealEstateSourceObservation): MatchQuality {
  if (!observation.propertyType) return 'UNKNOWN';
  return normalize(observation.propertyType) === normalize(asset.propertyType) ? 'EXACT' : 'PARTIAL';
}

export function observationToEvidence(
  adapter: RealEstateEvidenceSourceAdapter,
  asset: RealEstateAssetInput,
  observation: RealEstateSourceObservation,
  retrievedAt = new Date().toISOString(),
): ValuationEvidence {
  return {
    id: `${adapter.id}:${observation.externalId ?? crypto.randomUUID()}`,
    type: observation.evidenceType,
    authority: observation.authority,
    sourceName: observation.sourceName,
    sourceUrl: observation.sourceUrl,
    observedOn: observation.observedOn,
    retrievedAt,
    assetMatch: propertyMatch(asset, observation),
    geographyMatch: geographyMatch(asset, observation),
    amount: observation.amount,
    currency: observation.currency,
    unitValue: observation.unitValue,
    unitCode: observation.unitCode,
    limitations: observation.limitations,
  };
}

export async function collectRealEstateEvidence(
  asset: RealEstateAssetInput,
  adapters: RealEstateEvidenceSourceAdapter[],
): Promise<{ evidence: ValuationEvidence[]; failures: Array<{ adapterId: string; reason: string }> }> {
  const eligible = adapters.filter((adapter) => adapter.supportedCountries.includes(asset.countryCode));
  const settled = await Promise.allSettled(eligible.map(async (adapter) => ({ adapter, observations: await adapter.search(asset) })));
  const evidence: ValuationEvidence[] = [];
  const failures: Array<{ adapterId: string; reason: string }> = [];

  settled.forEach((result, index) => {
    const adapter = eligible[index];
    if (result.status === 'rejected') {
      failures.push({ adapterId: adapter.id, reason: result.reason instanceof Error ? result.reason.message : 'Source adapter failed.' });
      return;
    }
    for (const observation of result.value.observations) {
      evidence.push(observationToEvidence(adapter, asset, observation));
    }
  });

  return { evidence, failures };
}
