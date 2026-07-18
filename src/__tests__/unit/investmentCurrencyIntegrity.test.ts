import { describe, expect, it } from 'vitest';
import {
  calculateInvestmentHoldingMetrics,
  investmentHoldingCurrency,
  investmentQuoteCurrency,
} from '@/lib/investmentCalculations';
import {
  buildInvestmentPayload,
  buildPriceRefreshPayload,
  mergeInvestmentForUpdate,
  mergeMarketPriceIntoInvestment,
  normalizeInvestment,
} from '@/lib/investments/investmentUtils';
import { investmentValueInCurrency } from '@/lib/investments/currencyIntegrity';
import { primaryInvestmentTotal } from '@/lib/dashboard/executiveOverview';
import { buildFinanceOverview } from '@/lib/data/financeData';
import type { Investment, InvestmentInput, InvestmentType } from '@/types/investment';

function holding(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'holding-1',
    name: 'Silver',
    type: 'silver',
    currentValue: 36.6,
    displayValue: 36.6,
    displayValueStatus: 'valid',
    monthlyContribution: 0,
    startDate: '2026-07-01',
    riskLevel: 'medium',
    symbol: 'XAGUSD',
    providerSymbol: 'XAGUSD',
    assetType: 'commodity',
    currency: 'KWD',
    priceCurrency: 'USD',
    nativeCurrency: 'USD',
    quantity: 10,
    purchasePrice: 10,
    purchaseTotal: 100,
    currentPrice: 12,
    lastPrice: 12,
    currentMarketValue: 120,
    nativeMarketValue: 120,
    userCurrency: 'KWD',
    fxRateToUserCurrency: 0.305,
    convertedMarketValue: 36.6,
    fxSource: 'open.er-api.com',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-18T00:00:00.000Z',
    ...overrides,
  };
}

function input(type: InvestmentType, symbol: string): InvestmentInput {
  const item = holding({ type, symbol, providerSymbol: symbol, metalType: type === 'gold' || type === 'silver' ? type : undefined });
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, displayValue: _displayValue, displayValueStatus: _displayValueStatus, ...value } = item;
  return value;
}

