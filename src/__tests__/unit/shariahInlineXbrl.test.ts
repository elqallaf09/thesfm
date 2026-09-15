import { describe, expect, it } from 'vitest';
import { parseInlineXbrlFacts } from '@/lib/sharia-research/inlineXbrl';
import { currentSecFilings } from '@/lib/sharia-research/secFilingEvidence';
import { extractFinancialValuesFromCompanyFacts } from '@/lib/sharia-research/secFinancialExtraction';
import { calculateFinancialRatios } from '@/lib/sharia-research/financialRatioCalculator';
import { SFM_FTSE_POINT_IN_TIME } from '@/lib/sharia-research/methodologies';
import { evidenceFixture } from './shariaEvidenceFixtures';

const now = new Date('2026-09-14T00:00:00Z');
const filing = { form: '10-Q', reportDate: '2026-06-30', filingDate: '2026-08-01', accessionNumber: '0000000001-26-000001', primaryDocument: 'report.htm', primaryDocDescription: 'Quarterly report' };
const fact = (tag = 'Assets', amount = '100', extra = '') => `<ix:nonFraction name="g:${tag}" contextRef="c" unitRef="usd" decimals="INF" ${extra}>${amount}</ix:nonFraction>`;
function xml(body: string, context = '', unit = '', cik = '0000000001') {
  return `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:x="http://www.xbrl.org/2003/instance" xmlns:ix="http://www.xbrl.org/2013/inlineXBRL" xmlns:g="http://fasb.org/us-gaap/2026" xmlns:iso="http://www.xbrl.org/2003/iso4217" xmlns:ixt="http://www.xbrl.org/inlineXBRL/transformation/2020-02-12" xmlns:dim="http://xbrl.org/2006/xbrldi" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <x:context id="c"><x:entity><x:identifier scheme="http://www.sec.gov/CIK">${cik}</x:identifier>${context}</x:entity><x:period><x:instant>2026-06-30</x:instant></x:period></x:context>
  <x:unit id="usd">${unit || '<x:measure>iso:USD</x:measure>'}</x:unit>${body}</html>`;
}
const parse = (html: string) => parseInlineXbrlFacts(html, '1', filing, now);
const assets = (html: string) => parse(html).facts?.['us-gaap']?.Assets?.units?.USD;

