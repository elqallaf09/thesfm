import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TvDataNotice } from '@/components/markets-tv/TvDataNotice';
import { TvSceneDashboard } from '@/components/markets-tv/TvSceneDashboard';
import { TvStripQuote } from '@/components/markets-tv/TvStripQuote';
import { tvStripSourceCooling } from '@/lib/markets-tv/scene-display';
import type { TvQuote, TvSnapshot } from '@/lib/markets-tv/types';

const now = Date.parse('2026-10-28T05:00:00Z');
const retryAt = '2026-10-28T05:01:00Z';
const quote = (index = 0): TvQuote => ({
  symbol: `QA${index}`, name: `Unavailable instrument ${index}`, nameAr: `أداة ${index}`,
  price: null, currency: 'KWD', source: null, observedAt: null, receivedAt: null,
  changePercent: null, status: 'unavailable', exchange: 'QA', country: 'KW', issue: 'rate_limited',
});
const snapshot: TvSnapshot = {
  group: 'gulf', summary: Array.from({ length: 4 }, (_, index) => quote(index)),
  quotes: Array.from({ length: 6 }, (_, index) => quote(index + 4)),
  available: 0, total: 6, generatedAt: new Date(now).toISOString(), retryAt,
};
const noop = () => undefined;

describe('TV unavailable-price presentation', () => {
  it('keeps every selected instrument visible and actionable when the source is limited', () => {
    const html = renderToStaticMarkup(<TvSceneDashboard snapshot={snapshot} loading={false} error={null}
      language="en" now={now} news={[]} linked={false} watchlist={false} ticker tickerPaused={false} speed={56}
      onQuote={noop} onStory={noop} onPair={noop} onRefresh={noop} onTickerPause={noop}/>);
    for (let index = 0; index < 10; index++) expect(html).toContain(`Unavailable instrument ${index}`);
    expect(html.match(/class="tv-quote tv-scene-row"/g)).toHaveLength(6);
    expect(html).toContain('Source request limit reached');
    expect(html).toContain('0 / 10');
    expect(html).not.toContain('class="tv-scene-no-data"');
    expect(html).not.toContain('class="tv-scene-price"');
    expect(html).not.toContain('class="tv-scene-summary-value"');
    expect(html).not.toContain('class="tv-scene-ticker"');
  });

  it('never renders private instrument names before the device is linked', () => {
    const html = renderToStaticMarkup(<TvSceneDashboard snapshot={snapshot} loading={false} error={null}
      language="en" now={now} news={[]} linked={false} watchlist ticker tickerPaused={false} speed={56}
      onQuote={noop} onStory={noop} onPair={noop} onRefresh={noop} onTickerPause={noop}/>);
    expect(html).not.toContain('Unavailable instrument');
    expect(html).not.toContain('tv-data-notice');
    expect(html).toContain('tv-viewing-empty');
  });

  it('shows one failure reason and no misleading price or change placeholders in a strip card', () => {
    const html = renderToStaticMarkup(<TvStripQuote quote={quote()} group="gulf" language="en" now={now} duplicate={false} onQuote={noop}/>);
    expect(html).toContain('Source request limit reached');
    expect(html).toContain('Unavailable instrument 0');
    expect(html).not.toContain('class="tv-strip-price"');
    expect(html).not.toContain('class="tv-strip-change"');
    expect(html).not.toContain('—');
  });

  it('labels the cooldown as a retry time and never as a quote observation', () => {
    const future = renderToStaticMarkup(<TvDataNotice quotes={[quote()]} language="en" retryAt={retryAt} now={now} loading={false} refresh={noop}/>);
    expect(future).toContain('Retry after');
    expect(future).toContain(`dateTime="${retryAt}"`);
    expect(future).toContain('disabled=""');
    for (const value of ['invalid', '2026-10-28T04:59:00Z', undefined]) {
      const html = renderToStaticMarkup(<TvDataNotice quotes={[quote()]} language="en" retryAt={value} now={now} loading={false} refresh={noop}/>);
      expect(html).not.toContain('disabled=""');
      expect(html).not.toContain('<time');
    }
    const priced = { ...quote(), issue: undefined, price: 1.2, source: 'Verified test source' };
    expect(renderToStaticMarkup(<TvDataNotice quotes={[quote(), priced]} language="en" now={now} loading={false} refresh={noop}/>)).toBe('');
  });

  it('explains a failed update while retaining previous prices without calling a mixed healthy scene unavailable', () => {
    const retained = { ...quote(), price: 1.2, source: 'Verified previous source', status: 'stale' as const };
    const html = renderToStaticMarkup(<TvDataNotice quotes={[retained]} language="en" retryAt={retryAt} now={now} loading={false} refresh={noop}/>);
    expect(html).toContain('Source request limit reached');
    expect(html).toContain('Showing the last retained reading');
    expect(html).not.toContain('Verified quotes are currently unavailable');
    const healthy = { ...retained, issue: undefined, status: 'available' as const };
    expect(renderToStaticMarkup(<TvDataNotice quotes={[retained, healthy]} language="en" now={now} loading={false} refresh={noop}/>)).toBe('');
  });
});

describe('TV strip automatic paging during source cooldown', () => {
  it('holds automatic scanning for a future source deadline or a wholly rate-limited batch', () => {
    expect(tvStripSourceCooling([quote()], undefined, now)).toBe(true);
    expect(tvStripSourceCooling([{ ...quote(), issue: 'timeout' }], retryAt, now)).toBe(true);
    expect(tvStripSourceCooling([{ ...quote(), issue: 'timeout' }], retryAt, now + 60_001)).toBe(false);
    expect(tvStripSourceCooling([quote(), { ...quote(1), issue: undefined, price: 2, source: 'Verified test source' }], undefined, now)).toBe(false);
    expect(tvStripSourceCooling([], undefined, now)).toBe(false);
  });
});
