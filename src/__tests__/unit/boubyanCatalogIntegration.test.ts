import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publicCatalogItem, type CatalogRow } from '@/lib/sharia-research/publicCatalog';
import { classifyShariahCompliance } from '@/lib/market/shariah-screening';
import { resolveCatalogBoubyanReference } from '@/lib/market/boubyanReference.server';
import { BOUBYAN_REFERENCE } from '@/lib/market/boubyanReferenceMetadata';
import { SFM_FTSE_POINT_IN_TIME } from '@/lib/sharia-research/methodologies';
import { SHARIAH_UNIVERSE } from '@/lib/market/shariahUniverse';
import { mergeShariahPublicCatalog, shariahUniverseCatalogItem } from '@/lib/server/shariahPublicCatalog';
import { GET } from '@/app/api/sharia-stocks/screening/route';

const { admin } = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: admin }));
const now = new Date('2026-10-04T09:00:00Z');
const apple: CatalogRow = { symbol: 'AAPL', provider_symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', exchange: 'NASDAQ', country: 'US' };

function verified(status: 'compliant' | 'non_compliant', reviewedAt = now.toISOString()): CatalogRow {
  return { ...apple, shariah_status: status, shariah_source: SFM_FTSE_POINT_IN_TIME.name,
    shariah_reason: 'Independent evidence fixture', shariah_last_reviewed_at: reviewedAt,
    shariah_screening_data: { evidenceVersion: 'sfm-evidence-v2', methodologyId: SFM_FTSE_POINT_IN_TIME.id,
      methodologyVersion: SFM_FTSE_POINT_IN_TIME.version, financialPeriod: '2026-09-30',
      screeningRules: { financial: [{ key: 'debt-to-assets', value: 0.5, verdict: 'fail' }] } } };
}

function mockCatalog(rows: CatalogRow[], error = false) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: error ? null : rows, error: error ? { message: 'unavailable' } : null }) };
  admin.mockReturnValue({ from: () => query });
  return query;
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); admin.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe('Boubyan source adoption and independent decisions', () => {
  it('publishes the exact source row with publication and platform-review dates separated', () => {
    const item = publicCatalogItem(apple, now);
    expect(item.shariahStatus).toBe('compliant');
    expect(item.screeningSource).toBe('Boubyan Capital');
    expect(item.lastScreenedAt).toBe(BOUBYAN_REFERENCE.checkedAt);
    expect(item.publishedShariahReference).toMatchObject({ listId: 'usa', issuedAt: '2026-08-01', page: 1, row: 6,
      exchange: 'NASDAQ', symbol: 'AAPL', nextReviewAt: BOUBYAN_REFERENCE.nextReviewAt });
    expect(item.financialRatios).toBeNull();
    expect(item.methodology.en).toContain('Boubyan');
  });

  it('gives official membership priority over an unsourced seed status', () => {
    const item = publicCatalogItem({ ...apple, shariah_status: 'non_compliant', shariah_source: 'Legacy seed' }, now);
    expect(item.shariahStatus).toBe('compliant');
    expect(item.sourceConflict).toBeNull();
  });

  it('does not infer non-compliance for an omitted ticker or transfer a different venue opinion', () => {
    const missing = publicCatalogItem({ ...apple, symbol: 'META', provider_symbol: 'META', name: 'Meta Platforms, Inc.' }, now);
    expect(missing.shariahStatus).toBe('unclassified');
    expect(missing.boubyanReferenceState).toBe('not_listed');
    expect(missing.boubyanReferenceReason?.en).toContain('absence is not');
    const otherVenue = publicCatalogItem({ ...apple, exchange: 'NYSE' }, now);
    expect(otherVenue.shariahStatus).not.toBe('compliant');
    expect(otherVenue.publishedShariahReference).toBeNull();
  });

  it('keeps the same KFH ticker distinct between Kuwait and Bahrain', () => {
    const row = { symbol: 'KFH', name: 'Kuwait Finance House KSC', asset_type: 'stock' };
    const kuwait = publicCatalogItem({ ...row, provider_symbol: 'KFH.KW', country: 'KW', exchange: 'XKUW' }, now);
    const bahrain = publicCatalogItem({ ...row, provider_symbol: 'KFH.BH', country: 'BH', exchange: 'XBAH' }, now);
    expect(kuwait.shariahStatus).toBe('compliant');
    expect(bahrain.shariahStatus).toBe('compliant');
    expect(kuwait.canonicalSecurityId).not.toBe(bahrain.canonicalSecurityId);
    expect(kuwait.publishedShariahReference?.listId).toBe('kuwait');
    expect(bahrain.publishedShariahReference?.listId).toBe('gcc');
  });

  it('preserves a documented manual decision beyond the seven-day automatic-evidence window', () => {
    const item = publicCatalogItem({ ...apple, shariah_status: 'non_compliant', shariah_manual_override: true,
      shariah_source: 'Documented manual review', shariah_reason: 'Manual investment restriction', shariah_last_reviewed_at: '2026-08-01T00:00:00Z' }, now);
    expect(item.shariahStatus).toBe('non_compliant');
    expect(item.screeningSource).toBe('Documented manual review');
    expect(item.reason.en).toContain('Manual investment restriction');
    expect(item.sourceConflict?.kind).toBe('manual_override');
    expect(item.independentScreening?.shariahStatus).toBe('non_compliant');
  });

  it('exposes a current independent failure as a conflict without attributing its ratios to Boubyan', () => {
    const item = publicCatalogItem(verified('non_compliant'), now);
    expect(item.shariahStatus).toBe('needs_review');
    expect(item.sourceConflict).toMatchObject({ kind: 'source_disagreement', retainedStatus: 'non_compliant' });
    expect(item.screeningSource).toBe('Boubyan Capital');
    expect(item.financialRatios).toBeNull();
    expect(item.independentScreening?.financialRatios).toHaveLength(1);
    expect(item.independentScreening?.methodology.en).toBe(SFM_FTSE_POINT_IN_TIME.name);
  });

  it('retains a current independent decision after the Boubyan quarterly review is due', () => {
    const expired = new Date('2027-01-05T09:00:00Z');
    const item = publicCatalogItem(verified('non_compliant', '2027-01-05T08:00:00Z'), expired);
    expect(item.shariahStatus).toBe('non_compliant');
    expect(item.screeningSource).toBe(SFM_FTSE_POINT_IN_TIME.name);
    expect(item.sourceConflict).toBeNull();
    expect(item.publishedShariahReference).not.toBeNull();
    expect(item.boubyanReferenceState).toBe('review_due');
    expect(publicCatalogItem(apple, expired).shariahStatus).toBe('needs_review');
  });

  it('does not retroactively apply a later platform review', () => {
    const earlier = new Date('2026-09-17T00:00:00Z');
    const item = publicCatalogItem(apple, earlier);
    expect(item.shariahStatus).toBe('unclassified');
    expect(item.publishedShariahReference).toBeNull();
    expect(item.boubyanReferenceState).toBeNull();
  });

  it('keeps common client classification unchanged unless a server reference resolver is injected', () => {
    const input = { symbol: apple.symbol, name: apple.name, assetType: 'stock', exchange: apple.exchange, country: apple.country };
    expect(classifyShariahCompliance(input, { now }).shariahStatus).toBe('needs_review');
    const decision = classifyShariahCompliance(input, { now, resolvePublishedReference: resolveCatalogBoubyanReference });
    expect(decision.shariahStatus).toBe('compliant');
    expect(decision.shariahMethod).toBe('external_provider');
    expect(decision.shariahScreeningData.evidenceVersion).toBeUndefined();
  });

  it('uses the same source-conflict policy in the shared classifier', () => {
    const row = verified('non_compliant');
    const decision = classifyShariahCompliance({ symbol: row.symbol, name: row.name, assetType: row.asset_type,
      exchange: row.exchange, country: row.country, shariahStatus: row.shariah_status, shariahSource: row.shariah_source,
      shariahReason: row.shariah_reason, shariahLastReviewedAt: row.shariah_last_reviewed_at,
      shariahScreeningData: row.shariah_screening_data }, { now, resolvePublishedReference: resolveCatalogBoubyanReference });
    expect(decision.shariahStatus).toBe('needs_review');
    expect(decision.shariahScreeningData.sourceConflict).toMatchObject({ retainedStatus: 'non_compliant' });
    expect(decision.shariahScreeningData.screeningRules).toBeUndefined();
    expect(decision.shariahScreeningData.independentScreening).toMatchObject({ status: 'non_compliant' });
  });
});

