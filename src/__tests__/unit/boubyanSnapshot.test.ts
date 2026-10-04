import { describe, expect, it } from 'vitest';
import snapshot from '@/data/shariah/boubyan-q2-2026.json';
import { BOUBYAN_REFERENCE } from '@/lib/market/boubyanReferenceMetadata';
import { createBoubyanReferenceResolver, type BoubyanReferenceRow } from '@/lib/market/boubyanReference';

const rows = snapshot as BoubyanReferenceRow[];
const resolve = createBoubyanReferenceResolver(rows);
const now = new Date('2026-10-04T09:00:00Z');

describe('audited Boubyan Q2 2026 publication snapshot', () => {
  it('retains every numbered source entry without collapsing cross-venue symbols', () => {
    expect(rows).toHaveLength(3282);
    for (const source of BOUBYAN_REFERENCE.lists) {
      const entries = rows.filter(row => row.listId === source.id);
      expect(entries).toHaveLength(source.rowCount);
      expect(Math.max(...entries.map(row => row.page))).toBe(source.pages);
    }
    const provenance = new Set(rows.map(row => `${row.listId}:${row.page}:${row.row}`));
    expect(provenance.size).toBe(rows.length);
    expect(rows.every(row => row.assetType === 'security')).toBe(true);
    expect(rows.filter(row => row.symbol === 'CBM.N')).toHaveLength(2);
  });

  it('attributes a real Apple match to its original page, row and issue date', () => {
    const result = resolve({ symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', assetType: 'stock' }, { now });
    expect(result.state).toBe('listed');
    expect(result.reference).toMatchObject({
      source: 'BOUBYAN', reportingPeriod: 'Q2 2026', issuedAt: '2026-08-01',
      page: 1, row: 6, symbol: 'AAPL', exchange: 'NASDAQ',
    });
    expect(result.reference?.issuedAt).not.toBe(result.reference?.checkedAt);
    expect(result.reference?.sourceUrl).toBe(BOUBYAN_REFERENCE.lists[2].url);
  });

  it('keeps the Kuwait listing distinct from the similarly named US security', () => {
    const kuwait = resolve({ symbol: 'KFH.KW', name: 'Kuwait Finance House KSC', exchange: 'KSE', assetType: 'stock' }, { now });
    expect(kuwait.state).toBe('listed');
    expect(kuwait.reference).toMatchObject({ listId: 'kuwait', page: 1, row: 4 });
    const differentVenue = resolve({ symbol: 'KFH', name: 'Kuwait Finance House KSC', exchange: 'NYSE', assetType: 'stock' }, { now });
    expect(differentVenue.shariahStatus).not.toBe('compliant');
  });

  it('does not repair the source ETG.N issuer pairing into a TSM designation', () => {
    const literal = rows.find(row => row.symbol === 'ETG.N');
    expect(literal).toMatchObject({ name: 'Taiwan Semiconductor Manufacturing Co Ltd', page: 24, row: 796 });
    const result = resolve({ symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing Co Ltd', exchange: 'NYSE', assetType: 'stock' }, { now });
    expect(result.shariahStatus).not.toBe('compliant');
    expect(result.shariahStatus).not.toBe('non_compliant');
  });

  it('does not transfer a literal duplicated vendor ticker across issuer names', () => {
    const result = resolve({ symbol: 'CBM.N', name: 'AK Steel Holding Corp', exchange: 'NASDAQ', assetType: 'stock' }, { now });
    expect(result.state).toBe('identity_mismatch');
    expect(result.shariahStatus).toBe('needs_review');
  });

  it('preserves missing UAE venue data rather than inventing ADX or DFM', () => {
    const uae = rows.filter(row => row.country === 'AE');
    expect(uae).toHaveLength(110);
    expect(uae.every(row => row.exchange === null)).toBe(true);
    const result = resolve({ symbol: 'GFH', name: 'GFH Financial Group BSC', exchange: 'DFM', assetType: 'stock' }, { now });
    expect(result.state).toBe('ambiguous');
    expect(result.shariahStatus).toBe('needs_review');
  });
});
