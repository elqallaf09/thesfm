import { describe, expect, it } from 'vitest';
import { BOUBYAN_REFERENCE } from '@/lib/market/boubyanReferenceMetadata';
import type { BoubyanReferenceProvenance } from '@/lib/market/boubyanReference';
import {
  createShariahNewsLookup, isSecurityScreeningStale, reconcileShariahSecurities,
  securityAnalysisSymbol, securityKey, securityMarket, securityResearchQuery,
  screeningCatalogWarning, matchesSecurityAnalysisResult,
  type ScreeningItem, type ShariahQuote,
} from '@/components/shariah-stocks/shariahStockPresentation';

function screening(symbol: string, exchange: string | null, extra: Partial<ScreeningItem> = {}): ScreeningItem {
  return {
    symbol, exchange, name: `${exchange} ${symbol}`, sector: 'Technology', industry: 'Software',
    assetType: 'stock', shariahStatus: 'compliant', statusLabelAr: 'متوافق',
    reason: { ar: '', en: '', fr: '' }, screeningSource: 'Independent source',
    methodology: { ar: '', en: '', fr: '' }, lastScreenedAt: '2026-07-29',
    notes: { ar: '', en: '', fr: '' }, ...extra,
  };
}

function quote(symbol: string, exchange: string | null, extra: Partial<ShariahQuote> = {}): ShariahQuote {
  return {
    ...screening(symbol, exchange), exchange, price: 123, currency: 'USD',
    change: 2, changePercent: 1.5, source: 'Quote provider', available: true,
    delayed: true, screeningMethodology: 'Independent source', ...extra,
  };
}

const reference: BoubyanReferenceProvenance = {
  id: 'test-row', canonicalId: 'NASDAQ:TEST', identityKey: 'NASDAQ:TEST', source: 'BOUBYAN',
  sourceName: 'Boubyan Capital', sourceUrl: BOUBYAN_REFERENCE.lists[2].url,
  brokerageUrl: BOUBYAN_REFERENCE.brokerageUrl, listId: 'usa', reportingPeriod: 'Q2 2026',
  issuedAt: '2026-08-01', checkedAt: BOUBYAN_REFERENCE.checkedAt, nextReviewAt: BOUBYAN_REFERENCE.nextReviewAt,
  page: 1, row: 1, symbol: 'TEST', name: 'Test issuer', exchange: 'NASDAQ', country: 'US', publishedStatus: 'compliant',
};

describe('Sharia page security identity', () => {
  it('joins venue aliases and deduplicates the same resolved identity', () => {
    const rows = reconcileShariahSecurities([
      screening('TEST', 'NASDAQ'), screening('TEST', 'NSDQ'),
    ], [quote('TEST', 'XNAS')]);
    expect(rows).toHaveLength(1);
    expect(rows[0].quote?.price).toBe(123);
    expect(securityKey(rows[0])).toBe('NASDAQ:TEST');
  });

  it('keeps equal Gulf and US tickers separate and never borrows the US price', () => {
    const rows = reconcileShariahSecurities([
      screening('SAME', 'DFM'), screening('SAME', 'NASDAQ'),
    ], [quote('SAME', 'NASDAQ')]);
    expect(rows).toHaveLength(2);
    expect(rows.find(row => securityMarket(row) === 'DFM')?.quote).toBeUndefined();
    expect(rows.find(row => securityMarket(row) === 'NASDAQ')?.quote?.price).toBe(123);
    expect(new Set(rows.map(securityKey)).size).toBe(2);
  });

  it('keeps a quote from another venue visible as a separate security', () => {
    const rows = reconcileShariahSecurities([screening('SAME', 'QSE')], [quote('SAME', 'NYSE')]);
    expect(rows.map(securityKey)).toEqual(['QSE:SAME', 'NYSE:SAME']);
    expect(rows[0].quote).toBeUndefined();
    expect(rows[1].quote?.exchange).toBe('NYSE');
  });

  it('does not assign an exchange-specific quote to an unresolved screening identity', () => {
    const rows = reconcileShariahSecurities([screening('TEST', null)], [quote('TEST', 'NASDAQ')]);
    expect(rows).toHaveLength(2);
    expect(rows[0].quote).toBeUndefined();
  });

  it('derives market filters from the screening identity without requiring quotes', () => {
    const rows = reconcileShariahSecurities([screening('TEST', 'XNAS'), screening('1120', 'TADAWUL')], []);
    expect(rows.map(securityMarket)).toEqual(['NASDAQ', 'TADAWUL']);
    expect(securityKey({ symbol: 'NBK.KW' })).toBe('BOURSA_KUWAIT:NBK');
    expect(securityKey({ symbol: 'BRK.B', exchange: 'XNYS' })).toBe('NYSE:BRK.B');
    expect(securityKey({ symbol: 'BRK', exchange: 'NYSE' })).not.toBe(securityKey({ symbol: 'BRK.B', exchange: 'NYSE' }));
  });

  it('does not link ambiguous news by bare ticker and respects explicit venue context', () => {
    const rows = reconcileShariahSecurities([screening('SAME', 'DFM'), screening('SAME', 'NASDAQ')], []);
    const lookup = createShariahNewsLookup(rows);
    expect(lookup({ ticker: 'SAME' })).toBeUndefined();
    expect(lookup({ ticker: 'SAME', exchange: 'XNAS' })?.exchange).toBe('NASDAQ');
    expect(lookup({ ticker: 'SAME.DU' })?.exchange).toBe('DFM');
    expect(lookup({ ticker: 'SAME', exchange: 'NYSE' })).toBeUndefined();
  });

  it('links unqualified news only to one resolved security and never overrides conflicting context', () => {
    const lookup = createShariahNewsLookup(reconcileShariahSecurities([screening('TEST', 'NASDAQ')], []));
    expect(lookup({ ticker: 'TEST' })?.symbol).toBe('TEST');
    expect(lookup({ ticker: 'TEST', exchange: 'LSE' })).toBeUndefined();
    expect(lookup({ ticker: 'TEST', exchange: 'NASDAQ', country: 'KW' })).toBeUndefined();
  });

  it('preserves published evidence on quote-only rows', () => {
    const rows = reconcileShariahSecurities([], [quote('TEST', 'NASDAQ', {
      publishedShariahReference: reference, screeningSource: 'Boubyan Capital', boubyanReferenceState: 'listed',
    })], Date.parse('2026-10-04T00:00:00Z'));
    expect(rows[0].publishedShariahReference).toEqual(reference);
    expect(rows[0].stale).toBe(false);
  });
});

