import { describe, expect, it } from 'vitest';

import { calculateKhums } from '@/lib/khums';

describe('calculateKhums', () => {
  it('calculates khums as 20% of positive yearly surplus', () => {
    const result = calculateKhums({
      totalIncome: 12000,
      totalExpenses: 7000,
    });

    expect(result.surplus).toBe(5000);
    expect(result.khumsDue).toBe(1000);
    expect(result.imamShare).toBe(500);
    expect(result.sayyidShare).toBe(500);
    expect(result.remainingAfterKhums).toBe(4000);
    expect(result.status).toBe('incomplete');
  });

  it('does not calculate khums on zero or negative surplus', () => {
    expect(calculateKhums({ totalIncome: 5000, totalExpenses: 5000 }).khumsDue).toBe(0);

    const negativeSurplus = calculateKhums({
      totalIncome: 3000,
      totalExpenses: 4500,
    });

    expect(negativeSurplus.surplus).toBe(0);
    expect(negativeSurplus.khumsDue).toBe(0);
    expect(negativeSurplus.status).toBe('not_due');
  });

  it('supports custom imam and sayyid split percentages', () => {
    const result = calculateKhums({
      totalIncome: 15000,
      totalExpenses: 10000,
      imamSharePercent: 0.6,
      sayyidSharePercent: 0.4,
    });

    expect(result.khumsDue).toBe(1000);
    expect(result.imamShare).toBe(600);
    expect(result.sayyidShare).toBe(400);
  });

  it('keeps individual split percentages inside the valid 0 to 100 percent range', () => {
    const result = calculateKhums({
      totalIncome: 15000,
      totalExpenses: 10000,
      imamSharePercent: 1.5,
      sayyidSharePercent: -0.2,
    });

    expect(result.khumsDue).toBe(1000);
    expect(result.imamShare).toBe(1000);
    expect(result.sayyidShare).toBe(0);
  });

  it('tracks incomplete, complete, and overpaid payment states', () => {
    expect(calculateKhums({ totalIncome: 10000, totalExpenses: 5000, paidAmount: 250 }).status).toBe('incomplete');
    expect(calculateKhums({ totalIncome: 10000, totalExpenses: 5000, paidAmount: 1000 }).status).toBe('complete');
    expect(calculateKhums({ totalIncome: 10000, totalExpenses: 5000, paidAmount: 1100 }).status).toBe('overpaid');
  });
});
