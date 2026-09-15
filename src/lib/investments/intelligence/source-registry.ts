import type { RealEstateEvidenceSourceAdapter } from './sources';

/**
 * Production registry for real-estate evidence adapters.
 *
 * Important: countries are intentionally not populated with placeholder adapters.
 * A country becomes supported only when a real public/contracted source has an
 * implemented adapter, provenance rules, and tests. This prevents the UI from
 * implying coverage that THE SFM does not actually have.
 */
const adapters: RealEstateEvidenceSourceAdapter[] = [];

export function registerRealEstateSourceAdapter(adapter: RealEstateEvidenceSourceAdapter): void {
  if (adapters.some((item) => item.id === adapter.id)) throw new Error(`Duplicate real-estate source adapter: ${adapter.id}`);
  adapters.push(adapter);
}

export function getRealEstateSourceAdapters(countryCode: string): RealEstateEvidenceSourceAdapter[] {
  return adapters.filter((adapter) => adapter.supportedCountries.includes(countryCode));
}

export function getRealEstateCoverage(): Array<{ countryCode: string; adapterIds: string[] }> {
  const coverage = new Map<string, string[]>();
  for (const adapter of adapters) {
    for (const countryCode of adapter.supportedCountries) {
      coverage.set(countryCode, [...(coverage.get(countryCode) ?? []), adapter.id]);
    }
  }
  return [...coverage.entries()].map(([countryCode, adapterIds]) => ({ countryCode, adapterIds }));
}
