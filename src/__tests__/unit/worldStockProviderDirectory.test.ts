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
  it('deduplicates case variants within one venue and rejects incomplete metadata before persistence', () => {
    const row = { symbol: 'QA', name: 'Synthetic QA listing', exchange: 'London', mic_code: 'XLON', currency: 'GBP', country: 'United Kingdom', type: 'Common Stock' };
    const rows = parseProviderDirectory({ status: 'ok', data: [row, { ...row, symbol: 'qa' }, { ...row, symbol: 'EMPTY', country: '' }, { ...row, symbol: 'LONG', name: 'x'.repeat(1025) }] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ symbol: 'QA', providerSymbol: 'qa', exchange: 'TD_XLON' });
  });
  it.each([
    ['Czech Republic', 'CZ', 'XPRA'], ['Hungary', 'HU', 'XBUD'], ['Romania', 'RO', 'XBSE'],
    ['Estonia', 'EE', 'XTAL'], ['Latvia', 'LV', 'XRIS'], ['Lithuania', 'LT', 'XLIT'],
    ['Iceland', 'IS', 'XICE'], ['Russia', 'RU', 'MISX'],
    ['Czechia', 'CZ', 'XPRA'], ['Luxembourg', 'LU', 'XLUX'], ['Croatia', 'HR', 'XZAG'], ['Slovenia', 'SI', 'XLJU'],
    ['Slovakia', 'SK', 'XBRA'], ['Bulgaria', 'BG', 'XBUL'], ['Cyprus', 'CY', 'XCYS'], ['Ukraine', 'UA', 'UKEX'],
  ])('normalizes the European provider country %s to %s', (country, iso, mic_code) => {
    const [row] = parseProviderDirectory({ status: 'ok', data: [{ symbol: 'QA', name: 'Synthetic QA listing', exchange: mic_code,
      mic_code, currency: 'EUR', country, type: 'Common Stock' }] });
    expect(row).toMatchObject({ country: iso, exchange: `TD_${mic_code}` });
  });
  it('retains British-pence listings without relabeling them as pounds', () => {
    const [row] = parseProviderDirectory({ status: 'ok', data: [{ symbol: 'PENCE', name: 'Synthetic London listing', exchange: 'London',
      mic_code: 'XLON', currency: 'GBp', country: 'United Kingdom', type: 'Common Stock' }] });
    expect(row).toMatchObject({ currency: 'GBp', country: 'GB', exchange: 'TD_XLON' });
  });
});
