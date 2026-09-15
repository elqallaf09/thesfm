import { describe, expect, it } from 'vitest';
import { bosniaReportObservationToSource } from './bosnia-fbih';
import { turkeyTkgmObservationToSource } from './turkey-tkgm';

describe('official real-estate source boundaries', () => {
  it('labels Bosnia FBiH RCN report data as official report evidence, not an invented transaction', () => {
    const result = bosniaReportObservationToSource({ reportYear: 2026, currency: 'BAM', unitValue: 250, sourceUrl: 'https://katastar.ba/rcn', region: 'Sarajevo Canton', propertyType: 'LAND' });
    expect(result.evidenceType).toBe('OFFICIAL_REPORT');
    expect(result.authority).toBe('GOVERNMENT');
    expect(result.countryCode).toBe('BA');
  });

  it('does not allow the TKGM adapter contract to claim open official transaction-price evidence', () => {
    const result = turkeyTkgmObservationToSource({ externalId: 'parcel-context', evidenceType: 'OFFICIAL_REGISTRY', sourceUrl: 'https://www.tkgm.gov.tr/', city: 'Istanbul', propertyType: 'LAND' });
    expect(result.evidenceType).toBe('OFFICIAL_REGISTRY');
    expect(result.authority).toBe('GOVERNMENT');
    expect(result.countryCode).toBe('TR');
    expect(result.limitations).toContain('transaction-price');
  });
});
