import { describe, expect, it } from 'vitest';
import { calculatePositionSize } from '@/lib/trading/calculators';
import { getMarketToolRequirements } from '@/components/market-analysis/toolRequirements';

describe('market analysis tool requirements', () => {
  it('keeps the position-size calculator independent from asset and income prerequisites', () => {
    const requirements = getMarketToolRequirements('traderTools', 'risk');

    expect(requirements).toMatchObject({
      requiresAsset: false,
      requiresMarketData: false,
      requiresAccountBalance: true,
      requiresMonthlyIncome: false,
    });
  });

  it('requires an asset and market data for technical analysis', () => {
    const requirements = getMarketToolRequirements('technicalAnalysis');

    expect(requirements.requiresAsset).toBe(true);
    expect(requirements.requiresMarketData).toBe(true);
    expect(requirements.requiresMonthlyIncome).toBe(false);
  });

  it('keeps economic-calendar tools independent from selected assets', () => {
    const requirements = getMarketToolRequirements('economicCalendar');

    expect(requirements.requiresAsset).toBe(false);
    expect(requirements.requiresMarketData).toBe(false);
  });
});

describe('position-size calculator', () => {
  it('uses account balance and risk percentage for cash risk', () => {
    const result = calculatePositionSize({
      accountBalance: 10000,
      riskPercentage: 1,
      stopLossDistance: 50,
      instrumentType: 'forex',
    });

    expect(result.riskAmount).toBe(100);
    expect(result.estimatedLoss).toBe(100);
  });

  it('uses forex pip value when deriving standard lots', () => {
    const result = calculatePositionSize({
      accountBalance: 10000,
      riskPercentage: 1,
      stopLossDistance: 50,
      instrumentType: 'forex',
    });

    expect(result.lotSize).toBeCloseTo(0.2);
    expect(result.positionSize).toBeCloseTo(20000);
  });

  it('uses entry and stop-loss prices for stock quantities', () => {
    const result = calculatePositionSize({
      accountBalance: 10000,
      riskPercentage: 1,
      stopLossDistance: 0,
      instrumentType: 'stocks',
      entryPrice: 100,
      stopLossPrice: 95,
    });

    expect(result.positionSize).toBe(20);
    expect(result.lotSize).toBeNull();
  });

  it('does not calculate a position with missing required inputs', () => {
    const result = calculatePositionSize({
      accountBalance: 10000,
      riskPercentage: 1,
      stopLossDistance: 0,
      instrumentType: 'forex',
    });

    expect(result.positionSize).toBe(0);
    expect(result.lotSize).toBeNull();
  });
});
