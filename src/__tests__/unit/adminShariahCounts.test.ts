import { describe, expect, it } from 'vitest';
import { computeShariahCounts } from '@/lib/market/shariahAdminCatalog';

function fakeAdmin(countsByStatus: Record<string, number>) {
  return {
    from() {
      return {
        select() {
          return {
            eq(_column: string, value: string) {
              return Promise.resolve({ count: countsByStatus[value] ?? 0, error: null });
            },
          };
        },
      };
    },
  } as any;
}

describe('computeShariahCounts', () => {
  it('reflects the full catalog count per status, not a paginated subset', async () => {
    // Real-world scale: far more than the admin page's 50-row search limit.
    const admin = fakeAdmin({ compliant: 4200, non_compliant: 610, needs_review: 88, unclassified: 8409 });
    const counts = await computeShariahCounts(admin);
    expect(counts).toEqual({ compliant: 4200, non_compliant: 610, needs_review: 88, unclassified: 8409 });
  });

  it('defaults every status to zero when the count query returns null', async () => {
    const admin = fakeAdmin({});
    const counts = await computeShariahCounts(admin);
    expect(counts).toEqual({ compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 });
  });
});
