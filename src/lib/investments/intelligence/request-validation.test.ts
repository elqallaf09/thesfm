import { describe, expect, it } from 'vitest';
import { parseRealEstateAsset, readPropertyJson } from './request-validation';

const asset = { countryCode: 'QA', propertyType: 'LAND', landArea: 100, landAreaUnit: 'M2' };
describe('property analysis request boundary', () => {
  it('projects known fields and rejects malformed geography, units, numerics and dates', () => {
    expect(parseRealEstateAsset({ ...asset, evil: 'not forwarded' })).toEqual(asset);
    for (const input of [null, [], { ...asset, countryCode: 'qa' }, { ...asset, propertyType: 'unsupported' }, { ...asset, city: {} }, { ...asset, district: 'x'.repeat(161) }, { ...asset, landArea: Infinity }, { ...asset, landArea: '100' }, { ...asset, landAreaUnit: 'ACRE' }, { ...asset, purchaseDate: '2025-02-30' }, { ...asset, purchaseCurrency: 'US' }]) expect(parseRealEstateAsset(input)).toBeNull();
  });
  it('bounds real body bytes without depending on a Content-Length header', async () => {
    const request = (value: string) => new Request('https://example.invalid', { method: 'POST', body: value });
    await expect(readPropertyJson(request(JSON.stringify({ asset })))).resolves.toEqual({ asset });
    await expect(readPropertyJson(request('x'.repeat(20_000)))).rejects.toThrow('PAYLOAD_TOO_LARGE');
    await expect(readPropertyJson(request('{'))).rejects.toThrow();
  });
});
