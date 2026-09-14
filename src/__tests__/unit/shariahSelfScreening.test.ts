import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { classifySfmShariahStock, cleanRefreshLimit } from '@/lib/market/shariahSelfScreening';
import { evidenceFixture, security } from './shariaEvidenceFixtures';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-14T00:00:00Z')); });
afterEach(() => { vi.useRealTimers(); });

describe('shared source-verified stock screening', () => {
  it('only passes a stock with complete documented business and financial evidence', () => {
    expect(classifySfmShariahStock({ ...security, symbol: security.ticker }, evidenceFixture().bag).shariahStatus).toBe('compliant');
  });
  it('does not accept old ratios as a substitute for source evidence', () => {
    expect(classifySfmShariahStock({ ...security, symbol: security.ticker }, { sector: 'Software', interestBearingDebtRatio: 0, nonPermissibleRevenueRatio: 0 }).shariahStatus).toBe('needs_review');
  });
  it('rejects an official current principal commercial bank activity even with incomplete financial data', () => {
    const fixture = evidenceFixture('We are a commercial bank.'); fixture.bag.financialValues = [];
    expect(classifySfmShariahStock({ ...security, symbol: security.ticker }, fixture.bag).shariahStatus).toBe('non_compliant');
  });
  it.each([33.333, 34, 50])('rejects debt of %s per 100 assets, using the published strict boundary independently', debt => {
    const fixture = evidenceFixture(); fixture.values.find(value => value.normalizedField === 'interest_bearing_debt')!.value = debt;
    expect(classifySfmShariahStock({ ...security, symbol: security.ticker }, fixture.bag).shariahStatus).toBe('non_compliant');
  });
  it('rejects exactly 50% receivables and cash', () => {
    const fixture = evidenceFixture(); fixture.values.find(value => value.normalizedField === 'accounts_receivable')!.value = 40;
    expect(classifySfmShariahStock({ ...security, symbol: security.ticker }, fixture.bag).shariahStatus).toBe('non_compliant');
  });
  it('requires review when a required amount is missing', () => {
    const fixture = evidenceFixture(); fixture.bag.financialValues = fixture.values.filter(value => value.normalizedField !== 'prohibited_revenue');
    expect(classifySfmShariahStock({ ...security, symbol: security.ticker }, fixture.bag).shariahStatus).toBe('needs_review');
  });
  it('checks Islamic institutional exception before commercial-bank wording', () => {
    expect(classifySfmShariahStock({ ...security, symbol: security.ticker }, evidenceFixture('We are a commercial bank operating as an Islamic bank.').bag).shariahStatus).toBe('needs_review');
  });
  it('does not mistake a software supplier to banks for a bank', () => {
    expect(classifySfmShariahStock({ ...security, symbol: security.ticker }, evidenceFixture('We provide software to a commercial bank.').bag).shariahStatus).not.toBe('non_compliant');
  });
  it.each([null, undefined, '', false, 0, 'not-a-number'])('uses default limit for absent or invalid input %s', value => expect(cleanRefreshLimit(value)).toBe(50));
});
