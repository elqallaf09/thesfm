import { describe, expect, it } from 'vitest';
import { tvPrice, tvQuotePrice, tvQuoteTime, tvTime } from '@/lib/markets-tv/i18n';

describe('consistent TV numeric and time display', () => {
  it('pads ordinary prices while retaining currency and tiny-token precision', () => {
    expect(tvPrice(228.5, 'USD')).toBe('228.50');
    expect(tvPrice(5961.2, 'USD')).toBe('5,961.20');
    expect(tvPrice(96420, 'USD')).toBe('96,420.00');
    expect(tvPrice(.2285, 'KWD')).toBe('0.229');
    expect(tvPrice(.025, 'USD')).toBe('0.025000');
    expect(tvPrice(.0000000123456, 'USD')).toBe('0.0000000123456');
    for (const invalid of [null, NaN, Infinity, 0, -1]) expect(tvPrice(invalid, 'USD')).toBe('—');
  });
  it('keeps forex precision without rounding an exchange rate to equity-price precision', () => {
    expect(tvQuotePrice({ price: 1.123456, currency: 'USD', exchange: 'FOREX', symbol: 'EUR/USD' })).toBe('1.123456');
    expect(tvQuotePrice({ price: 150.123, currency: 'JPY', exchange: 'FOREX', symbol: 'USD/JPY' })).toBe('150.123');
    expect(tvQuotePrice({ price: .0000000123456, currency: 'USD', exchange: 'FOREX', symbol: 'IRR/USD' })).toBe('0.0000000123456');
  });
  it.each(['ar', 'en', 'fr'] as const)('uses 24-hour Kuwait time in %s and only hides the same-day date', language => {
    const now = Date.parse('2026-11-03T21:05:00Z'); // Already 4 November in Kuwait.
    expect(tvTime('2026-11-03T21:00:00Z', language)).toBe('00:00');
    expect(tvQuoteTime('2026-11-03T21:00:00Z', language, now)).toBe('00:00');
    expect(tvQuoteTime('2026-11-03T20:53:00Z', language, now)).toBe('2026-11-03 · 23:53');
    expect(tvQuoteTime('2025-11-04T12:30:00Z', language, now)).toBe('2025-11-04 · 15:30');
    expect(tvQuoteTime('2026-11-03', language, now)).toBe('2026-11-03');
    expect(tvQuoteTime(null, language, now)).toBe('—');
  });
});
