import { afterEach, describe, expect, it, vi } from 'vitest';
import { dedupeEconomicEvents, normalizeFmpEconomicEvent } from '@/lib/providers/economic-calendar/fmp';
import { getEconomicCalendar } from '@/lib/providers/economic-calendar';
import { toCycleIndicator } from '@/lib/providers/economic-data/common';
import { normalizeFinnhubEconomicEvent } from '@/lib/providers/economic-calendar/finnhub';
import { dedupeMarketNewsArticles, normalizeFinnhubNewsArticle } from '@/lib/providers/news/finnhub';
import { getMarketNews } from '@/lib/providers/news';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('market news provider normalization', () => {
  it('normalizes Finnhub news without exposing unsafe URLs or fabricating sentiment', () => {
    const article = normalizeFinnhubNewsArticle({
      id: 12345,
      headline: 'Nvidia shares move after earnings',
      summary: 'Short provider summary',
      source: 'Reuters',
      url: 'https://www.reuters.com/markets/example',
      image: 'javascript:alert(1)',
      datetime: 1782403200,
      related: 'NVDA,MSFT',
    }, 0, {
      scope: 'general',
      symbol: 'NVDA',
      from: '2026-06-24',
      to: '2026-06-25',
      limit: 20,
    });

    expect(article).toMatchObject({
      id: '12345',
      headline: 'Nvidia shares move after earnings',
      source: 'Reuters',
      sourceUrl: 'https://www.reuters.com/markets/example',
      imageUrl: null,
      sentiment: null,
      sentimentSource: null,
      provider: 'finnhub',
    });
    expect(article?.relatedSymbols).toEqual(['NVDA', 'MSFT']);
  });

  it('deduplicates news by canonical URL before title fallback', () => {
    const base = {
      id: 'one',
      headline: 'Fed decision moves markets',
      summary: null,
      source: 'Reuters',
      sourceUrl: 'https://example.com/story',
      imageUrl: null,
      publishedAt: '2026-06-25T12:00:00.000Z',
      category: null,
      relatedSymbols: [],
      sentiment: null,
      sentimentSource: null,
      provider: 'finnhub' as const,
    };

    expect(dedupeMarketNewsArticles([base, { ...base, id: 'two' }])).toHaveLength(1);
  });

  it('returns not_configured when Finnhub news key is missing', async () => {
    vi.stubEnv('FINNHUB_API_KEY', '');

    const result = await getMarketNews({
      scope: 'general',
      from: '2026-06-24',
      to: '2026-06-25',
      limit: 20,
    });

    expect(result.status).toBe('not_configured');
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('provider_not_configured');
  });
});

