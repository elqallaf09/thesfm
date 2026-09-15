import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeShariahCounts } from '@/lib/market/shariahAdminCatalog';
function fakeAdmin(values: Record<string, number | null>) {
  return { from: () => ({ select: () => ({ eq: (_: string, status: string) => ({ eq: (key: string, active: boolean) => {
    expect([key, active]).toEqual(['is_active', true]);
    return { abortSignal: () => Promise.resolve({ count: Object.hasOwn(values, status) ? values[status] : 0, error: null }) };
  } }) }) }) } as unknown as SupabaseClient;
}
describe('computeShariahCounts', () => {
  it('counts the active full catalog rather than its visible page', async () => {
    const expected = { compliant: 4200, non_compliant: 610, needs_review: 88, unclassified: 8409 };
    expect(await computeShariahCounts(fakeAdmin(expected))).toEqual(expected);
  });
  it('retains an explicitly counted zero', async () => {
    expect(await computeShariahCounts(fakeAdmin({}))).toEqual({ compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 });
  });
  it('does not display unavailable counts as zero', async () => {
    await expect(computeShariahCounts(fakeAdmin({ compliant: null }))).rejects.toThrow('SHARIAH_COUNTS_UNAVAILABLE');
  });
});
