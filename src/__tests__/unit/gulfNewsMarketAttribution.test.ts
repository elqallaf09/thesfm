import { describe, expect, it } from 'vitest';

import { resolveGulfNewsMarket } from '@/lib/gulf/resolveNewsMarket';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';

function story(overrides: Partial<ConsolidatedNewsStory>) {
  return {
    marketCodes: ['GULF'],
    exchangeCodes: [],
    countries: [],
    title: 'Exchange announcement',
    summary: null,
    ...overrides,
  } as ConsolidatedNewsStory;
}

describe('Gulf news market attribution', () => {
  it('uses a specific exchange code before the shared UAE country code', () => {
    expect(resolveGulfNewsMarket(story({
      marketCodes: ['GULF', 'ADX', 'AE'],
      exchangeCodes: ['ADX'],
      countries: ['AE'],
    }))).toBe('uae-adx');
  });

  it('keeps canonical DFM provider tags assigned to DFM', () => {
    expect(resolveGulfNewsMarket(story({
      marketCodes: ['GULF', 'DFM', 'AE', 'UAE', 'uae-dfm'],
      exchangeCodes: ['DFM'],
      countries: ['AE'],
    }))).toBe('uae-dfm');
  });

  it('leaves a merged multi-exchange story unassigned instead of choosing DFM by list order', () => {
    expect(resolveGulfNewsMarket(story({
      marketCodes: ['GULF', 'ADX', 'DFM', 'AE'],
      exchangeCodes: ['ADX', 'DFM'],
      countries: ['AE'],
    }))).toBeNull();
  });

  it('does not assign a shared country-only item to either UAE exchange', () => {
    expect(resolveGulfNewsMarket(story({ countries: ['AE'] }))).toBeNull();
  });

  it('prioritizes the named exchange source over unrelated enrichment tags', () => {
    expect(resolveGulfNewsMarket(story({
      marketCodes: ['GULF', 'KUWAIT'],
      exchangeCodes: ['DFM', 'BOURSA_KUWAIT'],
      countries: ['AE', 'KW'],
      sourceName: 'Dubai Financial Market — Disclosures',
      sourceDomain: 'dfm.ae',
    }))).toBe('uae-dfm');
  });

  it('uses QSE and ADX exchange codes for their own panels', () => {
    expect(resolveGulfNewsMarket(story({ exchangeCodes: ['QSE'], countries: ['QA'] }))).toBe('qatar');
    expect(resolveGulfNewsMarket(story({ exchangeCodes: ['ADX'], countries: ['AE'] }))).toBe('uae-adx');
  });
});
