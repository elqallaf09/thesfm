import { describe, expect, it } from 'vitest';
import { normalizeTvSettings } from '@/lib/markets-tv/types';
import { quoteStatus, safeTvUrl, toTvQuote, tvMovers } from '@/lib/markets-tv/quotes';
import { tvPackagedOrigin, tvCorsHeaders } from '@/lib/markets-tv/cors';
import { nearestTvTarget } from '@/lib/markets-tv/navigation';
import { tvAssets } from '@/lib/markets-tv/catalog';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';
const now = Date.parse('2026-09-19T09:00:00Z');
const row = (overrides = {}): SfmMarketQuote => ({ symbol: 'AAPL', name: 'Apple', price: 100, changePercent: 0,
  currency: 'USD', quality: { state: 'complete' },
  provenance: { upstreamProvider: 'twelve_data', upstreamProviderName: 'Twelve Data', delayType: 'delayed',
    observedAt: new Date(now - 60000).toISOString(), receivedAt: new Date(now).toISOString(), observation: { precision: 'instant', marketOpen: true } },
  ...overrides } as SfmMarketQuote);
describe('TV evidence contracts', () => {
  it('does not turn missing numbers into zero or retrieval time into source time', () => {
    const q = toTvQuote('AAPL', row({ price: null }), undefined, now); expect(q.price).toBeNull(); expect(q.status).toBe('unavailable');
    const unknown = toTvQuote('AAPL', row({ provenance: { ...row().provenance, observedAt: null } }), undefined, now);
    expect(unknown.observedAt).toBeNull(); expect(unknown.status).toBe('unknown_time');
  });
  it('ages retained prices even when the source stops updating', () => {
    const q = toTvQuote('AAPL', row(), undefined, now); expect(q.status).toBe('delayed'); expect(quoteStatus(q, now + 20 * 60000)).toBe('stale');
    expect(toTvQuote('AAPL', row({ currency: null }), undefined, now).price).toBeNull();
  });
  it('rejects future times and excludes stale prices from mover ranking', () => {
    const future = toTvQuote('AAPL', row({ provenance: { ...row().provenance, observedAt: new Date(now + 3600000).toISOString() } }), undefined, now);
    expect(future.status).toBe('unknown_time');
    const pos = toTvQuote('AAPL', row({ changePercent: 2 }), undefined, now);
    const neg = toTvQuote('MSFT', row({ symbol: 'MSFT', changePercent: -2 }), undefined, now);
    expect(tvMovers([pos, neg], now).gainers).toEqual([pos]); expect(tvMovers([pos, neg], now).losers).toEqual([neg]);
    expect(tvMovers([pos, neg], now + 3600000)).toEqual({ gainers: [], losers: [] });
  });
  it('shows closing/reference prices as stale without entering current movers', () => {
    const closed = toTvQuote('AAPL', row({ provenance: { ...row().provenance, observation: { precision: 'instant', marketOpen: false } }, changePercent: 3 }), undefined, now);
    expect(closed.price).toBe(100); expect(closed.status).toBe('stale'); expect(closed.source).toBe('Twelve Data');
    expect(tvMovers([closed], now).gainers).toEqual([]);
    const daily = toTvQuote('AAPL', row({ provenance: { ...row().provenance, observation: { precision: 'date' } } }), undefined, now);
    expect(daily.status).toBe('stale');
    expect(toTvQuote('AAPL', row({ quality: { state: 'unavailable' } }), undefined, now).price).toBeNull();
    expect(toTvQuote('AAPL', row({ provenance: { ...row().provenance, upstreamProvider: null } }), undefined, now).price).toBeNull();
  });
  it('uses bounded real asset lists and retains all six Gulf countries', () => {
    const symbols=tvAssets('gulf').map(a=>a.symbol);
    for (const suffix of ['.KW','.SR','.QA']) expect(symbols.some(s=>s.endsWith(suffix))).toBe(true);
    expect(tvAssets('gulf')).toHaveLength(14); expect(tvAssets('europe')).toHaveLength(12); expect(tvAssets('watchlist')).toEqual([]);
  });
  it('normalizes corrupt device settings and preserves a nonempty market set', () => {
    const settings = normalizeTvSettings({ language:'xx', groups:['bad','us','us'], rotationSeconds:1, sound:'true' });
    expect(settings.language).toBe('ar'); expect(settings.groups).toEqual(['us']); expect(settings.rotationSeconds).toBe(30); expect(settings.sound).toBe(false);
    expect(normalizeTvSettings({groups:[]}).groups.length).toBeGreaterThan(0);
  });
  it('rejects unsafe news destinations', () => { expect(safeTvUrl('javascript:alert(1)')).toBeNull(); expect(safeTvUrl('https://name:secret@example.com')).toBeNull(); expect(safeTvUrl('https://example.com/news')).toBe('https://example.com/news'); });
});
describe('TV remote and packaged boundaries', () => {
  it('moves geometrically on RTL and LTR surfaces without choosing the current element', () => {
    const rects=[{left:0,top:0,width:100,height:50},{left:120,top:0,width:100,height:50},{left:0,top:70,width:100,height:50}];
    expect(nearestTvTarget(rects[0],rects,'ArrowRight')).toBe(1); expect(nearestTvTarget(rects[0],rects,'ArrowDown')).toBe(2); expect(nearestTvTarget(rects[0],rects,'ArrowLeft')).toBe(-1);
  });
  it('never permits packaged-origin cookie account approvals', () => {
    expect(tvPackagedOrigin(new Request('https://www.the-sfm.com/api/tv/account',{headers:{origin:'null'}}))).toBe(false);
    expect(tvPackagedOrigin(new Request('https://www.the-sfm.com/api/tv/device',{headers:{origin:'https://evil.example'}}))).toBe(false);
    expect(tvPackagedOrigin(new Request('https://www.the-sfm.com/api/tv/device',{headers:{origin:'https://appassets.androidplatform.net'}}))).toBe(true);
    expect(tvCorsHeaders('null')).not.toHaveProperty('Access-Control-Allow-Credentials');
  });
});
