import { describe, expect, it } from 'vitest';
import { htmlToPlainText } from '@/lib/sharia-research/contentExtraction';
import { extractFinancialValuesFromCompanyFacts, type SecFacts } from '@/lib/sharia-research/secFinancialExtraction';
import { analyzeShariaEvidence } from '@/lib/sharia-research/shariaAnalyzer';
import { SFM_FTSE_POINT_IN_TIME } from '@/lib/sharia-research/methodologies';
import { evidenceFixture } from './shariaEvidenceFixtures';

describe('source-observed disclosure variants with synthetic accounting inputs', () => {
  function extract(entries: Record<string, number>) {
    const payload: SecFacts = { facts: { 'us-gaap': Object.fromEntries(Object.entries({ Assets: 100, ...entries }).map(([tag,val]) => [tag, {
      units: { USD: [{ val, end:'2026-06-30', filed:'2026-08-01', accn:'1-26-1', form:'10-Q', ...(/Income|Revenues/.test(tag) ? {start:'2026-01-01'} : {}) }] },
    }])) } };
    return extractFinancialValuesFromCompanyFacts(payload, evidenceFixture().document);
  }
  it('recognizes legacy capital-lease debt tags without overlapping current maturities', () => {
    const values = extract({ LongTermDebtAndCapitalLeaseObligations:39, LongTermDebtAndCapitalLeaseObligationsCurrent:4,
      LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities:43, CommercialPaper:1 });
    expect(values.find(value => value.normalizedField === 'interest_bearing_debt')?.value).toBe(44);
  });
  it('extracts gross operating interest without using net revenue as the denominator', () => {
    const values = extract({ InterestIncomeOperating:40, InvestmentIncomeInterest:10, RevenuesNetOfInterestExpense:50 });
    expect(values.find(value => value.normalizedField === 'interest_income')?.value).toBe(40);
    expect(values.some(value => value.normalizedField === 'total_income')).toBe(false);
  });
  it('prefers all debt securities to a subset, never sums the subset twice', () => {
    expect(extract({ DebtSecurities:30, AvailableForSaleSecuritiesDebtSecurities:20 }).find(value => value.normalizedField === 'interest_bearing_securities')?.value).toBe(30);
  });
  function analyze(text: string) {
    const f = evidenceFixture(text);
    return analyzeShariaEvidence({ security:f.security, documents:[f.document], financialValues:[], methodology:SFM_FTSE_POINT_IN_TIME });
  }
  it('accepts a current issuer-subject bank holding company statement as negative activity evidence', () => {
    expect(analyze('Test Software Inc. is a bank holding company regulated under federal banking law.').classification).toBe('non_compliant');
  });
  it('does not attribute the legal status of a customer to its software supplier', () => {
    expect(analyze('We provide software to customers. Customer Corporation is a bank holding company.').classification).not.toBe('non_compliant');
  });
  it('keeps the Islamic institutional exception ahead of a bank holding company phrase', () => {
    expect(analyze('We operate an Islamic bank. Test Software Inc. is a bank holding company.').classification).not.toBe('non_compliant');
  });
  it('does not apply ordinary corporate debt limits to a declared Islamic institution', () => {
    const f = evidenceFixture('We operate an Islamic bank. Test Software Inc. is a bank holding company.');
    const result = analyzeShariaEvidence({security:f.security, documents:[f.document], financialValues: [...f.values.filter(v => v.normalizedField !== 'interest_bearing_debt'), f.field('interest_bearing_debt',90)], methodology:SFM_FTSE_POINT_IN_TIME});
    expect(result.classification).toBe('requires_review');
  });
  it('removes hidden XBRL contexts without removing visible disclosure text', () => {
    const text = htmlToPlainText('<html><ix:header><ix:hidden><p>Fake metadata bank</p></ix:hidden></ix:header><p>Actual issuer business.</p><ix:nonFraction>123</ix:nonFraction></html>');
    expect(text).not.toContain('Fake metadata'); expect(text).toContain('Actual issuer business'); expect(text).toContain('123');
  });
});
