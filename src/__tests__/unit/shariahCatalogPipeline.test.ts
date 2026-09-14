import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { analyzeShariaEvidence } from '@/lib/sharia-research/shariaAnalyzer';
import { catalogPatchForResearch, syncResearchResultToCatalog } from '@/lib/sharia-research/catalogSync';
import { publicCatalogItem } from '@/lib/sharia-research/publicCatalog';
import { SFM_FTSE_POINT_IN_TIME, MSCI_ISLAMIC_INDEX_JULY_2025 } from '@/lib/sharia-research/methodologies';
import { security, evidenceFixture } from './shariaEvidenceFixtures';
const { document, values } = evidenceFixture();
const now = new Date('2026-09-14T12:00:00Z');
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); });
function report() { return analyzeShariaEvidence({ security, documents: [document], financialValues: values, methodology: SFM_FTSE_POINT_IN_TIME }); }
function database(rows: unknown[], affected = 1) {
  const writes: unknown[] = [];
  const read = {
    in() { return this; }, eq() { return this; },
    then(resolve: (value: { data: unknown[]; error: null }) => unknown) { return Promise.resolve({ data: rows, error: null }).then(resolve); },
  };
  const write = { eq() { return this; }, select: async () => ({ data: Array.from({ length: affected }, () => ({ id: 'row' })), error: null }) };
  const from = () => ({ select: () => read, update: (patch: unknown) => { writes.push(patch); return write; } });
  return { admin: { from } as unknown as SupabaseClient, writes };
}
describe('research, persisted catalog, and public display use the same evidence', () => {
  it('publishes a verified result rather than an old static needs_review list', () => {
    const patch = catalogPatchForResearch(report());
    const item = publicCatalogItem({ symbol: security.ticker, name: security.name, ...patch }, now);
    expect(item.shariahStatus).toBe('compliant');
    expect(item.lastScreenedAt).toBe(now.toISOString());
    expect(item.financialRatios).toHaveLength(4);
    expect(item.screeningSource).toContain('SFM');
    expect(JSON.stringify(patch)).not.toContain('user_id');
  });
  it('allows a verified failure without inventing missing income', () => {
    const result = analyzeShariaEvidence({ security, documents: [document], methodology: SFM_FTSE_POINT_IN_TIME,
      financialValues: values.filter(v => ['total_assets','interest_bearing_debt'].includes(v.normalizedField)).map(v => v.normalizedField === 'interest_bearing_debt' ? { ...v, value: 900 } : v) });
    expect(publicCatalogItem({ symbol: security.ticker, ...catalogPatchForResearch(result) }, now).shariahStatus).toBe('non_compliant');
  });
  it('does not republish old or differently defined methodologies as FTSE', async () => {
    const result = report(); result.methodology = MSCI_ISLAMIC_INDEX_JULY_2025;
    const db = database([]);
    expect(await syncResearchResultToCatalog(db.admin, result)).toMatchObject({ updated: 0, reason: 'different_methodology' });
    expect(() => catalogPatchForResearch({ ...report(), evidenceVersion: undefined })).toThrow();
  });
  it('does not publish private source URLs as public decisive evidence', () => {
    const result = report(); result.documents[0] = { ...document, adapterId: 'manual-url-source' };
    expect(() => catalogPatchForResearch(result)).toThrow('NON_PUBLIC_DECISIVE_EVIDENCE');
  });
  it.each(['2020-01-01T00:00:00Z', '2099-01-01T00:00:00Z'])('does not display stale/future review as current: %s', date => {
    const row = { symbol: security.ticker, ...catalogPatchForResearch(report()), shariah_last_reviewed_at: date };
    expect(publicCatalogItem(row, now).shariahStatus).toBe('needs_review');
  });
  it('does not trust old seed or generic-provider connectivity as a classification', () => {
    expect(publicCatalogItem({ symbol: 'TEST', shariah_status: 'compliant', shariah_source: 'FMP', shariah_last_reviewed_at: now.toISOString() }).shariahStatus).toBe('needs_review');
  });
  it('synchronizes exact identities and counts only affected rows', async () => {
    const db = database([{ id: 'row', exchange: 'XNAS', updated_at: '2026-09-01', shariah_manual_override: false }]);
    expect(await syncResearchResultToCatalog(db.admin, report())).toMatchObject({ updated: 1 });
    expect(db.writes).toHaveLength(1);
  });
  it('preserves manual opinions and does not match ticker-only across exchanges', async () => {
    const db = database([{ id: 'manual', exchange: 'XNAS', shariah_manual_override: true }, { id: 'other', exchange: 'KSE', shariah_manual_override: false }]);
    expect(await syncResearchResultToCatalog(db.admin, report())).toMatchObject({ updated: 0 });
    expect(db.writes).toHaveLength(0);
  });
  it('does not claim success when a concurrent edit wins compare-and-swap', async () => {
    const db = database([{ id: 'row', exchange: 'XNAS', updated_at: 'old', shariah_manual_override: false }], 0);
    expect(await syncResearchResultToCatalog(db.admin, report())).toMatchObject({ updated: 0 });
  });
});
