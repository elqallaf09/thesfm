import { describe, expect, it } from 'vitest';
import { mapDubaiDldTransaction } from './dubai-dld';
import { mapOmanMohupRow } from './oman-mohup';
import { mapSaudiRegaDeal } from './saudi-rega';

describe('GCC official real-estate adapters', () => {
  it('maps Saudi official deals to SAR per square meter', () => {
    const row = mapSaudiRegaDeal({ id: '1', valueSar: 1_000_000, areaM2: 500, district: 'Test', propertyType: 'LAND' }, 'https://rei.rega.gov.sa/');
    expect(row?.evidenceType).toBe('OFFICIAL_TRANSACTION');
    expect(row?.unitValue).toBe(2000);
    expect(row?.currency).toBe('SAR');
  });

  it('maps Dubai DLD transaction values without changing their official type', () => {
    const row = mapDubaiDldTransaction({ transactionNumber: '1', amount: 2_000_000, propertyAreaM2: 1000, area: 'Test', propertyType: 'Land' }, 'https://dubailand.gov.ae/');
    expect(row?.authority).toBe('GOVERNMENT');
    expect(row?.unitValue).toBe(2000);
    expect(row?.currency).toBe('AED');
  });

  it('maps Oman MOHUP open transaction data to OMR per square meter', () => {
    const row = mapOmanMohupRow({ id: '1', saleValue: 50_000, areaM2: 500, governorate: 'Muscat', landUse: 'LAND' }, 'https://mohup.gov.om/en/open-data/data');
    expect(row?.unitValue).toBe(100);
    expect(row?.currency).toBe('OMR');
  });

  it('rejects rows that cannot produce a defensible unit comparable', () => {
    expect(mapSaudiRegaDeal({ valueSar: 1_000_000 }, 'https://rei.rega.gov.sa/')).toBeNull();
    expect(mapDubaiDldTransaction({ amount: 1_000_000 }, 'https://dubailand.gov.ae/')).toBeNull();
    expect(mapOmanMohupRow({ saleValue: 1_000 }, 'https://mohup.gov.om/')).toBeNull();
  });
});
