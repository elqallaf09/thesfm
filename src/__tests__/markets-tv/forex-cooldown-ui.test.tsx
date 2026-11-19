import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TvMarketStrips } from '@/components/markets-tv/TvMarketStrips';
import { TvResourceCache, tvSnapshotRetryDelay } from '@/components/markets-tv/tvResourceCache';
import { tvSceneText, tvStripRetryAt, tvStripSourceCooling } from '@/lib/markets-tv/scene-display';
import type { TvLanguage, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';

const state = vi.hoisted(() => ({ snapshot: null as TvSnapshot | null, interval: 0 }));
vi.mock('@/components/markets-tv/useTvResource', () => ({
  useTvResource: (_path: string | null, interval: number) => {
    state.interval = interval;
    return { data: state.snapshot, loading: false, error: null, errorStatus: null };
  },
}));

const now = Date.parse('2026-10-28T05:00:00Z');
const retryAt = '2026-10-28T05:01:30Z';
const quote = (overrides: Partial<TvQuote> = {}): TvQuote => ({
  symbol: 'AED/KWD', name: 'Dirham / dinar', nameAr: 'درهم / دينار', currency: 'KWD',
  price: null, changePercent: null, source: null, observedAt: null, receivedAt: null,
  exchange: 'FOREX', country: null, status: 'unavailable', issue: 'rate_limited', retryAt, ...overrides,
});
const snapshot = (quotes: TvQuote[]): TvSnapshot => ({
  group: 'forex', market: 'forex', quotes, available: quotes.filter(value => value.price !== null).length,
  total: quotes.length, directoryTotal: 1399, generatedAt: new Date(now).toISOString(),
});
const reference = quote({ price: .08, source: 'Central bank · reference', observedAt: '2026-10-27',
  receivedAt: new Date(now).toISOString(), status: 'reference', issue: undefined, changeBasis: 'reference' });
const market = { id: 'forex', group: 'forex' as const, labelAr: 'الفوركس', labelEn: 'Forex', labelFr: 'Devises', count: 1399, status: 'directory' };
const noop = () => undefined;
function strip(language: TvLanguage, time = now) {
  return renderToStaticMarkup(<TvMarketStrips selections={{}} watchlistCount={0} markets={[market]}
    groups={['forex']} language={language} token="" activeGroup="forex" activeMarket="forex"
    now={time} onSelect={noop} onQuote={noop}/>);
}

afterEach(() => { state.snapshot = null; state.interval = 0; });

describe('Forex strip cooldown presentation', () => {
  it.each<TvLanguage>(['ar', 'en', 'fr'])('explains partial updates in %s while retaining the dated reference price', language => {
    state.snapshot = snapshot([reference, quote({ symbol: 'AED/KRW', currency: 'KRW' })]);
    const html = strip(language);
    expect(html).toContain(tvSceneText(language, 'currencyUpdatesPartial'));
    expect(html).toContain(tvSceneText(language, 'automaticRetryAfter'));
    expect(html).toContain(tvSceneText(language, 'kuwaitTime'));
    expect(html).toContain(`dateTime="${retryAt}"`);
    expect(html).toContain('08:01');
    expect(html).toContain('1 / 2');
    expect(html).toContain('AED/KWD');
    expect(html).not.toContain('AED/KRW');
    expect(html).toContain('Central bank · reference');
    expect(html).toContain('data-status="reference"');
    expect(html).toContain('dateTime="2026-10-27"');
    expect(html).toContain('data-source-cooling="true"');
    expect(html).not.toContain(tvSceneText(language, 'noScenePrices'));
    expect(state.interval).toBe(60_000);
  });

  it('shows a temporary update pause when the batch has no price, without starting an empty-page scan', () => {
    state.snapshot = snapshot([quote()]);
    const html = strip('ar');
    expect(html).toContain(tvSceneText('ar', 'currencyUpdatesPaused'));
    expect(html).toContain('data-source-cooling="true"');
    expect(html).toContain('0 / 1');
    expect(html).not.toContain('class="tv-strip-price"');
  });

  it('releases a batch once its last known deadline expires and removes the obsolete retry time', () => {
    state.snapshot = snapshot([quote()]);
    const html = strip('en', now + 90_000);
    expect(html).toContain('data-source-cooling="false"');
    expect(html).not.toContain(`dateTime="${retryAt}"`);
    expect(html).not.toContain(tvSceneText('en', 'automaticRetryAfter'));
  });
});

describe('Forex quote-level retry scheduling', () => {
  it('honors the earliest future deadline in a partial/reference Forex batch without pausing independent markets', () => {
    const data = snapshot([reference, quote({ retryAt: '2026-10-28T05:02:00Z' })]);
    expect(tvSnapshotRetryDelay(data, now)).toBe(90_000);
    expect(tvStripRetryAt(data.quotes, '2026-10-28T05:03:00Z', now)).toBe(retryAt);
    expect(tvStripSourceCooling(data.quotes, undefined, now, 'forex')).toBe(true);
    expect(tvSnapshotRetryDelay({ ...data, group: 'global' }, now)).toBe(0);
    expect(tvStripSourceCooling(data.quotes, undefined, now, 'global')).toBe(false);
  });

  it('ignores malformed or expired deadlines for polling and resumes rate-limited batches after known expiry', () => {
    const data = snapshot([quote({ retryAt: 'invalid' }), quote({ retryAt: '2026-10-28T04:59:59Z' })]);
    expect(tvSnapshotRetryDelay({ ...data, retryAt: 'invalid' }, now)).toBe(0);
    expect(tvStripRetryAt(data.quotes, 'invalid', now)).toBeNull();
    expect(tvStripSourceCooling([quote({ retryAt: '2026-10-28T04:59:59Z' })], undefined, now, 'forex')).toBe(false);
    expect(tvSnapshotRetryDelay(snapshot([quote({ retryAt: new Date(now + 86_400_000).toISOString() })]), now)).toBe(300_000);
  });

  it('shares the Forex cooldown across refresh/remount, preserves source timestamps and retries after expiry', async () => {
    let clock = now;
    const cache = new TvResourceCache(32, () => clock);
    const path = '/api/tv/snapshot?group=forex&market=forex&pageSize=12';
    const options = () => ({ signal: new AbortController().signal, ttlMs: 60_000 });
    const waiting = snapshot([reference, quote({ symbol: 'AED/KRW', currency: 'KRW' })]);
    const recovered = snapshot([quote({ price: .081, source: 'Verified source', issue: undefined, retryAt: undefined,
      status: 'delayed', observedAt: '2026-10-28T05:01:30Z', receivedAt: '2026-10-28T05:01:31Z' })]);
    const load = vi.fn().mockResolvedValueOnce(waiting).mockResolvedValue(recovered);
    await cache.request(path, options(), load);
    clock += 60_000;
    const retained = await cache.request<TvSnapshot>(path, { ...options(), force: true }, load);
    await cache.request(path, options(), load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(retained.quotes[0]).toMatchObject({ price: .08, status: 'reference', observedAt: '2026-10-27', retryAt });
    clock += 30_000;
    expect((await cache.request<TvSnapshot>(path, options(), load)).quotes[0]).toMatchObject({
      price: .081, observedAt: '2026-10-28T05:01:30Z', retryAt: undefined,
    });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
