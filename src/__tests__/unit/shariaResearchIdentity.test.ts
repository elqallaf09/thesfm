import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: () => null }));
vi.mock('@/lib/market/marketSymbolDirectory', () => ({ searchBundledMarketSymbols: () => [] }));
vi.mock('@/lib/market/usSymbolResolver', () => ({ searchUSSymbols: async () => ({ source: 'static', results: [] }) }));
vi.mock('@/lib/sharia-research/secData', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/sharia-research/secData')>();
  return {
    ...actual,
    loadSecCompanyDirectory: async () => [
      { cik: '0001045810', name: 'NVIDIA CORP', ticker: 'NVDA', exchange: 'Nasdaq' },
      { cik: '0001652044', name: 'Alphabet Inc.', ticker: 'GOOG', exchange: 'Nasdaq' },
      { cik: '0001652044', name: 'Alphabet Inc.', ticker: 'GOOGL', exchange: 'Nasdaq' },
    ],
  };
});

import { identifySecurity } from '@/lib/sharia-research/identifySecurity';
import { isValidIsin, normalizeQuery } from '@/lib/sharia-research/normalizeQuery';

describe('Sharia research security identification', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it.each(['NVIDIA', 'NVDA', 'إنفيديا', 'NVIDIA CORP'])("resolves '%s' to the same confirmed security", async query => {
    const result = await identifySecurity(query);
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.security.ticker).toBe('NVDA');
      expect(result.security.cik).toBe('0001045810');
    }
  });

  it('returns a selection requirement when multiple share classes match equally', async () => {
    const result = await identifySecurity('Alphabet Inc.');
    expect(result.status).toBe('ambiguous');
    expect(result.candidates.map(candidate => candidate.ticker)).toEqual(['GOOG', 'GOOGL']);
  });

  it('normalizes exchange symbols and validates an ISIN check digit', () => {
    const normalized = normalizeQuery('NASDAQ:NVDA');
    expect(normalized.possibleTicker).toBe('NVDA');
    expect(normalized.exchangeHint).toBe('NASDAQ');
    expect(isValidIsin('US67066G1040')).toBe(true);
    expect(isValidIsin('US67066G1041')).toBe(false);
  });
});
