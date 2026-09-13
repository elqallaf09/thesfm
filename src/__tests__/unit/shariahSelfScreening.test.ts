import { describe, expect, it } from 'vitest';
import { classifySfmShariahStock, SFM_SHARIAH_THRESHOLDS } from '@/lib/market/shariahSelfScreening';

const cleanRatios = {
  sector: 'Technology',
  industry: 'Software',
  businessDescription: 'Enterprise software and cloud services.',
  interestBearingDebtRatio: 0.12,
  cashAndInterestBearingSecuritiesRatio: 0.18,
  accountsReceivableAndCashRatio: 0.22,
  nonPermissibleRevenueRatio: 0.01,
  interestIncomeRatio: 0.01,
};

describe('SFM self-hosted Shariah screener', () => {
  it('marks a clean stock compliant only after business and all financial rules pass', () => {
    const result = classifySfmShariahStock({
      symbol: 'TEST',
      name: 'Test Software Inc.',
      exchange: 'NASDAQ',
      country: 'US',
    }, cleanRatios);

    expect(result.shariahStatus).toBe('compliant');
    expect(result.shariahSource).toContain('SFM Shariah Screener');
    expect(result.shariahScreeningData.screeningRules).toBeTruthy();
  });

  it('rejects conventional banking before ratio screening', () => {
    const result = classifySfmShariahStock({
      symbol: 'BANK',
      name: 'Example Commercial Bank',
      exchange: 'NYSE',
      country: 'US',
    }, {
      ...cleanRatios,
      sector: 'Financial Services',
      industry: 'Commercial Bank',
    });

    expect(result.shariahStatus).toBe('non_compliant');
    expect(result.shariahReason).toContain('prohibited conventional finance');
  });

  it('rejects debt at or above the one-third threshold', () => {
    const result = classifySfmShariahStock({
      symbol: 'DEBT',
      name: 'Debt Test Inc.',
      exchange: 'NASDAQ',
      country: 'US',
    }, {
      ...cleanRatios,
      interestBearingDebtRatio: SFM_SHARIAH_THRESHOLDS.debtToAssets,
    });

    expect(result.shariahStatus).toBe('non_compliant');
    expect(result.shariahReason).toContain('Interest-bearing debt');
  });

  it('rejects receivables plus cash at or above 50% of assets', () => {
    const result = classifySfmShariahStock({
      symbol: 'REC',
      name: 'Receivable Test Inc.',
      exchange: 'NASDAQ',
      country: 'US',
    }, {
      ...cleanRatios,
      accountsReceivableAndCashRatio: 0.5,
    });

    expect(result.shariahStatus).toBe('non_compliant');
    expect(result.shariahReason).toContain('Accounts receivable + cash');
  });

  it('uses needs_review instead of inventing a compliant result when a ratio is missing', () => {
    const result = classifySfmShariahStock({
      symbol: 'MISS',
      name: 'Missing Data Inc.',
      exchange: 'NASDAQ',
      country: 'US',
    }, {
      ...cleanRatios,
      nonPermissibleRevenueRatio: null,
    });

    expect(result.shariahStatus).toBe('needs_review');
  });

  it('routes Islamic financial institutions to review rather than treating them as conventional banks', () => {
    const result = classifySfmShariahStock({
      symbol: 'ISLM',
      name: 'Example Islamic Bank',
      exchange: 'KSE',
      country: 'KW',
    }, {
      ...cleanRatios,
      sector: 'Financial Services',
      industry: 'Islamic Banking',
    });

    expect(result.shariahStatus).toBe('needs_review');
    expect(result.shariahReason).toContain('Islamic financial institutions');
  });
});
