import { describe, expect, it } from 'vitest';
import { nextExplorerVisibleCount } from '@/lib/market/globalMarketsPagination';

describe('Global Markets Explorer pagination', () => {
  it('appends one bounded desktop page', () => {
    expect(nextExplorerVisibleCount(12, 100, false)).toBe(24);
  });

  it('uses a smaller bounded mobile page', () => {
    expect(nextExplorerVisibleCount(12, 100, true)).toBe(18);
  });

  it('never exceeds the filtered result total', () => {
    expect(nextExplorerVisibleCount(12, 17, false)).toBe(17);
    expect(nextExplorerVisibleCount(17, 17, true)).toBe(17);
  });
});