describe('investment holding currency integrity', () => {
  it('keeps XAGUSD quote currency USD while all holding metrics stay KWD', () => {
    const item = holding();
    const metrics = calculateInvestmentHoldingMetrics(item);

    expect(investmentHoldingCurrency(item)).toBe('KWD');
    expect(investmentQuoteCurrency(item)).toBe('USD');
    expect(metrics.currentValue).toBeCloseTo(36.6);
    expect(metrics.totalInvested).toBe(100);
    expect(metrics.profitLossAmount).toBeCloseTo(-63.4);
    expect(metrics.profitLossPercent).toBeCloseTo(-63.4);
  });

  it('keeps XAUUSD holding values in KWD', () => {
    const item = holding({ name: 'Gold', type: 'gold', symbol: 'XAUUSD', providerSymbol: 'XAUUSD', metalType: 'gold' });
    expect(investmentHoldingCurrency(item)).toBe('KWD');
    expect(investmentQuoteCurrency(item)).toBe('USD');
    expect(calculateInvestmentHoldingMetrics(item).currentValue).toBeCloseTo(36.6);
  });

  it('keeps BTCUSD holding values in KWD', () => {
    const item = holding({ name: 'Bitcoin', type: 'crypto', symbol: 'BTCUSD', providerSymbol: 'BTCUSD', assetType: 'crypto', metalType: undefined });
    expect(investmentHoldingCurrency(item)).toBe('KWD');
    expect(investmentQuoteCurrency(item)).toBe('USD');
    expect(calculateInvestmentHoldingMetrics(item).currentValue).toBeCloseTo(36.6);
  });

  it('leaves a USD holding in USD without conversion', () => {
    const item = holding({ currency: 'USD', userCurrency: 'USD', currentValue: 120, convertedMarketValue: 120, fxRateToUserCurrency: 1, fxSource: 'same_currency' });
    const metrics = calculateInvestmentHoldingMetrics(item);
    expect(metrics.holdingCurrency).toBe('USD');
    expect(metrics.quoteCurrency).toBe('USD');
    expect(metrics.currentValue).toBe(120);
    expect(metrics.conversionState).toBe('same_currency');
  });

  it('does not change the saved KWD currency when FX conversion fails', () => {
    const previous = holding();
    const updated = mergeMarketPriceIntoInvestment(previous, {
      currentPrice: 13,
      currentMarketValue: 130,
      nativeMarketValue: 130,
      priceCurrency: 'USD',
      nativeCurrency: 'USD',
      fxSource: 'holding:unavailable;reporting:unavailable',
    }, '2026-07-18T01:00:00.000Z');

    expect(updated.currency).toBe('KWD');
    expect(updated.priceCurrency).toBe('USD');
    expect(updated.nativeCurrency).toBe('USD');
  });

  it('preserves the last-known-good KWD valuation when the provider fails', () => {
    const previous = holding();
    const payload = buildPriceRefreshPayload({
      currentPrice: 13,
      currentMarketValue: 130,
      nativeMarketValue: 130,
      priceCurrency: 'USD',
      nativeCurrency: 'USD',
      fxSource: 'holding:unavailable;reporting:unavailable',
    });
    const updated = mergeMarketPriceIntoInvestment(previous, {
      currentPrice: 13,
      currentMarketValue: 130,
      nativeMarketValue: 130,
      priceCurrency: 'USD',
      nativeCurrency: 'USD',
      fxSource: 'holding:unavailable;reporting:unavailable',
    }, '2026-07-18T01:00:00.000Z');

    expect(payload).not.toHaveProperty('current_value');
    expect(updated.currentValue).toBeCloseTo(36.6);
    expect(updated.convertedMarketValue).toBeCloseTo(36.6);
    expect(calculateInvestmentHoldingMetrics(updated).conversionState).toBe('stale');
  });

  it('never labels the USD quote amount as a KWD holding value', () => {
    const item = holding();
    expect(investmentValueInCurrency({
      currency: item.currency,
      price_currency: item.priceCurrency,
      native_currency: item.nativeCurrency,
      current_value: item.currentValue,
      current_market_value: item.currentMarketValue,
      native_market_value: item.nativeMarketValue,
      user_currency: item.userCurrency,
      converted_market_value: item.convertedMarketValue,
      fx_rate_to_user_currency: item.fxRateToUserCurrency,
    }, 'KWD')).toEqual({ amount: 36.6, currency: 'KWD', source: 'reporting' });
  });

  it('preserves selected currency through save and reload hydration', () => {
    const payload = buildInvestmentPayload(input('silver', 'XAGUSD'), 'user-1');
    const reloaded = normalizeInvestment({
      id: 'holding-1',
      name: String(payload.name),
      amount: payload.amount as number,
      ...(payload as Record<string, unknown>),
    });

    expect(payload.currency).toBe('KWD');
    expect(payload.price_currency).toBe('USD');
    expect(reloaded.currency).toBe('KWD');
    expect(reloaded.priceCurrency).toBe('USD');
  });

  it('does not reset KWD to USD in the edit flow', () => {
    const previous = holding();
    const edited = mergeInvestmentForUpdate(previous, { ...input('silver', 'XAGUSD'), name: 'Edited silver' });
    expect(edited.currency).toBe('KWD');
    expect(edited.priceCurrency).toBe('USD');
    expect(edited.nativeCurrency).toBe('USD');
  });

  it('does not mix unconverted currencies in portfolio totals', () => {
    const rows = [
      { currency: 'KWD', price_currency: 'USD', current_value: 36.6, user_currency: 'KWD', converted_market_value: 36.6, native_market_value: 120 },
      { currency: 'EUR', price_currency: 'USD', current_value: 50, user_currency: 'EUR', converted_market_value: 50, native_market_value: 160 },
    ];
    expect(primaryInvestmentTotal(rows, 'KWD')).toBeCloseTo(36.6);
  });

  it('does not treat a missing portfolio currency as the literal NULL currency', () => {
    const overview = buildFinanceOverview({
      investments: [
        { amount: 36.6 },
        { currency: 'EUR', current_value: 50 },
      ],
    });

    expect(overview.investmentTotal).toBe(0);
  });
});
