import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { evidenceFixture } from './shariaEvidenceFixtures';
const { enrich } = vi.hoisted(() => ({ enrich: vi.fn() }));
vi.mock('@/lib/market/shariahFundamentals', () => ({ enrichShariahScreeningData: enrich }));
import { refreshSfmShariahClassifications } from '@/lib/market/shariahSelfScreening';
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-09-14T12:00:00Z')); enrich.mockReset(); });
afterEach(() => { vi.useRealTimers(); });
function db(rows: number, affected = 1) {
  let next = 0; const finished: Record<string, unknown>[] = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === 'finish_shariah_refresh') { finished.push(args); return { data: affected, error: null }; }
    const data = [];
    while (next < rows && data.length < Number(args.p_limit)) data.push({ id: String(++next), symbol: 'TEST', name: 'Test Software', provider_symbol: 'TEST', country: 'US', exchange: 'NASDAQ', updated_at: '2026-09-01T00:00:00Z' });
    return { data, error: null };
  });
  const runs: unknown[] = [];
  const admin = { rpc, from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'run-id' }, error: null }) }) }),
    update: (value: unknown) => { runs.push(value); return { eq: async () => ({ error: null }) }; } }) } as unknown as SupabaseClient;
  return { admin, rpc, finished, runs };
}
function sourceResult() { const f = evidenceFixture(); return { security: f.security, documents: [f.document], financialValues: f.values, errors: [] }; }
describe('bounded refresh persistence', () => {
  it('processes multiple actual batches with no repeated first page and counts stored results', async () => {
    enrich.mockImplementation(async () => sourceResult()); const store = db(7);
    const result = await refreshSfmShariahClassifications(store.admin);
    expect(result).toMatchObject({ ok: true, scanned: 7, updated: 7, compliant: 7, hasMore: false });
    expect(store.finished).toHaveLength(7);
    expect(store.finished[0]).toHaveProperty('p_expected_updated_at');
    expect(store.runs[0]).toMatchObject({ status: 'completed' });
  });
  it('does not count zero-row concurrent manual overrides as successful', async () => {
    enrich.mockImplementation(async () => sourceResult()); const store = db(1, 0);
    expect(await refreshSfmShariahClassifications(store.admin)).toMatchObject({ updated: 0, skippedConcurrent: 1 });
  });
  it('sends no classification replacement on failed fetch and reports a failed run', async () => {
    enrich.mockResolvedValue({ documents: [], financialValues: [], errors: ['official_provider_fetch_failed'] }); const store = db(1);
    expect(await refreshSfmShariahClassifications(store.admin)).toMatchObject({ ok: false, updated: 0 });
    expect(store.finished[0]).toMatchObject({ p_patch: null, p_error: 'official_provider_fetch_failed' });
    expect(store.runs[0]).toMatchObject({ status: 'failed' });
  });
  it('stops at the explicit limit and reports more work rather than claiming full completion', async () => {
    enrich.mockImplementation(async () => sourceResult()); const store = db(20);
    expect(await refreshSfmShariahClassifications(store.admin, { limit: 4 })).toMatchObject({ scanned: 4, updated: 4, hasMore: true });
  });
  it('records partial progress when one stock fails without discarding the other saves', async () => {
    enrich.mockResolvedValueOnce(sourceResult()).mockResolvedValueOnce({ documents: [], financialValues: [], errors: ['official_provider_timed_out'] }).mockResolvedValue(sourceResult());
    const store = db(3); const result = await refreshSfmShariahClassifications(store.admin);
    expect(result).toMatchObject({ ok: false, updated: 2, scanned: 3, status: 'partial', fatal: false });
    expect(store.runs[0]).toMatchObject({ status: 'partial' });
  });
  it('caps interactive requests at three stocks even when a legacy caller asks for 50', async () => {
    enrich.mockResolvedValue(sourceResult()); const store = db(50);
    const result = await refreshSfmShariahClassifications(store.admin, { limit: 50, interactive: true });
    expect(result).toMatchObject({ ok: true, updated: 3, scanned: 3, hasMore: true });
    expect(store.rpc.mock.calls.filter(([name]) => name === 'claim_shariah_refresh_batch')).toHaveLength(1);
  });
  it('fails closed when the migration/run table is unavailable', async () => {
    const admin = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: null, error: {} }) }) }) }) } as unknown as SupabaseClient;
    await expect(refreshSfmShariahClassifications(admin)).rejects.toThrow('REFRESH_MIGRATION_OR_DATABASE_UNAVAILABLE');
    expect(enrich).not.toHaveBeenCalled();
  });
});
