import { afterEach, describe, expect, it, vi } from 'vitest';
import { dedupeEconomicEvents, normalizeFmpEconomicEvent } from '@/lib/providers/economic-calendar/fmp';
import { getEconomicCalendar } from '@/lib/providers/economic-calendar';
import { getDividendCalendar } from '@/lib/providers/dividend-calendar';
import { normalizeEconomicEvents } from '@/lib/market/normalizeEconomicEvents';
import { toCycleIndicator } from '@/lib/providers/economic-data/common';
import { normalizeFinnhubEconomicEvent } from '@/lib/providers/economic-calendar/finnhub';
import { normalizeTradingEconomicsEvent } from '@/lib/providers/economic-calendar/tradingEconomics';
import { dedupeMarketNewsArticles, normalizeFinnhubNewsArticle } from '@/lib/providers/news/finnhub';
import { getMarketNews } from '@/lib/providers/news';
import { TR_MARKET } from '@/lib/translations/market';

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

  it('normalizes Trading Economics calendar values from official response fields', () => {
    const event = normalizeTradingEconomicsEvent({
      CalendarId: '87220',
      Date: '2026-07-06T13:30:00',
      Country: 'United States',
      Event: 'Non Farm Payrolls',
      Source: 'U.S. Bureau of Labor Statistics',
      Actual: '178K',
      Previous: '142K',
      Forecast: '175K',
      Importance: 3,
      Unit: 'K',
    }, 0);

    expect(event).toMatchObject({
      id: '87220',
      title: 'Non Farm Payrolls',
      country: 'United States',
      currency: 'USD',
      impact: 'high',
      actual: '178K',
      previous: '142K',
      forecast: '175K',
      unit: 'K',
      source: 'U.S. Bureau of Labor Statistics',
      provider: 'tradingeconomics',
    });
    expect(event?.dateTimeUtc).toBe('2026-07-06T13:30:00.000Z');
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
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
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
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', 'test-te-key');
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', '');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

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
    const finnhubLog = infoSpy.mock.calls.find(call => call[0] === '[economic-calendar] provider request' && (call[1] as Record<string, unknown> | undefined)?.provider === 'finnhub');
    expect(finnhubLog?.[1]).toMatchObject({
      finnhubApiKeyConfigured: true,
      provider: 'finnhub',
      requestStatus: 'success',
      responseStatusCode: 200,
      providerErrorMessage: null,
      eventsReturned: 1,
    });
    expect(JSON.stringify(finnhubLog?.[1] ?? {})).not.toContain('test-finnhub-key');
  });

  it('reports Finnhub calendar entitlement failures as not entitled when no fallback is configured', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
    vi.stubEnv('FMP_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', '');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'You do not have access to this resource on your current plan',
    }), { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEconomicCalendar({
      from: '2026-07-03',
      to: '2026-07-04',
      force: true,
    });

    expect(result.status).toBe('not_entitled');
    expect(result.provider).toBe('finnhub');
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('provider_access_denied');
  });

  it('falls back to Trading Economics when Finnhub calendar is blocked by plan access', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', 'test-te-key');
    vi.stubEnv('FMP_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', '');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'Economic calendar is not included in your plan',
      }), { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          CalendarId: 'te-1',
          Date: '2026-07-05T12:30:00',
          Country: 'United States',
          Event: 'Initial Jobless Claims',
          Source: 'U.S. Department of Labor',
          Importance: 2,
          Forecast: '220K',
          Previous: '218K',
        },
      ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEconomicCalendar({
      from: '2026-07-05',
      to: '2026-07-06',
      force: true,
    });

    expect(result.status).toBe('success');
    expect(result.provider).toBe('tradingeconomics');
    expect(result.data[0]).toMatchObject({
      title: 'Initial Jobless Claims',
      provider: 'tradingeconomics',
      currency: 'USD',
    });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('api.tradingeconomics.com/calendar/country/All/2026-07-05/2026-07-06');
  });

  it('falls back to FMP when Finnhub is missing and Trading Economics is not configured', async () => {
    vi.stubEnv('FINNHUB_API_KEY', '');
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', '');

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([
      {
        event: 'GDP Growth Rate',
        date: '2026-07-07 12:30:00',
        country: 'US',
        currency: 'USD',
        impact: 'High',
      },
    ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEconomicCalendar({
      from: '2026-07-07',
      to: '2026-07-08',
      force: true,
    });

    expect(result.status).toBe('success');
    expect(result.provider).toBe('fmp');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('financialmodelingprep.com/stable/economic-calendar');
  });

  it('returns a clean provider error when configured providers fail', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
    vi.stubEnv('FMP_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', '');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'upstream unavailable',
    }), { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEconomicCalendar({
      from: '2026-07-09',
      to: '2026-07-10',
      force: true,
    });

    expect(result.status).toBe('provider_error');
    expect(result.provider).toBe('finnhub');
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('provider_temporarily_unavailable');
  });

  it('falls back to Trading Economics when Finnhub returns an empty calendar payload', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', 'test-te-key');
    vi.stubEnv('FMP_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', '');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        economicCalendar: [],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          CalendarId: 'te-empty-fallback',
          Date: '2026-07-11T12:30:00',
          Country: 'United States',
          Event: 'Producer Price Index',
          Importance: 2,
          Forecast: '0.2%',
          Previous: '0.1%',
        },
      ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEconomicCalendar({
      from: '2026-07-11',
      to: '2026-07-12',
      force: true,
    });

    expect(result.status).toBe('success');
    expect(result.provider).toBe('tradingeconomics');
    expect(result.data[0]).toMatchObject({
      title: 'Producer Price Index',
      provider: 'tradingeconomics',
    });
  });

  it('returns a clean unavailable response when the configured provider returns no events', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
    vi.stubEnv('FMP_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', '');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      economicCalendar: [],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEconomicCalendar({
      from: '2026-07-11',
      to: '2026-07-12',
      force: true,
    });

    expect(result.status).toBe('provider_error');
    expect(result.provider).toBe('finnhub');
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('calendar_no_events');
  });

  it('returns a clean provider error on calendar network failure', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
    vi.stubEnv('FMP_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_API_KEY', '');
    vi.stubEnv('ECONOMIC_CALENDAR_PROVIDER', '');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEconomicCalendar({
      from: '2026-07-13',
      to: '2026-07-14',
      force: true,
    });

    expect(result.status).toBe('provider_error');
    expect(result.provider).toBe('finnhub');
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('provider_temporarily_unavailable');
    const networkLog = infoSpy.mock.calls.find(call => call[0] === '[economic-calendar] provider request' && (call[1] as Record<string, unknown> | undefined)?.requestStatus === 'network_error');
    expect(networkLog?.[1]).toMatchObject({
      finnhubApiKeyConfigured: true,
      provider: 'finnhub',
      responseStatusCode: null,
      eventsReturned: 0,
    });
    expect(JSON.stringify(networkLog?.[1] ?? {})).not.toContain('test-finnhub-key');
  });

  it('does not normalize placeholder calendar rows without a date into real events', () => {
    expect(normalizeEconomicEvents([
      {
        eventName: 'الحدث العام',
        country: 'غير متاح',
        currency: 'غير متاح',
        impact: 'غير متاح',
        previous: 'غير متاح',
        forecast: 'غير متاح',
        actual: 'غير متاح',
      },
    ])).toEqual([]);
  });

  it('keeps last successful calendar data as stale when a provider is rate-limited', async () => {
    vi.stubEnv('FINNHUB_API_KEY', '');
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
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

  it('keeps Arabic and English unavailable calendar copy localized', () => {
    expect(TR_MARKET.market_calendar_not_configured_title.ar).toBe('التقويم الاقتصادي غير متوفر حالياً');
    expect(TR_MARKET.market_calendar_not_configured_body.ar).toBe('تعذر جلب بيانات التقويم الاقتصادي من مزود البيانات الحالي. سيتم عرض الأحداث تلقائياً عند توفر مصدر بيانات يدعم هذه الخدمة.');
    expect(TR_MARKET.market_calendar_access_denied_title.ar).toBe('التقويم الاقتصادي غير متوفر حالياً');
    expect(TR_MARKET.market_calendar_access_denied_body.ar).toBe('مزود البيانات الحالي لا يملك صلاحية الوصول إلى التقويم الاقتصادي. سيتم عرض الأحداث تلقائياً عند ربط مزود يدعم هذه الخدمة.');
    expect(TR_MARKET.market_calendar_provider_label.ar).toBe('مزود البيانات');
    expect(TR_MARKET.market_calendar_provider_unavailable_badge.ar).toBe('غير متاح حالياً');
    expect(TR_MARKET.market_calendar_not_configured_title.en).toBe('Economic calendar is currently unavailable');
    expect(TR_MARKET.market_calendar_not_configured_body.en).toBe('Could not load economic calendar data from the current data provider. Events will appear automatically when a provider that supports this service is available.');
    expect(TR_MARKET.market_calendar_access_denied_title.en).toBe('Economic calendar is currently unavailable');
    expect(TR_MARKET.market_calendar_access_denied_body.en).toBe('The current data provider is not entitled to access the economic calendar. Events will appear automatically when a provider that supports this service is connected.');
    expect(TR_MARKET.market_calendar_provider_label.en).toBe('Data provider');
    expect(TR_MARKET.market_calendar_provider_unavailable_badge.en).toBe('Unavailable now');
    expect(TR_MARKET.market_calendar_setup_provider.ar).toBe('إعداد مزود التقويم');
  });
});

