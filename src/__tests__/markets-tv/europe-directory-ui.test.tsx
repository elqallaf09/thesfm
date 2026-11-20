import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TvAllStocks } from '@/components/markets-tv/TvAllStocks';
import { TvQuoteTable } from '@/components/markets-tv/TvQuoteTable';
import { hallText } from '@/lib/markets-tv/hallText';
import type { TvInstrument, TvInstrumentPage } from '@/lib/markets-tv/selections';
import type { TvLanguage, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';

const state = vi.hoisted(() => ({ directory: null as TvInstrumentPage | null, snapshot: null as TvSnapshot | null, paths: [] as (string | null)[] }));
vi.mock('@/components/markets-tv/useTvResource', () => ({
  useTvResource: (path: string | null) => {
    state.paths.push(path);
    return { data: path?.startsWith('/api/tv/instruments?') ? state.directory : state.snapshot, loading: false, error: null, errorStatus: null };
  },
}));
vi.mock('@/components/markets-tv/useTvTableSize', () => ({ useTvTableSize: () => 6 }));
vi.mock('@/components/markets-tv/TvHeadlineBand', () => ({ TvHeadlineBand: () => null }));
vi.mock('@/components/markets-tv/TvQuoteMarquee', () => ({ TvQuoteMarquee: () => null }));

const now = Date.parse('2026-11-20T10:00:00Z');
const noop = () => undefined;
const listings: TvInstrument[] = [
  { symbol: 'QA', name: 'Amsterdam listing', region: 'TD_XAMS', listingKey: 'TD_XAMS:QA', currency: 'EUR' },
  { symbol: 'QA', name: 'Swiss listing', region: 'TD_XSWX', listingKey: 'TD_XSWX:QA', currency: 'CHF' },
  { symbol: 'WAIT', name: 'Awaiting a quote', region: 'TD_XETR', listingKey: 'TD_XETR:WAIT', currency: 'EUR' },
];
const quote = (item: TvInstrument, price: number): TvQuote => ({ ...item, nameAr: item.name,
  price, currency: item.currency ?? null, changePercent: 1, source: 'QA evidence', observedAt: new Date(now).toISOString(),
  receivedAt: new Date(now).toISOString(), status: 'delayed', exchange: item.region ?? null, country: null,
});
function browse(language: TvLanguage = 'ar') {
  return renderToStaticMarkup(<TvAllStocks language={language} now={now} markets={[
    { id: 'europe', group: 'europe', labelAr: 'أوروبا', labelEn: 'Europe', labelFr: 'Europe', count: 83, status: 'directory' },
    { id: 'TD_XAMS', group: 'europe', labelAr: 'أمستردام', labelEn: 'Amsterdam', labelFr: 'Amsterdam', count: 40, status: 'directory' },
    { id: 'TD_XSWX', group: 'europe', labelAr: 'سويسرا', labelEn: 'Switzerland', labelFr: 'Suisse', count: 43, status: 'directory' },
  ]} ready revision={0} news={[]} paused ticker={false} speed={36}
    onQuote={noop} onStory={noop} onRefresh={noop} onTickerPause={noop}/>);
}
afterEach(() => { state.directory = null; state.snapshot = null; state.paths = []; });

describe('European directory presentation', () => {
  it.each<TvLanguage>(['ar', 'en', 'fr'])('labels selected coverage honestly in %s and keeps names without prices', language => {
    state.directory = { items: listings, total: 3, directoryTotal: 3, page: 0, pageSize: 6, coverage: 'selected', retryAfterMs: 5000 };
    const html = browse(language);
    expect(html).toContain(hallText(language, 'directorySelected'));
    expect(html).toContain(hallText(language, 'sample'));
    expect(html).not.toContain(hallText(language, 'allStocks'));
    expect(html.match(/class="tv-hall-row"/g)).toHaveLength(3);
    expect(html).toContain('Awaiting a quote');
    expect(html).toContain(hallText(language, 'unavailable'));
    expect(html).not.toContain('0.00');
    if (language === 'ar') expect(html).toContain('قائمة مختارة — التغطية غير مكتملة');
  });

  it('requests only the returned page using listing identities and exposes individual exchanges', () => {
    state.directory = { items: listings, total: 83, directoryTotal: 83, page: 0, pageSize: 6, coverage: 'directory' };
    const html = browse('en');
    const path = state.paths.find(value => value?.startsWith('/api/tv/snapshot?'))!;
    const params = new URL(path!, 'https://tv.invalid').searchParams;
    expect(JSON.parse(params.get('listingKeys')!)).toEqual(listings.map(item => item.listingKey));
    expect(params.has('symbols')).toBe(false);
    expect(params.get('pageSize')).toBe('6');
    expect(html).toContain('value="TD_XAMS"');
    expect(html).toContain('value="TD_XSWX"');
    expect(html).toContain('1 / 14');
  });

  it('uses the previous API contract for listings without keys', () => {
    state.directory = { items: [{ symbol: 'LEGACY', name: 'Legacy directory' }], total: 1, directoryTotal: 1, page: 0, pageSize: 6 };
    browse();
    const path = state.paths.find(value => value?.startsWith('/api/tv/snapshot?'))!;
    const params = new URL(path!, 'https://tv.invalid').searchParams;
    expect(JSON.parse(params.get('symbols')!)).toEqual(['LEGACY']);
    expect(params.has('listingKeys')).toBe(false);
  });

  it.each(['pending', 'partial', 'snapshot', 'unavailable'] as const)('distinguishes %s directory coverage', coverage => {
    state.directory = { items: [], total: 0, directoryTotal: 0, page: 0, pageSize: 6, coverage };
    const html = browse();
    const key = { pending: 'directoryPending', partial: 'directoryPartial', snapshot: 'directorySnapshot', unavailable: 'directoryUnavailable' } as const;
    expect(html).toContain(hallText('ar', key[coverage]));
    expect(html).toContain(`data-coverage="${coverage}"`);
    expect(state.paths.filter(path => path?.startsWith('/api/tv/snapshot?'))).toHaveLength(0);
  });
});

describe('Listing-specific quote rows', () => {
  function table(quotes: TvQuote[], showUnavailable = true) {
    return renderToStaticMarkup(<TvQuoteTable items={listings} quotes={quotes} language="en" now={now} loading={false} showUnavailable={showUnavailable} select={noop}/>);
  }
  it('keeps same-symbol venues distinct, including currency and remote focus targets', () => {
    const html = table([quote(listings[1], 222), quote(listings[0], 111)]);
    const rows = html.split('<div class="tv-hall-row"').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('111.00'); expect(rows[0]).toContain('EUR'); expect(rows[0]).not.toContain('222.00');
    expect(rows[1]).toContain('222.00'); expect(rows[1]).toContain('CHF'); expect(rows[1]).not.toContain('111.00');
    expect(rows[2]).toContain('Price unavailable');
    expect(html).toContain('data-tv-focus-key="hall:TD_XAMS:QA"');
    expect(html).toContain('data-tv-focus-key="hall:TD_XSWX:QA"');
  });
  it('does not attach a legacy bare quote to both listings or hide their names', () => {
    const bare = { ...quote(listings[0], 999), listingKey: undefined };
    const html = table([bare]);
    expect(html).toContain('Amsterdam listing'); expect(html).toContain('Swiss listing');
    expect(html).not.toContain('999.00');
    expect(table([bare], false)).not.toContain('class="tv-hall-row"');
  });
});
