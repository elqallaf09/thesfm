import { describe, expect, it } from 'vitest';
import {
  boubyanSecurityKey,
  createBoubyanReferenceResolver,
  normalizeBoubyanCompanyName,
  normalizeBoubyanExchange,
  resolveBoubyanReference,
  type BoubyanReferenceInput,
  type BoubyanReferenceMetadata,
  type BoubyanReferenceRow,
} from '@/lib/market/boubyanReference';
import { BOUBYAN_REFERENCE } from '@/lib/market/boubyanReferenceMetadata';
import publishedRows from '@/data/shariah/boubyan-q2-2026.json';

const NOW = new Date('2026-10-04T08:00:00.000Z');

const MICROSOFT: BoubyanReferenceRow = {
  listId: 'usa', symbol: 'MSFT', name: 'Microsoft Corp', exchange: 'NSDQ',
  country: 'US', page: 45, row: 1523, assetType: 'security',
};
const KFH: BoubyanReferenceRow = {
  listId: 'kuwait', symbol: 'KFH', name: 'Kuwait Finance House KSC',
  exchange: 'BOURSA_KUWAIT', country: 'KW', page: 1, row: 4, assetType: 'security',
};
const INPUT: BoubyanReferenceInput = {
  symbol: 'MSFT', exchange: 'NASDAQ', country: 'US', name: 'Microsoft Corporation', assetType: 'stock',
};
const ROWS = [MICROSOFT, KFH];

function resolve(input: BoubyanReferenceInput = INPUT, rows: readonly BoubyanReferenceRow[] = ROWS, now = NOW, metadata: BoubyanReferenceMetadata = BOUBYAN_REFERENCE) {
  return resolveBoubyanReference(input, { rows, now, metadata });
}

