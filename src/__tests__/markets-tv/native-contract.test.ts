import { describe, expect, it } from 'vitest';
import { currentStatus, parseSnapshot, sampleMetrics, snapshotPath } from '../../../apps/markets-tv-native/src/api';
const now = Date.parse('2026-11-06T21:00:00Z');
const q = { symbol: 'KFH.KW', name: 'KFH', nameAr: 'بيتك', price: .755, currency: 'KWD', source: 'Verified test source',
  observedAt: '2026-11-05T10:14:19Z', changePercent: .4, status: 'closed', changeBasis: 'session' };
describe('native TV public API contract', () => {
  it('requests exactly the existing public scenes and refuses cross-scene data', () => {
    expect(snapshotPath('gulf')).toBe('/api/tv/snapshot?group=gulf&scene=gulf&pageSize=10');
    expect(() => parseSnapshot({ scene: 'world', summary: [], quotes: [] }, 'gulf')).toThrow();
    expect(parseSnapshot({ scene: 'gulf', summary: [q], quotes: [] }, 'gulf').summary[0]).toMatchObject(q);
  });
  it('keeps unavailable readings absent instead of substituting zero or invented source evidence', () => {
    const snapshot = parseSnapshot({ scene: 'gulf', summary: [{ ...q, source: null }, { ...q, symbol: 'NBK.KW', observedAt: null }], quotes: [] }, 'gulf');
    expect(snapshot.summary.every(row => row.price === null)).toBe(true);
    expect(sampleMetrics(snapshot.summary, now)).toMatchObject({ total: 2, available: 0, comparable: 0, average: null });
  });
  it('retains a dated close across the Gulf weekend and excludes stale or rolling changes from the brief', () => {
    const base = parseSnapshot({ scene: 'gulf', summary: [q], quotes: [] }, 'gulf').summary[0];
    expect(sampleMetrics([base, base], now)).toMatchObject({ total: 1, available: 1, comparable: 1, average: .4 });
    expect(currentStatus({ ...base, status: 'delayed' }, now)).toBe('stale');
    expect(sampleMetrics([{ ...base, status: 'delayed' }, { ...base, symbol: 'BTC/USDT', changeBasis: '24h' }], now).comparable).toBe(0);
  });
});
