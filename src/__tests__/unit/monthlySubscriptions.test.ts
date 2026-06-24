import { describe, expect, it } from 'vitest';
import {
  annualEquivalent,
  isSpendActiveStatus,
  monthlyEquivalent,
  nextRenewalDate,
} from '@/lib/subscriptions/monthlySubscriptions';

describe('monthly subscription normalization', () => {
  it('normalizes common billing cycles to monthly equivalents', () => {
    expect(monthlyEquivalent(12, 'monthly')).toBe(12);
    expect(monthlyEquivalent(120, 'yearly')).toBe(10);
    expect(monthlyEquivalent(9, 'quarterly')).toBe(3);
    expect(monthlyEquivalent(3, 'weekly')).toBe(13);
  });

  it('normalizes annual equivalents from the monthly value', () => {
    expect(annualEquivalent(5, 'monthly')).toBe(60);
    expect(annualEquivalent(120, 'yearly')).toBe(120);
    expect(annualEquivalent(9, 'quarterly')).toBe(36);
  });

  it('only treats active subscriptions as spend-active', () => {
    expect(isSpendActiveStatus('active')).toBe(true);
    expect(isSpendActiveStatus('paused')).toBe(false);
    expect(isSpendActiveStatus('cancelled')).toBe(false);
    expect(isSpendActiveStatus('trial')).toBe(false);
    expect(isSpendActiveStatus('expired')).toBe(false);
  });

  it('rolls renewal dates forward without inventing missing dates', () => {
    const now = new Date('2026-06-25T10:00:00Z');

    expect(nextRenewalDate('', 'monthly', now)).toBeNull();
    expect(nextRenewalDate('2026-06-25', 'monthly', now)).toBe('2026-06-25');
    expect(nextRenewalDate('2026-01-15', 'monthly', now)).toBe('2026-07-15');
    expect(nextRenewalDate('2026-05-01', 'quarterly', now)).toBe('2026-08-01');
    expect(nextRenewalDate('2025-07-01', 'yearly', now)).toBe('2026-07-01');
  });
});
