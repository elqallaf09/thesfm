import { describe, expect, it } from 'vitest';
import { MOBILE_RESOURCES, localized, resourceFor } from '@/lib/mobile/resourceContract';
import { decodeMobileCursor, encodeMobileCursor, recordInputSchema } from '@/lib/mobile/resourceValidation';
import { screenForLink } from '../../../apps/expo-go/src/navigation';
import { calculateCompound, calculateLoan, calculateZakat } from '../../../apps/expo-go/src/calculators';
import { ACCOUNT_SYNC_INTERVAL_MS, resumedToForeground } from '../../../apps/expo-go/src/accountSyncPolicy';
import { portfolioMetrics } from '../../../apps/expo-go/src/investorPortfolio';

describe('shared mobile resource contracts', () => {
  it('has complete translations and rejects owner injection and computed financial fields', () => {
    for (const resource of MOBILE_RESOURCES) {
      expect(new Set(resource.fields.map(field => field.key)).size).toBe(resource.fields.length);
      for (const lang of ['ar', 'en', 'fr'] as const) expect(localized(resource.label, lang)).toBeTruthy();
      const schema = recordInputSchema(resource, true);
      expect(schema.safeParse({ user_id: 'another-user' }).success).toBe(false);
      expect(schema.safeParse({ converted_market_value: 123 }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    }
  });
  it('validates monetary values, currencies, calendar dates, and resource boundaries', () => {
    const schema = recordInputSchema(resourceFor('finance', 'expenses')!);
    expect(schema.safeParse({ name: 'Coffee', amount: 1.25, currency: 'KWD', date: '2026-10-24' }).success).toBe(true);
    for (const amount of [-1, NaN, Infinity, '100']) expect(schema.safeParse({ name: 'Expense', amount, currency: 'KWD' }).success).toBe(false);
    expect(schema.safeParse({ name: 'Expense', amount: 1, currency: 'AED/KWD' }).success).toBe(false);
    expect(schema.safeParse({ name: 'Expense', amount: 1, currency: 'KWD', date: '2026-02-30' }).success).toBe(false);
    expect(resourceFor('finance', 'invoices')).toBeUndefined(); expect(resourceFor('business', 'watchlist')).toBeUndefined();
  });
  it('uses validated cursors, including a tie-breaker for identical timestamps', () => {
    const row = { created_at: '2026-10-24T10:00:00.000Z', id: 'c52a014b-e3fc-4e4c-9279-418377c2267e' };
    expect(decodeMobileCursor(encodeMobileCursor(row))).toEqual(row);
    for (const cursor of ['malformed', 'x'.repeat(513), Buffer.from(JSON.stringify({ ...row, id: '1),user_id.neq.owner' })).toString('base64url')]) expect(() => decodeMobileCursor(cursor)).toThrow('INVALID_CURSOR');
  });
});
describe('native navigation', () => {
  it('routes website and product deep links internally and preserves product boundaries', () => {
    expect(screenForLink('https://www.the-sfm.com/income', 'finance')).toEqual({ screen: { kind: 'records', resource: 'income' } });
    expect(screenForLink('the-sfm-investor://market-watchlist', 'investor')).toEqual({ screen: { kind: 'records', resource: 'watchlist' } });
    expect(screenForLink('https://www.the-sfm.com/notifications/channels', 'finance')).toEqual({ screen: { kind: 'channels' } });
    expect(screenForLink('https://www.the-sfm.com/invoices', 'finance')).toEqual({ screen: { kind: 'unavailable', path: '/invoices' } });
    expect(screenForLink('https://www.the-sfm.com.evil.example/income', 'finance')).toHaveProperty('external');
    expect(screenForLink('javascript:alert(1)', 'finance')).toHaveProperty('screen.kind', 'unavailable');
    expect(screenForLink('/symbol-details/NBK.KW', 'investor')).toHaveProperty('screen.symbol', 'NBK.KW');
  });
});
describe('account-backed mobile synchronization', () => {
  it('refreshes only after the application returns to the foreground', () => {
    expect(ACCOUNT_SYNC_INTERVAL_MS).toBe(30_000);
    expect(resumedToForeground('background', 'active')).toBe(true);
    expect(resumedToForeground('inactive', 'active')).toBe(true);
    expect(resumedToForeground('active', 'active')).toBe(false);
    expect(resumedToForeground('active', 'background')).toBe(false);
  });
  it('only totals real converted holding values in one displayed account currency', () => {
    const snapshot = portfolioMetrics([
      { id: 'one', created_at: '2026-10-24T00:00:00.000Z', converted_market_value: 40, user_currency: 'KWD' },
      { id: 'two', created_at: '2026-10-24T00:00:01.000Z', converted_market_value: 60, user_currency: 'KWD' },
      { id: 'three', created_at: '2026-10-24T00:00:02.000Z', native_market_value: 10, native_currency: 'USD' },
    ], [{ id: 'watch', created_at: '2026-10-24T00:00:03.000Z' }]);
    expect(snapshot).toEqual({ holdingCount: 3, watchlistCount: 1, valuedCount: 2, totalConvertedValue: 100, userCurrencies: ['KWD'] });
  });
});
describe('financial calculator boundaries', () => {
  it('handles zero interest, end-of-month contributions, and lunar-year zakat', () => {
    expect(calculateLoan(1200, 0, 1)).toBe(100); expect(calculateCompound(1000, 0, 1, 100)).toBe(2200);
    expect(calculateCompound(1000, 12, 1, 0)).toBeCloseTo(1126.825, 2);
    expect(calculateZakat(4000, 5000)).toBe(0); expect(calculateZakat(5000, 5000)).toBe(125);
    expect(calculateZakat(1000, 0)).toBeNull(); expect(calculateLoan(1, 1, 0)).toBeNull(); expect(calculateCompound(1, Infinity, 1, 0)).toBeNull();
  });
});
