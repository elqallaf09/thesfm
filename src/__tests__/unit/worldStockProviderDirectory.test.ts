import { describe, it, expect } from 'vitest';
import { parseProviderDirectory } from '@/lib/world-stocks/providerDirectory';
describe('world provider directory validation', () => {
  it('keeps exchange identities separate, excludes primary duplicates, and rejects malformed metadata', () => {
    const row = { symbol: 'QA', name: 'Synthetic QA listing', exchange: 'London', mic_code: 'XLON', currency: 'GBP', country: 'United Kingdom', type: 'Common Stock' };
    const parsed = parseProviderDirectory({ status: 'ok', data: [row, row, { ...row, mic_code: 'XPAR', exchange: 'Paris', currency: 'EUR', country: 'France' }, { ...row, mic_code: 'XNAS' }, { ...row, currency: 'UNKNOWN' }, { ...row, type: 'ETF' }, { ...row, symbol: '<script>' }] });
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ exchange: 'TD_XLON', country: 'GB', currency: 'GBP' });
    expect(parsed[1]).toMatchObject({ exchange: 'TD_XPAR', country: 'FR', currency: 'EUR' });
  });
  it('fails closed on provider errors', () => {
    expect(() => parseProviderDirectory({ status: 'error', code: 429 })).toThrow('INVALID_DIRECTORY');
  });
});