describe('economic calendar provider normalization', () => {
  it('normalizes Finnhub calendar values without exposing provider payloads', () => {
    const event = normalizeFinnhubEconomicEvent({
      event: 'Federal Reserve Interest Rate Decision',
      time: '2026-06-25 18:00:00',
      country: 'US',
      impact: 'High',
      actual: null,
      forecast: '4.50%',
      previous: '4.75%',
    }, 0);

    expect(event).toMatchObject({
      title: 'Federal Reserve Interest Rate Decision',
      country: 'US',
      currency: 'USD',
      impact: 'high',
      actual: null,
      forecast: '4.50%',
      previous: '4.75%',
      source: 'Finnhub',
      provider: 'finnhub',
    });
    expect(event?.dateTimeUtc).toBe('2026-06-25T18:00:00.000Z');
  });

  it('normalizes FMP calendar values without converting missing fields to zero', () => {
    const event = normalizeFmpEconomicEvent({
      event: 'CPI YoY',
      date: '2026-06-25 12:30:00',
      country: 'US',
      currency: 'USD',
      impact: '',
      actual: '',
      forecast: '2.4%',
      previous: null,
      unit: '%',
    }, 0);

    expect(event).toMatchObject({
      title: 'CPI YoY',
      country: 'US',
      currency: 'USD',
      impact: 'unknown',
      actual: null,
      forecast: '2.4%',
      previous: null,
      unit: '%',
      provider: 'fmp',
    });
    expect(event?.dateTimeUtc).toBe('2026-06-25T12:30:00.000Z');
  });

  it('deduplicates economic events by stable event identity', () => {
    const first = normalizeFmpEconomicEvent({
      event: 'Retail Sales',
      date: '2026-06-25 10:00:00',
      country: 'US',
      currency: 'USD',
    }, 0);
    const second = normalizeFmpEconomicEvent({
      event: 'Retail Sales',
      date: '2026-06-25 10:00:00',
      country: 'US',
      currency: 'USD',
    }, 1);

    expect(first && second ? dedupeEconomicEvents([first, second]) : []).toHaveLength(1);
  });

  it('returns not_configured when calendar keys are missing', async () => {
    vi.stubEnv('FINNHUB_API_KEY', '');
    vi.stubEnv('FMP_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', 'fmp');

    const result = await getEconomicCalendar({
      from: '2026-06-25',
      to: '2026-06-26',
    });

    expect(result.status).toBe('not_configured');
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('provider_not_configured');
  });

  it('prefers Finnhub economic calendar when FINNHUB_API_KEY is configured', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', '');

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      economicCalendar: [
        {
          event: 'CPI YoY',
          time: '2026-07-01 12:30:00',
          country: 'US',
          impact: '2',
          forecast: '2.4%',
          previous: '2.5%',
        },
      ],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEconomicCalendar({
      from: '2026-07-01',
      to: '2026-07-02',
      force: true,
    });

    expect(result.status).toBe('success');
    expect(result.provider).toBe('finnhub');
    expect(result.data[0]).toMatchObject({
      title: 'CPI YoY',
      provider: 'finnhub',
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('finnhub.io/api/v1/calendar/economic');
  });

  it('reports Finnhub calendar access failures as temporary provider errors', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.stubEnv('FMP_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', '');

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'You do not have access to this resource',
    }), { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEconomicCalendar({
      from: '2026-07-03',
      to: '2026-07-04',
      force: true,
    });

    expect(result.status).toBe('provider_error');
    expect(result.provider).toBe('finnhub');
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('provider_temporarily_unavailable');
  });

  it('keeps last successful calendar data as stale when a provider is rate-limited', async () => {
    vi.stubEnv('FINNHUB_API_KEY', '');
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', 'fmp');

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          event: 'GDP Growth Rate',
          date: '2026-06-27 12:30:00',
          country: 'US',
          currency: 'USD',
          impact: 'High',
          actual: null,
          forecast: '1.8%',
          previous: '1.6%',
        },
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'rate limit exceeded' }), { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    const query = {
      from: '2026-06-27',
      to: '2026-06-28',
      country: 'US',
      currency: 'USD',
    };
    const first = await getEconomicCalendar(query);
    const second = await getEconomicCalendar({ ...query, force: true });

    expect(first.status).toBe('success');
    expect(first.data).toHaveLength(1);
    expect(second.status).toBe('rate_limited');
    expect(second.stale).toBe(true);
    expect(second.cached).toBe(true);
    expect(second.data).toHaveLength(1);
    expect(second.messageCode).toBe('provider_rate_limited');
  });
});

describe('economic cycle indicators', () => {
  it('maps real macro indicator fields into cycle cards without fabricating values', () => {
    const indicator = toCycleIndicator({
      id: 'gdp',
      country: 'United States',
      indicator: 'Real GDP growth',
      value: 1.8,
      unit: '%',
      date: '2026-06-26T00:00:00.000Z',
      source: 'FRED (A191RL1Q225SBEA)',
      provider: 'fred',
      previous: 1.6,
      forecast: null,
      status: 'actual',
    });

    expect(indicator).toMatchObject({
      id: 'gdp',
      value: '1.8%',
      source: 'FRED (A191RL1Q225SBEA)',
      status: 'actual',
      change: {
        basis: 'previous',
        basisValue: '1.6%',
      },
    });
    expect(indicator.change?.delta).toBeCloseTo(0.2);
  });
});
