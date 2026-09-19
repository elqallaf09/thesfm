import { describe, expect, it } from 'vitest';
import { historyNumber, historyWindow, providerCandleInterval } from '@/lib/market/historyWindow';
const now = Date.parse('2026-09-19T12:00:00Z');
const point = (time: string, close = 4) => ({ time, close });
describe('market history range', () => {
  it('keeps absent OHLC and volume distinct from a measured zero', () => {
    for (const value of [null, undefined, '', ' ', false, []]) expect(historyNumber(value)).toBeNull();
    expect(historyNumber('0')).toBe(0);
  });
  it('does not display a whole year in a one-month chart', () => {
    const input = [point('2025-09-20'), point('2026-08-18'), point('2026-08-19'), point('2026-09-18')];
    expect(historyWindow(input, '1mo', now).map(p => p.time)).toEqual(['2026-08-19', '2026-09-18']);
  });
  it('clamps month and leap-year boundaries instead of rolling into the next month', () => {
    expect(historyWindow([point('2026-02-27'), point('2026-02-28'), point('2026-03-01')], '1mo', Date.parse('2026-03-31T12:00:00Z')).map(p => p.time)).toEqual(['2026-02-28', '2026-03-01']);
    expect(historyWindow([point('2023-02-27'), point('2023-02-28')], '1y', Date.parse('2024-02-29T12:00:00Z')).map(p => p.time)).toEqual(['2023-02-28']);
  });
  it('orders, deduplicates and removes future or invalid prices', () => {
    const input = [point('2026-09-18', 2), point('2026-09-17'), point('2026-09-18', 3), point('invalid'), point('2026-09-20'), point('2026-09-16', 0)];
    expect(historyWindow(input, 'max', now)).toEqual([point('2026-09-17'), point('2026-09-18', 3)]);
  });
  it('shows the latest real session over weekends and refuses an ancient daily session', () => {
    const input = [point('2026-09-17T14:00:00Z'), point('2026-09-18T14:00:00Z'), point('2026-09-18T14:05:00Z')];
    expect(historyWindow(input, '1d', now)).toEqual(input.slice(1));
    expect(historyWindow([point('2025-01-01')], '1d', now)).toEqual([]);
  });
  it('preserves the requested intraday interval in provider syntax', () => {
    expect(providerCandleInterval('5m', 'finnhub')).toBe('5');
    expect(providerCandleInterval('30m', 'twelve')).toBe('30min');
    expect(providerCandleInterval('1d', 'finnhub')).toBe('D');
  });
});