describe('strict current issuer inline-XBRL evidence', () => {
  it('resolves namespaces, explicit currency and scale rather than copying displayed millions', () => {
    expect(assets(xml(fact('Assets', '12,345', 'format="ixt:num-dot-decimal" scale="6"')))?.[0].val).toBe(12345000000);
  });
  it('supports legal nested facts with identical transformation and unit', () => {
    expect(assets(xml(fact('Assets', `<span>${fact('Assets', '100')}</span>`)))).toHaveLength(1);
  });
  it.each([
    fact('Assets', '100', 'xsi:nil="true"'), fact('Assets', '100', 'sign="-"'), fact('Assets', '-100'),
    fact('Assets', '1.000,25', 'format="ixt:num-comma-decimal"'), fact('Assets', '100', 'scale="90"'),
    fact('Assets', '100', 'continuedAt="elsewhere"'), fact('Assets', '100', 'format="g:num-dot-decimal"'),
    fact('Assets', '<ix:exclude>100</ix:exclude>'),
  ])('rejects nil, negative, unsupported or ambiguous numeric fact %#', body => expect(assets(xml(body))).toBeUndefined());
  it('accepts an explicit zero dash but not a missing fact as zero', () => {
    expect(assets(xml(fact('Assets', '—', 'format="ixt:fixed-zero"')))?.[0].val).toBe(0);
    expect(assets(xml(''))).toBeUndefined();
  });
  it('rejects a foreign issuer with the same financial labels', () => expect(assets(xml(fact(), '', '', '0000000002'))).toBeUndefined());
  it('does not treat dimensioned segment/subsidiary data as consolidated assets', () => {
    expect(assets(xml(fact(), '<x:segment><dim:explicitMember dimension="g:Axis">g:Member</dim:explicitMember></x:segment>'))).toBeUndefined();
  });
  it('rejects mixed currency or per-share units', () => {
    expect(assets(xml(fact(), '', '<x:measure>iso:USD</x:measure><x:measure>iso:EUR</x:measure>'))).toBeUndefined();
  });
  it('does not accept a malicious namespace pretending to be US GAAP', () => {
    expect(assets(xml(fact()).replace('http://fasb.org/us-gaap/2026', 'http://fasb.org/us-gaap/2026/attacker'))).toBeUndefined();
  });
  it('rejects inconsistent duplicate facts instead of selecting a convenient amount', () => {
    expect(assets(xml(fact('Assets', '100') + fact('Assets', '200')))).toBeUndefined();
  });
  it('rejects a prior comparative period when the current filing is known', () => {
    expect(assets(xml(fact()).replace('<x:instant>2026-06-30', '<x:instant>2025-06-30'))).toBeUndefined();
  });
  it.each(['<!DOCTYPE html SYSTEM "https://example.com/a">', '<!ENTITY xx "100">'])('rejects DTD/entity resolution', prefix => {
    expect(() => parse(prefix + xml(fact()))).toThrow('INLINE_XBRL_UNSAFE_DOCUMENT');
  });
  it('rejects malformed input and duplicate context IDs', () => {
    expect(() => parse(xml(fact()).replace('</html>', ''))).toThrow('INLINE_XBRL_MALFORMED_DOCUMENT');
    expect(() => parse(xml(fact() + '<x:context id="c"/>'))).toThrow('INLINE_XBRL_DUPLICATE_CONTEXT');
  });
  it('rejects future metadata and invalid accession identities', () => {
    expect(() => parseInlineXbrlFacts(xml(fact()), '1', { ...filing, reportDate: '2099-01-01' }, now)).toThrow('INLINE_XBRL_INVALID_FILING');
  });
  it('selects latest current financial period before older annuals and applies amendment order', () => {
    expect(currentSecFilings([{ ...filing, reportDate: '2025-12-31', form: '10-K' }, filing,
      { ...filing, form: '10-Q/A', filingDate: '2026-08-02' }], now)[0].form).toBe('10-Q/A');
  });
  it('uses explicitly reported non-current receivables rather than always claiming that they are missing', () => {
    const f = evidenceFixture();
    const values = extractFinancialValuesFromCompanyFacts(parse(xml(fact() + fact('AccountsReceivableNetCurrent', '10') + fact('AccountsReceivableNetNoncurrent', '2'))), f.document);
    expect(values.find(value => value.normalizedField === 'accounts_receivable')).toMatchObject({ value: 12, validation: { bound: 'exact' } });
  });
  it('does not fall back to an older complete set when current assets are absent', () => {
    const f = evidenceFixture();
    const payload = parse(xml(fact()));
    payload.facts!['us-gaap'].Assets.units!.USD[0].end = '2025-12-31';
    expect(extractFinancialValuesFromCompanyFacts(payload, f.document)).toEqual([]);
  });
  it('conservative liabilities ceiling can prove debt passes while retaining its bound', () => {
    const f = evidenceFixture();
    const values = extractFinancialValuesFromCompanyFacts(parse(xml(fact() + fact('LongTermDebt', '5') + fact('Liabilities', '20'))), f.document);
    const ratio = calculateFinancialRatios(values, SFM_FTSE_POINT_IN_TIME, now)[0];
    expect(ratio.status).toBe('pass'); expect(ratio.inputs[0].validation?.bound).toBe('upper');
  });
  it('does not double-count securities already included in cash equivalents', () => {
    const f = evidenceFixture();
    const values = extractFinancialValuesFromCompanyFacts(parse(xml(fact() + fact('CashAndCashEquivalentsAtCarryingValue', '20') + fact('DebtSecurities', '20'))), f.document);
    const ratio = calculateFinancialRatios(values, SFM_FTSE_POINT_IN_TIME, now)[1];
    expect(ratio.numerator).toBe(20); expect(ratio.status).not.toBe('fail');
  });
  it('rejects a contradictory lower/upper interval rather than keeping its convenient bound', () => {
    const f = evidenceFixture(); const low = f.field('interest_bearing_debt', 40); low.validation!.bound = 'lower';
    const high = f.field('interest_bearing_debt', 20); high.validation!.bound = 'upper';
    const ratio = calculateFinancialRatios([f.field('total_assets', 100), low, high], SFM_FTSE_POINT_IN_TIME, now)[0];
    expect(ratio.status).toBe('unavailable'); expect(ratio.warning).toContain('Conflicting');
  });
});
