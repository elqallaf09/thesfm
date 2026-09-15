import { describe, expect, it } from 'vitest';
import type { RealEstateEvidenceSourceAdapter } from './sources';
import { collectRealEstateEvidence, geographyMatch } from './sources';

const asset = { countryCode: 'BA', region: 'Sarajevo Canton', city: 'Sarajevo', district: 'Centar', propertyType: 'LAND' };

describe('real estate source adapters', () => {
  it('matches district/city/country deterministically', () => {
    expect(geographyMatch(asset, { evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT', sourceName: 'x', countryCode: 'BA', district: 'Centar' })).toBe('EXACT');
    expect(geographyMatch(asset, { evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT', sourceName: 'x', countryCode: 'BA', city: 'Sarajevo' })).toBe('STRONG');
    expect(geographyMatch(asset, { evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT', sourceName: 'x', countryCode: 'TR', city: 'Sarajevo' })).toBe('WEAK');
  });

  it('isolates a failing provider instead of losing evidence from healthy providers', async () => {
    const healthy: RealEstateEvidenceSourceAdapter = {
      id: 'official-ba', supportedCountries: ['BA'], authority: 'GOVERNMENT',
      async search() { return [{ externalId: '1', evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT', sourceName: 'Official source', countryCode: 'BA', city: 'Sarajevo', propertyType: 'LAND', currency: 'BAM', unitValue: 100, unitCode: 'M2' }]; },
    };
    const broken: RealEstateEvidenceSourceAdapter = {
      id: 'broken-ba', supportedCountries: ['BA'], authority: 'GOVERNMENT',
      async search() { throw new Error('temporary upstream failure'); },
    };
    const result = await collectRealEstateEvidence(asset, [healthy, broken]);
    expect(result.evidence).toHaveLength(1);
    expect(result.failures).toEqual([{ adapterId: 'broken-ba', reason: 'temporary upstream failure' }]);
  });

  it('does not call adapters for a different country', async () => {
    let called = false;
    const turkeyOnly: RealEstateEvidenceSourceAdapter = {
      id: 'tr', supportedCountries: ['TR'], authority: 'GOVERNMENT',
      async search() { called = true; return []; },
    };
    await collectRealEstateEvidence(asset, [turkeyOnly]);
    expect(called).toBe(false);
  });
});
