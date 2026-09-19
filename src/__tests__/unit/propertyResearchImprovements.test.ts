import { describe, expect, it, vi } from 'vitest';
import { CURRENCIES, getCurrency } from '@/lib/currencies';
import { WORLD_CURRENCY_METADATA } from '@/lib/worldCurrencies';
import { normalizePropertyLocation, parsePropertyCoordinates, propertyMapLinks } from '@/lib/investments/propertyLocation';
import { parseRealEstateAsset } from '@/lib/investments/intelligence/request-validation';
import { filterPropertyRecords } from '@/lib/investments/propertyRecords';
import type { OfficialPropertyRecord } from '@/lib/investments/intelligence/official-context';
vi.mock('server-only', () => ({}));
import { isNewYorkCityAsset } from '@/lib/investments/intelligence/adapters/nyc-dof-open-data';
import { isChicagoCookCountyAsset } from '@/lib/investments/intelligence/adapters/cook-county-open-data';

describe('world purchase currencies', () => {
  it('includes every current tender code, including new codes on older ICU runtimes', () => {
    expect(Object.keys(WORLD_CURRENCY_METADATA)).toHaveLength(155);
    expect(CURRENCIES.map(item => item.code)).toEqual(expect.arrayContaining(Object.keys(WORLD_CURRENCY_METADATA)));
    expect(CURRENCIES.map(item => item.code)).toEqual(expect.arrayContaining(['XCG', 'ZWG', 'VED', 'BAM', 'KWD']));
    expect(new Set(CURRENCIES.map(item => item.code)).size).toBe(CURRENCIES.length);
    expect(getCurrency('KWD').decimals).toBe(3);
    expect(getCurrency('IQD').decimals).toBe(3);
    expect(getCurrency('XOF').decimals).toBe(0);
  });
});

describe('property location integrity', () => {
  it('encodes international addresses as search text without URL injection', () => {
    const maps = propertyMapLinks({ countryCode: 'KW', propertyType: 'LAND', address: 'شارع 1 & query=wrong' }, 'الكويت');
    expect(new URL(maps!.google).searchParams.get('query')).toBe('شارع 1 & query=wrong, الكويت');
    expect(new URL(maps!.google).searchParams.get('api')).toBe('1');
    expect(maps!.embed).toBeNull();
    expect(propertyMapLinks({ countryCode: '', propertyType: 'LAND' }, '')).toBeNull();
  });
  it('accepts actual points including zero and negative coordinates', () => {
    expect(parsePropertyCoordinates('0, -73.9')).toEqual({ latitude: 0, longitude: -73.9 });
    expect(parsePropertyCoordinates('https://www.google.com/maps/search/?api=1&query=29.3,47.9')).toEqual({ latitude: 29.3, longitude: 47.9 });
    expect(parsePropertyCoordinates('https://www.google.com/maps/place/pin/data=!3d29.3!4d47.9')).toEqual({ latitude: 29.3, longitude: 47.9 });
    expect(parsePropertyCoordinates('https://www.openstreetmap.org/?mlat=29.3&mlon=47.9')).toEqual({ latitude: 29.3, longitude: 47.9 });
  });
  it.each(['91,45', '0,181', ',47.9', 'https://www.google.com.evil.test/maps?q=1,2', 'https://www.google.com/maps/@1,2,10z', 'https://maps.app.goo.gl/short', 'javascript:alert(1)', 'https://www.openstreetmap.org/?mlon=2'])('rejects invalid or ambiguous location %s', input => {
    expect(parsePropertyCoordinates(input)).toBeNull();
  });
  it('validates paired coordinates on the API and bounds map extents', () => {
    const asset = { countryCode: 'US', propertyType: 'LAND', latitude: 0, longitude: 0 };
    expect(parseRealEstateAsset(asset)).toMatchObject(asset);
    expect(parseRealEstateAsset({ ...asset, latitude: '0' })).toBeNull();
    expect(parseRealEstateAsset({ ...asset, longitude: undefined })).toBeNull();
    const map = propertyMapLinks({ ...asset, latitude: 90, longitude: 180 }, 'United States');
    expect(new URL(map!.embed!).searchParams.get('bbox')).toBe('179.992,89.995,180,90');
  });
  it('routes known Arabic cities while excluding other cities in New York state', () => {
    expect(isNewYorkCityAsset(normalizePropertyLocation({ countryCode: 'US', propertyType: 'HOUSE', city: 'نيويورك', district: 'مانهاتن' }))).toBe(true);
    expect(isChicagoCookCountyAsset(normalizePropertyLocation({ countryCode: 'US', propertyType: 'HOUSE', city: 'شيكاغو', region: 'إلينوي' }))).toBe(true);
    expect(normalizePropertyLocation({ countryCode: 'GB', propertyType: 'HOUSE', city: 'لندن' }).city).toBe('London');
    expect(isNewYorkCityAsset({ countryCode: 'US', propertyType: 'HOUSE', city: 'Buffalo', region: 'NY' })).toBe(false);
    expect(isNewYorkCityAsset({ countryCode: 'US', propertyType: 'HOUSE', region: 'NY' })).toBe(false);
  });
});

describe('official record search', () => {
  const record = (id: string, currency: string | null, value: number | null, date: string): OfficialPropertyRecord => ({ id, currency, reportedValue: value, observedOn: date, municipality: 'Test', municipalityAr: '', district: 'الدوحة', districtAr: 'الدوحة', propertyType: 'LAND', propertyTypeAr: 'أرض', usage: null, usageAr: null, areaM2: null, reportedPricePerM2: null, fullOwnership: false, sourceUrl: 'https://www.data.gov.qa/' });
  const rows = [record('usd-high', 'USD', 5000, '2026-01-01'), record('kwd', 'KWD', 9000, '2026-03-01'), record('usd-low', 'USD', 1000, '2026-02-01'), record('unknown', null, null, '2025-01-01')];
  it('filters localized text and currencies without changing source rows', () => {
    expect(filterPropertyRecords(rows, 'أرض', 'LAND', 'USD', 'newest').map(row => row.id)).toEqual(['usd-low', 'usd-high']);
    expect(filterPropertyRecords(rows, '', '', 'unknown', 'newest')).toHaveLength(1);
    expect(filterPropertyRecords(rows, 'no match', '', '', 'newest')).toHaveLength(0);
    expect(rows[0].id).toBe('usd-high');
  });
  it('never sorts unlike currencies as if their values were comparable', () => {
    expect(filterPropertyRecords(rows, '', '', '', 'price-asc').map(row => row.id)).toEqual(['kwd', 'usd-low', 'usd-high', 'unknown']);
    expect(filterPropertyRecords(rows, '', '', 'USD', 'price-desc').map(row => row.id)).toEqual(['usd-high', 'usd-low']);
  });
});
