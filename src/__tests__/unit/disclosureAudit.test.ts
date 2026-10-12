import { describe, expect, it } from 'vitest';
import { auditDisclosurePages, disclosureCalendarDate, type DisclosureRow } from '@/lib/market-data/disclosureAudit';

// Synthetic contract fixtures only; never provider payloads or production data.
function trade(index: number, overrides: DisclosureRow = {}): DisclosureRow {
  return { firstName: 'Fixture', lastName: `Member ${index}`, symbol: 'TEST', owner: 'Self', type: 'Purchase', amount: '$1,001 - $15,000', link: 'https://example.test/filing', disclosureDate: '2026-10-08', transactionDate: '2026-10-01', ...overrides };
}
const reference = [trade(1), trade(2), trade(3), trade(4)];
const audit = (rows = reference, before = reference, after = before) => auditDisclosurePages({ pageSize: 2, before, after, pages: [{ page: 0, rows: rows.slice(0, 2) }, { page: 1, rows: rows.slice(2) }] });

describe('filing calendar dates', () => {
  it.each(['2026-10-08', '2026-10-08T00:00:00+03:00', '2026-10-08T23:59:59-07:00', '2026-10-08 00:00:00'])('preserves the filed day for %s', value => {
    expect(disclosureCalendarDate(value)).toBe('2026-10-08');
  });
  it.each(['2026-02-29', '2026-04-31', '10/08/2026', 'garbage2026-10-08', '', null, 0])('rejects ambiguous or invalid dates: %s', value => {
    expect(disclosureCalendarDate(value)).toBeNull();
  });
  it('accepts leap days only in leap years', () => expect(disclosureCalendarDate('2024-02-29')).toBe('2024-02-29'));
});

describe('disclosure pagination contract', () => {
  it('accepts a stable complete window without claiming archive or filing verification', () => {
    expect(audit()).toMatchObject({ status: 'passed', scope: 'two_page_window', checkedRows: 4, missingRecordCount: 0, duplicateRecordCount: 0, dateMismatchCount: 0, officialFilingDatesVerified: false });
  });
  it('detects a duplicate replacing a row at a page boundary', () => {
    expect(audit([reference[0], reference[1], reference[1], reference[3]])).toMatchObject({ status: 'failed', duplicateRecordCount: 1, missingRecordCount: 1, unexpectedRecordCount: 1 });
  });
  it('detects a skipped record even when both pages still contain unique rows', () => {
    expect(audit([reference[0], reference[1], reference[3], trade(5)])).toMatchObject({ status: 'failed', duplicateRecordCount: 0, missingRecordCount: 1 });
  });
  it('detects unstable order without losing equal-day records', () => {
    expect(audit([reference[1], reference[0], reference[2], reference[3]])).toMatchObject({ status: 'failed', missingRecordCount: 0, orderMatches: false });
  });
  it.each(['disclosureDate', 'transactionDate'])('detects a one-day shift in %s against the stable wider reference', field => {
    const rows = reference.map(row => ({ ...row }));
    rows[2][field] = field === 'disclosureDate' ? '2026-10-07' : '2026-09-30';
    expect(audit(rows)).toMatchObject({ status: 'failed', dateMismatchCount: 1 });
  });
  it('does not mistake multiple trades in a single filing for duplicates', () => {
    const rows = [trade(1), trade(1, { owner: 'Spouse' }), trade(1, { type: 'Sale' }), trade(1, { amount: '$15,001 - $50,000' })];
    expect(audit(rows, rows)).toMatchObject({ status: 'passed', duplicateRecordCount: 0 });
  });
  it('reports inconclusive if new filings arrive during the read', () => {
    expect(audit(reference.slice(1), reference, [trade(5), ...reference.slice(0, 3)])).toMatchObject({ status: 'inconclusive', referenceStable: false, missingRecordCount: null, dateMismatchCount: null });
  });
  it('does not pass an empty provider response as a verified archive', () => expect(audit([], [], [])).toMatchObject({ status: 'inconclusive', checkedRows: 0 }));
  it('accepts an exhausted second page when the reference agrees', () => expect(audit(reference.slice(0, 1), reference.slice(0, 1))).toMatchObject({ status: 'passed', checkedRows: 1 }));
  it('fails a missing page number', () => {
    expect(auditDisclosurePages({ pageSize: 2, before: reference, after: reference, pages: [{ page: 0, rows: reference.slice(0, 2) }, { page: 2, rows: reference.slice(2) }] })).toMatchObject({ status: 'failed', pageSequenceValid: false, missingRecordCount: null });
  });
  it('detects incorrect page boundaries even when the concatenated rows match', () => {
    const two = reference.slice(0, 2);
    expect(auditDisclosurePages({ pageSize: 2, before: two, after: two, pages: [{ page: 0, rows: [two[0]] }, { page: 1, rows: [two[1]] }] })).toMatchObject({ status: 'failed', orderMatches: true, pageBoundariesMatch: false });
  });
  it('rejects malformed filing dates instead of silently dropping rows', () => expect(audit([trade(1, { disclosureDate: '2026-02-30' }), ...reference.slice(1)])).toMatchObject({ status: 'failed', invalidDateCount: 1 }));
  it('does not expose provider records or personal fields in reports', () => {
    const report = JSON.stringify(audit());
    expect(report).not.toMatch(/Fixture|Member|example\.test|\$1,001/);
  });
});