describe('dividend calendar provider', () => {
  const dividendQuery = {
    from: '2026-07-01',
    to: '2026-09-30',
    symbols: [{ symbol: 'KO', name: 'Coca-Cola', market: 'US', currency: 'USD' }],
    force: true,
  };

  it('returns not_configured when dividend calendar provider keys are missing', async () => {
    vi.stubEnv('FINNHUB_API_KEY', '');
    vi.stubEnv('FMP_API_KEY', '');

    const result = await getDividendCalendar(dividendQuery);

    expect(result.status).toBe('not_configured');
    expect(result.provider).toBeNull();
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('provider_not_configured');
  });

  it('prefers FMP dividends calendar when FMP_API_KEY is configured', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([
      {
        symbol: 'KO',
        companyName: 'Coca-Cola',
        date: '2026-07-12',
        amount: 0.51,
        currency: 'USD',
        recordDate: '2026-07-13',
        payDate: '2026-08-01',
        declarationDate: '2026-06-20',
      },
    ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getDividendCalendar(dividendQuery);

    expect(result.status).toBe('success');
    expect(result.provider).toBe('fmp');
    expect(result.data[0]).toMatchObject({
      symbol: 'KO',
      companyName: 'Coca-Cola',
      market: 'US',
      currency: 'USD',
      dividendAmount: 0.51,
      exDividendDate: '2026-07-12',
      paymentDate: '2026-08-01',
      provider: 'fmp',
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('financialmodelingprep.com/stable/dividends-calendar');
  });

  it('falls back to FMP direct dividends calendar when Finnhub is not configured', async () => {
    vi.stubEnv('FINNHUB_API_KEY', '');
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([
      {
        symbol: 'AAPL',
        companyName: 'Apple',
        date: '2026-07-15',
        dividend: 0.27,
        currency: 'USD',
        paymentDate: '2026-08-14',
      },
    ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getDividendCalendar({ from: '2026-07-01', to: '2026-09-30', force: true });

    expect(result.status).toBe('success');
    expect(result.provider).toBe('fmp');
    expect(result.data[0]).toMatchObject({
      symbol: 'AAPL',
      companyName: 'Apple',
      dividendAmount: 0.27,
      exDividendDate: '2026-07-15',
      provider: 'fmp',
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('financialmodelingprep.com/stable/dividends-calendar');
  });

  it('reports dividend provider access failures without returning fabricated events', async () => {
    vi.stubEnv('FINNHUB_API_KEY', '');
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'Forbidden',
    }), { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getDividendCalendar(dividendQuery);

    expect(result.status).toBe('forbidden');
    expect(result.provider).toBe('fmp');
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('provider_access_denied');
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
