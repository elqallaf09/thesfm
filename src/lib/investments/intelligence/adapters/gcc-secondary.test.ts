import { describe, expect, it } from 'vitest';
import { abuDhabiAdrecRecordToObservation, bahrainSlrbRecordToObservation, kuwaitMojRecordToObservation, qatarMojRecordToObservation } from './gcc-secondary';

describe('GCC official transaction adapter boundaries', () => {
  it('maps a Kuwait MOJ sale only when value and area exist', () => {
    const row = kuwaitMojRecordToObservation({ totalValueKwd: 250000, landAreaM2: 500, area: 'Salwa' });
    expect(row?.unitValue).toBe(500);
    expect(row?.currency).toBe('KWD');
    expect(kuwaitMojRecordToObservation({ totalValueKwd: 250000 })).toBeNull();
  });

  it('keeps Qatar aggregate-only rows out of comparable evidence', () => {
    expect(qatarMojRecordToObservation({ totalValueQar: 1_000_000, municipality: 'Doha' })).toBeNull();
    expect(qatarMojRecordToObservation({ totalValueQar: 1_000_000, areaM2: 400, municipality: 'Doha' })?.unitValue).toBe(2500);
  });

  it('requires released Bahrain transaction value and area', () => {
    expect(bahrainSlrbRecordToObservation({ totalValueBhd: 120000, areaM2: 300 })?.unitValue).toBe(400);
    expect(bahrainSlrbRecordToObservation({ areaM2: 300 })).toBeNull();
  });

  it('does not turn Abu Dhabi index/aggregate data into a comparable without area', () => {
    expect(abuDhabiAdrecRecordToObservation({ totalValueAed: 2_000_000, district: 'Yas Island' })).toBeNull();
    const row = abuDhabiAdrecRecordToObservation({ totalValueAed: 2_000_000, areaM2: 200, district: 'Yas Island' });
    expect(row?.unitValue).toBe(10000);
    expect(row?.currency).toBe('AED');
  });
});