describe('Published reference review dates and safe actions', () => {
  it('uses the reference deadline rather than elapsed days since publication', () => {
    const row = screening('TEST', 'NASDAQ', {
      screeningSource: 'Boubyan Capital', publishedShariahReference: reference, boubyanReferenceState: 'listed',
    });
    expect(isSecurityScreeningStale(row, Date.parse('2026-12-31T00:00:00Z'))).toBe(false);
    expect(isSecurityScreeningStale(row, Date.parse(reference.nextReviewAt))).toBe(true);
    expect(isSecurityScreeningStale({ ...row, boubyanReferenceState: 'review_due' }, Date.parse('2026-10-04T00:00:00Z'))).toBe(true);
  });

  it('retains the independent screening date when a separate source decision is current', () => {
    const row = screening('TEST', 'NASDAQ', {
      publishedShariahReference: reference, lastScreenedAt: '2024-01-01', screeningSource: 'Independent source',
    });
    expect(isSecurityScreeningStale(row, Date.parse('2026-10-04T00:00:00Z'))).toBe(true);
  });

  it('passes regional provider symbols to the analysis API and venue context to deep research', () => {
    expect(securityAnalysisSymbol({ symbol: 'NBK', exchange: 'KSE' })).toBe('NBK.KW');
    expect(securityAnalysisSymbol({ symbol: 'EMAAR', exchange: 'DFM', providerSymbol: 'EMAAR.DU' })).toBe('EMAAR.DU');
    expect(securityAnalysisSymbol({ symbol: '1120', exchange: 'TADAWUL' })).toBe('1120.SR');
    expect(securityAnalysisSymbol({ symbol: 'QIBK', exchange: 'QSE' })).toBe('QIBK.QA');
    expect(securityAnalysisSymbol({ symbol: 'TEST', exchange: 'NSDQ' })).toBe('TEST');
    expect(securityResearchQuery({ symbol: 'NBK', exchange: 'KSE' })).toBe('BOURSA_KUWAIT:NBK');
  });

  it('never sends unresolved or contradictory identities into a default US analysis', () => {
    expect(securityAnalysisSymbol({ symbol: 'SAME' })).toBeNull();
    expect(securityAnalysisSymbol({ symbol: 'SAME', exchange: 'NASDAQ', providerSymbol: 'SAME.DU' })).toBeNull();
    expect(securityAnalysisSymbol({ symbol: 'SAME', exchange: 'NASDAQ_DUBAI' })).toBeNull();
  });

  it('rejects a successful analysis that resolved to another market fallback', () => {
    const gulf = { symbol: 'SAME', exchange: 'DFM' };
    expect(matchesSecurityAnalysisResult(gulf, { symbol: 'SAME', providerSymbol: 'SAME.DU' })).toBe(true);
    expect(matchesSecurityAnalysisResult(gulf, { symbol: 'SAME', providerSymbol: 'SAME' })).toBe(false);
    expect(matchesSecurityAnalysisResult(gulf, { symbol: 'SAME', providerSymbol: 'SAME.KW' })).toBe(false);
    expect(matchesSecurityAnalysisResult(gulf, {})).toBe(false);
  });

  it('shows catalog degradation independently and removes the message after recovery', () => {
    const storage = { state: 'available' as const, complete: true, manualOverridesChecked: true, loadedRows: 20 };
    expect(screeningCatalogWarning({ catalogStorage: storage }, 'en')).toBe('');
    expect(screeningCatalogWarning({ catalogStorage: { ...storage, complete: false } }, 'ar')).toContain('سجل الفحص الداخلي');
    expect(screeningCatalogWarning({ code: 'SCREENING_CATALOG_DEGRADED' }, 'en')).toContain('manual decisions');
    expect(screeningCatalogWarning({}, 'fr')).toBe('');
  });
});
