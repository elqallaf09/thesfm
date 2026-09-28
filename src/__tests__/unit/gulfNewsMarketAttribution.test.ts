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

  it('does not assign a shared country-only item to either UAE exchange', () => {
    expect(resolveGulfNewsMarket(story({ countries: ['AE'] }))).toBeNull();
  });
});