describe('Boubyan publication identity and provenance', () => {
  it('matches a known stock with harmless legal suffix differences and exact venue', () => {
    const result = resolve();
    expect(result).toMatchObject({ state: 'listed', shariahStatus: 'compliant', source: 'BOUBYAN' });
    expect(result.reference).toMatchObject({
      canonicalId: 'NASDAQ:MSFT', identityKey: 'NASDAQ:MSFT', symbol: 'MSFT',
      name: 'Microsoft Corp', exchange: 'NASDAQ', country: 'US',
      listId: 'usa', reportingPeriod: 'Q2 2026', issuedAt: '2026-08-01',
      checkedAt: BOUBYAN_REFERENCE.checkedAt, nextReviewAt: BOUBYAN_REFERENCE.nextReviewAt,
      page: 45, row: 1523, publishedStatus: 'compliant',
    });
    expect(result.reference?.sourceUrl).toBe(BOUBYAN_REFERENCE.lists.find(row => row.id === 'usa')?.url);
    expect(result.reference?.id).toBe('BOUBYAN:Q2 2026:usa:45:1523');
    for (const locale of ['ar', 'en', 'fr'] as const) {
      expect(result.reason[locale]).toContain('Q2 2026');
      expect(result.reason[locale]).toContain('2026-08-01');
      expect(result.statusLabel[locale]).toContain('Q2 2026');
    }
    expect(result).not.toHaveProperty('financialRatios');
    expect(result).not.toHaveProperty('purification');
  });

  it('normalizes share wording but preserves economically meaningful identity terms', () => {
    expect(normalizeBoubyanCompanyName('Microsoft Corporation Common Stock')).toBe('microsoft');
    expect(normalizeBoubyanCompanyName('Spotify Technology S.A. Ordinary Shares')).toBe('spotify technology');
    expect(normalizeBoubyanCompanyName('Al Noor Holdings P.J.S.C.')).toBe('al noor holdings');
    expect(normalizeBoubyanCompanyName('Example Corp Class A Common Stock')).toBe('example corp class a');
    expect(resolve({ ...INPUT, name: 'Microsoft Investment Corporation' }).state).toBe('identity_mismatch');
    expect(resolve({ ...INPUT, name: 'Microsoft Holdings' }).state).toBe('identity_mismatch');
  });

  it('does not treat an issuer abbreviation as an exact company identity', () => {
    const spotify = { ...MICROSOFT, symbol: 'SPOT', exchange: 'NYSE', name: 'Spotify Technology SA' };
    expect(resolve({ ...INPUT, symbol: 'SPOT', exchange: 'NYSE', name: 'Spotify Tech' }, [spotify])).toMatchObject({
      state: 'identity_mismatch', shariahStatus: 'needs_review', reasonCode: 'company_mismatch', reference: null,
    });
    expect(resolve({ ...INPUT, symbol: 'SPOT', exchange: 'NYSE', name: 'Spotify Technology S.A. Ordinary Shares' }, [spotify]).state).toBe('listed');
    expect(resolve({ ...INPUT, symbol: 'SPOT', exchange: 'NYSE', name: 'Spotify Tech' }, [{ ...spotify, nameAliases: ['Spotify Tech'] }]).state).toBe('listed');
  });

  it('does not transfer a status to a different issuer that reused the ticker', () => {
    const oldIssuer = { ...MICROSOFT, symbol: 'LIFE', name: 'aTyr Pharma Inc' };
    expect(resolve({ ...INPUT, symbol: 'LIFE', name: 'Ethos Technologies Inc' }, [oldIssuer])).toMatchObject({
      state: 'identity_mismatch', shariahStatus: 'needs_review', reference: null,
    });
  });

  it('requires an actual US venue and does not infer one from the bare ticker or country', () => {
    for (const exchange of [undefined, null, '', 'US', 'USA']) {
      expect(resolve({ ...INPUT, exchange })).toMatchObject({ state: 'ambiguous', shariahStatus: 'needs_review', reference: null });
      expect(boubyanSecurityKey({ ...INPUT, exchange })).toBeNull();
    }
    expect(resolve({ ...INPUT, exchange: 'NYSE' }).shariahStatus).toBe('needs_review');
  });

  it('keeps NYSE American, NYSE Arca, NASDAQ, NYSE and OTC distinct', () => {
    expect(normalizeBoubyanExchange('XASE')).toBe('AMEX');
    expect(normalizeBoubyanExchange('NYSE Arca')).toBe('NYSE_ARCA');
    expect(normalizeBoubyanExchange('ARCX')).toBe('NYSE_ARCA');
    expect(normalizeBoubyanExchange('NSDQ')).toBe('NASDAQ');
    expect(normalizeBoubyanExchange('XNAS')).toBe('NASDAQ');
    expect(normalizeBoubyanExchange('XNYS')).toBe('NYSE');
    expect(normalizeBoubyanExchange('OTCQX')).toBe('OTC');
    const fund = { ...MICROSOFT, symbol: 'SPUS', exchange: 'AMEX', name: 'SP Funds S&P 500 Sharia Industry Exclusions ETF' };
    expect(resolve({ ...INPUT, symbol: 'SPUS', name: fund.name, assetType: 'etf', exchange: 'NYSE Arca' }, [fund]).shariahStatus).toBe('needs_review');
    expect(resolve({ ...INPUT, symbol: 'SPUS', name: fund.name, assetType: 'etf', exchange: 'XASE' }, [fund]).state).toBe('listed');
  });

  it('handles source ticker duplicates using venue and company identity', () => {
    const rows = [
      { ...MICROSOFT, symbol: 'CBM.N', name: 'Digirad Corp', exchange: 'NSDQ', page: 12, row: 395 },
      { ...MICROSOFT, symbol: 'CBM.N', name: 'AK Steel Holding Corp', exchange: 'NYSE', page: 12, row: 396 },
    ];
    expect(resolve({ ...INPUT, symbol: 'CBM.N', name: 'Digirad Corporation' }, rows).reference?.row).toBe(395);
    expect(resolve({ ...INPUT, symbol: 'CBM.N', name: 'Digirad Corporation', exchange: 'NYSE' }, rows).state).toBe('identity_mismatch');
    expect(resolve({ ...INPUT, symbol: 'CBM.N', name: 'AK Steel Holding Corp', exchange: 'NYSE' }, rows).reference?.row).toBe(396);
    expect(resolve({ ...INPUT, symbol: 'CBM.N', name: 'Digirad Corporation', exchange: 'US' }, rows).state).toBe('ambiguous');
  });

  it('does not pick a company when a venue and ticker have multiple source rows', () => {
    const rows = [MICROSOFT, { ...MICROSOFT, name: 'Different Issuer Inc', row: 1498 }];
    expect(resolve(INPUT, rows)).toMatchObject({ state: 'ambiguous', shariahStatus: 'needs_review', reference: null });
    expect(resolve(INPUT, rows).candidates).toHaveLength(2);
  });

  it('resolves regional venue aliases while keeping cross-listed issuers separate', () => {
    expect(resolve({ symbol: 'KFH.KW', name: 'Kuwait Finance House', assetType: 'equity', country: 'KW' }).reference?.canonicalId).toBe('BOURSA_KUWAIT:KFH');
    const gfh = { ...KFH, symbol: 'GFH', name: 'GFH Financial Group BSC' };
    const bahrain = { ...gfh, listId: 'gcc' as const, exchange: 'BAHRAIN_BOURSE', country: 'BH' };
    expect(resolve({ symbol: 'GFH', name: 'GFH Financial Group', assetType: 'stock', exchange: 'BHB' }, [gfh, bahrain]).reference?.canonicalId).toBe('BAHRAIN_BOURSE:GFH');
    expect(boubyanSecurityKey({ symbol: 'GFH.KW', exchange: 'KSE' })).toBe('BOURSA_KUWAIT:GFH');
    expect(boubyanSecurityKey({ symbol: 'GFH', exchange: 'BHB' })).toBe('BAHRAIN_BOURSE:GFH');
  });

  it('does not invent ADX or DFM venue from a UAE-only source market', () => {
    const uae = { ...KFH, listId: 'gcc' as const, symbol: 'GFH', name: 'GFH Financial Group BSC', country: 'AE', exchange: null };
    expect(resolve({ symbol: 'GFH', name: uae.name, assetType: 'stock', exchange: 'DFM', country: 'AE' }, [uae])).toMatchObject({ state: 'ambiguous', shariahStatus: 'needs_review', reference: null });
    expect(normalizeBoubyanExchange('UAE')).toBeNull();
    expect(normalizeBoubyanExchange('AE')).toBeNull();
  });

  it('rejects conflicting venue suffixes, provider symbols and market countries', () => {
    expect(resolve({ ...INPUT, symbol: 'MSFT.KW' }).reasonCode).toBe('venue_conflict');
    expect(resolve({ ...INPUT, providerSymbol: 'NYSE:MSFT' }).reasonCode).toBe('venue_conflict');
    expect(resolve({ ...INPUT, providerSymbol: 'AAPL' }).reasonCode).toBe('symbol_conflict');
    expect(resolve({ ...INPUT, country: 'KW' }).reasonCode).toBe('country_conflict');
    expect(boubyanSecurityKey({ symbol: 'KFH.KW', exchange: 'TADAWUL' })).toBeNull();
    expect(resolve({ ...INPUT, symbol: 'NASDAQ:MSFT' }).state).toBe('listed');
  });

  it('never strips US provider suffixes or preferred and warrant markers', () => {
    const rows = [{ ...MICROSOFT, symbol: 'MSFT.PK' }];
    expect(resolve(INPUT, rows).state).toBe('not_listed');
    expect(resolve({ ...INPUT, providerSymbol: 'MSFT.PK' }).reasonCode).toBe('symbol_conflict');
    expect(boubyanSecurityKey({ symbol: 'ADC PR A', exchange: 'NYSE' })).toBe('NYSE:ADC PR A');
    expect(boubyanSecurityKey({ symbol: 'ABC WS', exchange: 'NYSE' })).toBe('NYSE:ABC WS');
    expect(boubyanSecurityKey({ symbol: 'BRK.B', exchange: 'NYSE' })).toBe('NYSE:BRK.B');
  });

  it('does not manufacture an asset type from the source security row', () => {
    for (const assetType of ['crypto', 'commodity', 'forex', 'gold', 'index', 'fund', 'warrant', 'security', '', undefined, null]) {
      expect(resolve({ ...INPUT, assetType })).toMatchObject({ state: 'out_of_scope', shariahStatus: 'unclassified', reference: null });
    }
    for (const assetType of ['stock', 'equity', 'common stock']) {
      expect(resolve({ ...INPUT, assetType }).state).toBe('listed');
    }
    expect(resolve({ ...INPUT, assetType: 'etf' }).reasonCode).toBe('instrument_type_mismatch');
    expect(MICROSOFT.assetType).toBe('security');
  });

  it('requires instrument-type consistency for fund, trust, preferred and warrant rows', () => {
    const fund = { ...MICROSOFT, symbol: 'FUND', name: 'Example Treasury Bond ETF' };
    const input = { ...INPUT, symbol: fund.symbol, name: fund.name };
    expect(resolve(input, [fund])).toMatchObject({ state: 'ambiguous', shariahStatus: 'needs_review', reasonCode: 'instrument_type_mismatch' });
    expect(resolve({ ...input, assetType: 'etf' }, [fund]).state).toBe('listed');
    const trust = { ...fund, name: 'Example Realty Trust' };
    expect(resolve({ ...input, name: trust.name }, [trust]).reasonCode).toBe('instrument_type_mismatch');
    expect(resolve({ ...input, name: trust.name, assetType: 'etf' }, [trust]).reasonCode).toBe('instrument_type_mismatch');
    const preferred = { ...MICROSOFT, symbol: 'ADC PR A', name: 'Agree Realty Corp' };
    expect(resolve({ ...INPUT, symbol: preferred.symbol, name: preferred.name }, [preferred]).reasonCode).toBe('instrument_type_mismatch');
    const warrant = { ...MICROSOFT, symbol: 'ABC WS', name: 'Example Inc Warrants' };
    expect(resolve({ ...INPUT, symbol: warrant.symbol, name: warrant.name }, [warrant]).reasonCode).toBe('instrument_type_mismatch');
    expect(resolve({ ...INPUT, symbol: preferred.symbol, name: preferred.name }, [preferred], new Date('2027-01-05T00:00:00Z'))).toMatchObject({ state: 'ambiguous', reasonCode: 'instrument_type_mismatch' });
  });

  it('treats omission as unknown and explicit exit as review without inventing non-compliance', () => {
    expect(resolve({ ...INPUT, symbol: 'JPM', name: 'JPMorgan Chase & Co' })).toMatchObject({ state: 'not_listed', shariahStatus: 'unclassified', reference: null });
    expect(resolve(INPUT, [{ ...MICROSOFT, publishedStatus: 'excluded' }])).toMatchObject({
      state: 'ambiguous', shariahStatus: 'needs_review', reasonCode: 'excluded_from_publication',
      reference: { publishedStatus: 'excluded' },
    });
    expect(resolve(INPUT, [{ ...MICROSOFT, publishedStatus: 'excluded' }], new Date('2027-01-05T00:00:00Z'))).toMatchObject({ state: 'ambiguous', reasonCode: 'excluded_from_publication' });
    const red = { ...MICROSOFT, markerFills: ['#ff0000'] };
    const white = { ...MICROSOFT, markerFills: ['#ffffff'] };
    expect(resolve(INPUT, [red]).state).toBe('listed');
    expect(resolve(INPUT, [white]).state).toBe('listed');
  });

  it('does not accept malformed source provenance or declared identity problems', () => {
    for (const row of [
      { ...MICROSOFT, page: 0 }, { ...MICROSOFT, row: -1 },
      { ...MICROSOFT, listId: 'kuwait' as const },
      { ...MICROSOFT, identityIssue: 'Conflicting source identity' },
    ]) {
      expect(resolve(INPUT, [row])).toMatchObject({ state: 'ambiguous', shariahStatus: 'needs_review', reasonCode: 'invalid_source_row' });
    }
  });

  it('keeps the pre-indexed and direct resolvers equivalent without mutating rows', () => {
    const frozen = ROWS.map(row => Object.freeze({ ...row }));
    const indexed = createBoubyanReferenceResolver(frozen);
    expect(indexed(INPUT, { now: NOW })).toEqual(resolve(INPUT, frozen));
    expect(indexed({ ...INPUT, name: 'Wrong Issuer' }, { now: NOW }).state).toBe('identity_mismatch');
    expect(indexed(INPUT, { now: NOW }).state).toBe('listed');
  });
});

