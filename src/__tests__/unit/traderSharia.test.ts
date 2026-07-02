import { describe, expect, it } from 'vitest';
import { classifyShariahCompliance } from '@/lib/market/shariah-screening';
import {
  buildReviewRequiredShariaClassification,
  buildUnsupportedShariaClassification,
  getEffectiveShariaStatus,
  normalizeShariaClassification,
  normalizeShariaStatus,
} from '@/lib/trader/sharia';

describe('trader Sharia classification helpers', () => {
  it('never treats missing or unknown classifications as compliant', () => {
    expect(normalizeShariaStatus(undefined)).toBe('unclassified');
    expect(normalizeShariaStatus('')).toBe('unclassified');
    expect(normalizeShariaStatus('unknown')).toBe('unclassified');
  });

  it('maps unsupported legacy instruments to unclassified', () => {
    const classification = buildUnsupportedShariaClassification();
    expect(classification.status).toBe('unclassified');
    expect(getEffectiveShariaStatus(classification)).toBe('unclassified');
  });

  it('downgrades expired compliant classifications to needs review for display', () => {
    const expired = normalizeShariaClassification({
      status: 'compliant',
      source: 'Verified source',
      reviewed_at: '2024-01-01T00:00:00.000Z',
    }, buildReviewRequiredShariaClassification());

    expect(expired.status).toBe('compliant');
    expect(getEffectiveShariaStatus(expired, new Date('2026-06-25T00:00:00.000Z'))).toBe('needs_review');
  });

  it('keeps verified non-compliant reason codes when supplied', () => {
    const classification = normalizeShariaClassification({
      status: 'non_compliant',
      reason_code: 'interest_bearing_debt_threshold',
      reason_ar: 'ارتفاع الديون ذات الفائدة',
      source: 'Verified source',
      reviewed_at: '2026-06-01T00:00:00.000Z',
    }, buildReviewRequiredShariaClassification());

    expect(classification.status).toBe('non_compliant');
    expect(classification.reason_code).toBe('interest_bearing_debt_threshold');
    expect(classification.reason_ar).toContain('الفائدة');
  });
});

describe('Shariah screening workflow safeguards', () => {
  it('does not mark ticker-only equities compliant', () => {
    expect(classifyShariahCompliance({ symbol: 'AAPL', assetType: 'stock' }).shariahStatus).toBe('unclassified');
    expect(classifyShariahCompliance({ symbol: 'MSFT', assetType: 'stock' }).shariahStatus).toBe('unclassified');
  });

  it('requires ETF holdings data before a compliant ETF result', () => {
    expect(classifyShariahCompliance({ symbol: 'SPY', assetType: 'etf' }).shariahStatus).toBe('needs_review');
    expect(classifyShariahCompliance({ symbol: 'QQQ', assetType: 'etf' }).shariahStatus).toBe('needs_review');
  });

  it('keeps crypto and metals unclassified without a specific rule or source', () => {
    expect(classifyShariahCompliance({ symbol: 'BTCUSD', assetType: 'crypto' }).shariahStatus).toBe('unclassified');
    expect(classifyShariahCompliance({ symbol: 'XAUUSD', assetType: 'gold' }).shariahStatus).toBe('unclassified');
    expect(classifyShariahCompliance({ symbol: 'GLD', assetType: 'etf' }).shariahStatus).toBe('needs_review');
  });

  it('flags conventional bank activity as non-compliant from available data', () => {
    const classification = classifyShariahCompliance({
      symbol: 'JPM',
      name: 'JPMorgan Chase',
      assetType: 'stock',
      country: 'US',
      sector: 'Financial Services',
      industry: 'Conventional bank',
    });

    expect(classification.shariahStatus).toBe('non_compliant');
  });

  it('lets manual admin classifications take priority over automatic screening', () => {
    const classification = classifyShariahCompliance({
      symbol: 'AAPL',
      assetType: 'stock',
      shariahStatus: 'compliant',
      shariahManualOverride: true,
      shariahReason: 'Admin-reviewed example',
      shariahSource: 'Manual Shariah review',
      shariahLastReviewedAt: '2026-07-01T00:00:00.000Z',
      shariahReviewedBy: 'admin@example.com',
    });

    expect(classification.shariahStatus).toBe('compliant');
    expect(classification.shariahManualOverride).toBe(true);
    expect(classification.shariahMethod).toBe('manual_review');
  });

  it('only returns compliant for stocks with complete passing screening data', () => {
    const classification = classifyShariahCompliance({
      symbol: 'COMPLETE',
      name: 'Complete Data Technology',
      assetType: 'stock',
      sector: 'Technology',
      industry: 'Software',
      shariahScreeningData: {
        nonPermissibleRevenueRatio: 0,
        interestBearingDebtRatio: 0.1,
        cashAndInterestBearingSecuritiesRatio: 0.15,
        interestIncomeRatio: 0.01,
      },
    });

    expect(classification.shariahStatus).toBe('compliant');
  });
});
