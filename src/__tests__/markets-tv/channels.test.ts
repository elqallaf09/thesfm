import { describe, expect, it } from 'vitest';
import { normalizeTvChannels } from '@/lib/markets-tv/channels';
import { normalizeTvSettings, type TvQuote } from '@/lib/markets-tv/types';
import { tvStripCoverage } from '@/lib/markets-tv/coverage';

describe('TV saved channels and display evidence', () => {
  it('round-trips ordering, 2,000 stock choices, empty selections and display settings without credentials', () => {
    const channel = { id: 'office', name: '  شاشة المكتب  ', token: 'never-save', settings: {
      marketIds: ['US', 'BOURSA_KUWAIT'], language: 'fr', stripDensity: 'compact', pricedOnly: true,
      marketSpeeds: { US: 80, BOURSA_KUWAIT: 36 }, autoHideControls: true,
    }, selections: { US: Array.from({ length: 2000 }, (_, i) => `QA${i}`), BOURSA_KUWAIT: [] } };
    const [saved] = normalizeTvChannels(JSON.parse(JSON.stringify([channel])));
    expect(saved.name).toBe('شاشة المكتب'); expect(saved).not.toHaveProperty('token');
    expect(saved.settings.marketIds).toEqual(['US', 'BOURSA_KUWAIT']);
    expect(saved.settings).toMatchObject({ language: 'fr', stripDensity: 'compact', pricedOnly: true, marketSpeeds: { US: 80, BOURSA_KUWAIT: 36 }, autoHideControls: true });
    expect(saved.selections.US).toHaveLength(2000); expect(saved.selections.BOURSA_KUWAIT).toEqual([]);
    expect(saved.selections.SSE).toBeUndefined();
  });
  it('bounds stored channels and rejects duplicate/unsafe IDs and invalid speed maps', () => {
    expect(normalizeTvChannels(null)).toEqual([]);
    const rows = [{ id: '<script>', name: 'bad' }, { id: 'one', name: 'one' }, { id: 'one', name: 'duplicate' }, { id: 'empty', name: ' ' }];
    expect(normalizeTvChannels(rows).map(row => row.id)).toEqual(['one']);
    expect(normalizeTvChannels(Array.from({ length: 20 }, (_, i) => ({ id: `channel-${i}`, name: 'test' })))).toHaveLength(8);
    const settings = normalizeTvSettings(JSON.parse('{"marketSpeeds":{"__proto__":80,"US":9999,"SSE":36},"pricedOnly":"true","stripSpeed":32}'));
    expect(settings.marketSpeeds).toEqual({ SSE: 36 }); expect(settings.pricedOnly).toBe(false); expect(settings.stripSpeed).toBe(56);
  });
  it('keeps stale/reference/unknown prices separate from recent coverage and counts only the batch', () => {
    const now = Date.parse('2026-09-19T12:00:00Z');
    const quote: TvQuote = { symbol: 'QA', name: 'QA', nameAr: 'QA', currency: 'USD', price: 10,
      source: 'QA fixture', observedAt: '2026-09-19T11:59:00Z', receivedAt: null, status: 'delayed', changePercent: 1, exchange: 'QA', country: null };
    const quotes: TvQuote[] = [quote, { ...quote, observedAt: '2026-09-18T12:00:00Z', status: 'reference' },
      { ...quote, observedAt: '2026-09-18T12:00:00Z' }, { ...quote, observedAt: null }, { ...quote, price: null }, { ...quote, source: null }];
    expect(tvStripCoverage(quotes, now)).toEqual({ loaded: 6, priced: 4, recent: 1, reference: 1, stale: 1, unknown: 1 });
    expect(tvStripCoverage([quote], now + 3600000).stale).toBe(1);
  });
});