describe('Boubyan dated publication policy', () => {
  it('does not apply this edition before issue or before its actual source check', () => {
    for (const date of ['2026-07-01T00:00:00Z', '2026-08-01T00:00:00Z', '2026-09-20T00:00:00Z']) {
      expect(resolve(INPUT, ROWS, new Date(date))).toMatchObject({
        state: 'review_due', shariahStatus: 'needs_review', reasonCode: 'source_not_yet_effective', reference: null, candidates: [],
      });
    }
  });

  it('requires review at the scheduled date and retains the dated source provenance', () => {
    const due = new Date(BOUBYAN_REFERENCE.nextReviewAt);
    expect(resolve(INPUT, ROWS, new Date(due.getTime() - 1)).state).toBe('listed');
    const result = resolve(INPUT, ROWS, due);
    expect(result).toMatchObject({ state: 'review_due', shariahStatus: 'needs_review', reasonCode: 'review_overdue' });
    expect(result.reference?.issuedAt).toBe('2026-08-01');
    expect(result.reference?.checkedAt).toBe(BOUBYAN_REFERENCE.checkedAt);
    expect(resolve({ ...INPUT, symbol: 'UNKNOWN' }, ROWS, due).state).toBe('review_due');
  });

  it('never rewrites publication age to the current time or treats future checks as effective', () => {
    const later = resolve(INPUT, ROWS, new Date('2026-12-22T12:00:00.000Z'));
    expect(later.reference?.issuedAt).toBe('2026-08-01');
    expect(later.reference?.reportingPeriod).toBe('Q2 2026');
    expect(later.reference?.checkedAt).toBe(BOUBYAN_REFERENCE.checkedAt);
    expect(resolve(INPUT, ROWS, NOW, { ...BOUBYAN_REFERENCE, checkedAt: '2026-12-01T00:00:00.000Z' })).toMatchObject({ state: 'review_due', reasonCode: 'source_not_yet_effective', reference: null });
  });

  it('fails closed on invalid dates and on a review allegedly made before publication', () => {
    expect(resolve(INPUT, ROWS, new Date('invalid')).reasonCode).toBe('invalid_reference_dates');
    for (const changes of [
      { checkedAt: 'invalid' }, { nextReviewAt: 'invalid' },
      { nextReviewAt: BOUBYAN_REFERENCE.checkedAt },
      { nextReviewAt: '2026-06-01T00:00:00.000Z' },
    ]) {
      expect(resolve(INPUT, ROWS, NOW, { ...BOUBYAN_REFERENCE, ...changes })).toMatchObject({ state: 'review_due', shariahStatus: 'needs_review', reasonCode: 'invalid_reference_dates' });
    }
    const futureList = {
      ...BOUBYAN_REFERENCE,
      lists: BOUBYAN_REFERENCE.lists.map(row => ({ ...row, issuedAt: '2026-12-01' })),
    };
    expect(resolve(INPUT, ROWS, NOW, futureList)).toMatchObject({ state: 'review_due', shariahStatus: 'needs_review', reasonCode: 'invalid_reference_dates', reference: null });
  });
});

describe('audited Q2 2026 publication regressions', () => {
  const rows = publishedRows as BoubyanReferenceRow[];
  const audited = createBoubyanReferenceResolver(rows);

  it('does not misclassify the real AMIN fund row as stock or conflate SPUS venues', () => {
    const amin = rows.find(row => row.symbol === 'AMIN')!;
    expect(audited({ symbol: amin.symbol, name: amin.name, exchange: 'NASDAQ', assetType: 'stock' }, { now: NOW })).toMatchObject({ state: 'ambiguous', shariahStatus: 'needs_review', reasonCode: 'instrument_type_mismatch' });
    const spus = rows.find(row => row.symbol === 'SPUS')!;
    expect(audited({ symbol: spus.symbol, name: spus.name, exchange: 'NYSE Arca', assetType: 'etf' }, { now: NOW }).shariahStatus).toBe('needs_review');
    expect(audited({ ...INPUT, symbol: 'SPOT', exchange: 'NYSE', name: 'Spotify Tech' }, { now: NOW }).state).toBe('identity_mismatch');
  });
});