describe('publication availability is independent of catalog storage', () => {
  it.each(['unavailable', 'error'] as const)('returns the reviewed source and only vetted universe matches when storage is %s', async state => {
    if (state === 'unavailable') admin.mockReturnValue(null);
    else mockCatalog([], true);
    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.code).toBe('SCREENING_CATALOG_DEGRADED');
    expect(payload.reference).toMatchObject({ sourceAvailable: true, rowCount: 3282, sourceMode: 'reviewed_publication_snapshot' });
    expect(payload.catalogStorage).toMatchObject({ state, complete: false, manualOverridesChecked: false });
    const items = payload.items as ReturnType<typeof publicCatalogItem>[];
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(SHARIAH_UNIVERSE.length);
    expect(items.every(item => SHARIAH_UNIVERSE.some(asset => asset.symbol === item.symbol))).toBe(true);
    expect(items.find(item => item.symbol === 'AAPL')?.shariahStatus).toBe('compliant');
  });

  it('does not append a second reviewed identity when the catalog already contains it', () => {
    const items = mergeShariahPublicCatalog([apple, { ...apple, name: 'Another Apple Issuer', exchange: 'NYSE' }], now);
    expect(items.filter(item => item.canonicalSecurityId === 'NASDAQ:AAPL')).toHaveLength(1);
    expect(items.filter(item => item.symbol === 'AAPL')).toHaveLength(2);
    expect(items.find(item => item.canonicalSecurityId === 'NYSE:AAPL')?.shariahStatus).not.toBe('compliant');
  });

  it('does not bypass an unresolved stored override with a ticker-only universe fallback', () => {
    const rows = mergeShariahPublicCatalog([{ ...apple, exchange: null, shariah_manual_override: true,
      shariah_status: 'non_compliant', shariah_source: 'Manual', shariah_reason: 'Pending identity review', shariah_last_reviewed_at: now.toISOString() }], now);
    expect(rows.filter(item => item.symbol === 'AAPL')).toHaveLength(1);
    expect(shariahUniverseCatalogItem('AAPL', rows, now)?.shariahStatus).toBe('needs_review');
  });

  it('does not transfer sponsor designation to an unrelated issuer or unknown venue', () => {
    const duringSponsorReview = new Date('2026-09-20T00:00:00Z');
    for (const exchange of ['NASDAQ', null]) {
      const items = mergeShariahPublicCatalog([{ symbol: 'HLAL', name: 'Completely Different Issuer ETF', asset_type: 'etf', exchange }], duringSponsorReview);
      expect(items.find(item => item.name === 'Completely Different Issuer ETF')?.shariahStatus).not.toBe('compliant');
    }
  });

  it('paginates all stored rows before merging source matches', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({ symbol: `UNKNOWN_${index}`, name: `Unknown ${index}`, asset_type: 'stock', exchange: 'NASDAQ' }));
    const query = mockCatalog([]);
    query.range.mockResolvedValueOnce({ data: firstPage, error: null }).mockResolvedValueOnce({ data: [apple], error: null });
    const payload = await (await GET()).json();
    expect(query.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(payload.catalogStorage).toMatchObject({ complete: true, loadedRows: 1001 });
    expect((payload.items as ReturnType<typeof publicCatalogItem>[]).filter(item => item.canonicalSecurityId === 'NASDAQ:AAPL')).toHaveLength(1);
  });
});
