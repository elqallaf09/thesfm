import { describe, expect, it } from 'vitest';
import {
  parseRequestedStripIds,
  symbolsForSelectedStrips,
} from '@/lib/market/marketStripSelection';

function url(ids: string) {
  return new URL(`https://the-sfm.com/api/market-strips?ids=${encodeURIComponent(ids)}`);
}

describe('market strips API selection', () => {
  it('accepts and deduplicates no more than four IDs', () => {
    expect(parseRequestedStripIds(url('kuwait_boursa,kuwait_boursa,forex'))).toEqual(['kuwait_boursa', 'forex']);
  });

  it('rejects an empty request, a fifth ID, and unknown IDs', () => {
    expect(() => parseRequestedStripIds(url(''))).toThrow('invalid_strip_count');
    expect(() => parseRequestedStripIds(url('kuwait_boursa,saudi_tadawul,us_nasdaq,forex,crypto'))).toThrow('invalid_strip_count');
    expect(() => parseRequestedStripIds(url('made_up_market'))).toThrow('unknown_strip_id');
  });

  it('rejects exchanges without verified quote coverage', () => {
    expect(() => parseRequestedStripIds(url('egypt_egx'))).toThrow('strip_coverage_unavailable');
  });

  it('returns only selected-strip symbols without duplicates', () => {
    const symbols = symbolsForSelectedStrips(['kuwait_boursa', 'forex']);
    expect(symbols).toContain('NBK.KW');
    expect(symbols).toContain('EURUSD=X');
    expect(symbols).not.toContain('AAPL');
    expect(new Set(symbols).size).toBe(symbols.length);
  });
});
