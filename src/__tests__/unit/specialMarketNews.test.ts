import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { IPO_TOPIC_IDS } from '@/lib/market-news/ipoRegions';
import { TOPICS } from '@/lib/market-news/specialTopics';
import { cleanTopic, matchesTopic } from '@/lib/market-news/specialMatching';
import { underDollarQuotes } from '@/lib/market-news/underDollarTicker.server';
import { verifiedUnderOne } from '@/lib/market-news/specialQuotes';
import { companyHint, explicitUsSymbols, matchedUsEquity } from '@/lib/market-news/specialSymbols';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';

const mocked = vi.hoisted(() => ({ aggregate: vi.fn(), quotes: vi.fn(), translate: vi.fn() }));
vi.mock('@/lib/market-news/engine', () => ({ aggregateFinancialNews: mocked.aggregate }));
vi.mock('@/lib/market-news/specialProviders', () => ({ createSpecialNewsProviders: () => [] }));
vi.mock('@/lib/market-news/specialQuotes', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/market-news/specialQuotes')>(),
  fetchSpecialQuotes: mocked.quotes,
}));
vi.mock('@/lib/translation/translateNewsText', () => ({
  normalizeNewsLanguage: (value: string) => value || 'ar',
  isNewsTranslationEnabled: () => true,
  translateNewsItems: mocked.translate,
}));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
import { GET } from '@/app/api/market/special-news/route';

function story(title: string, extra: Partial<ConsolidatedNewsStory> = {}) {
  return {
    id: 'article-1', title, summary: '', companyNames: [], sectors: [], industries: [],
    symbols: [], eventType: 'unknown', publishedAt: new Date().toISOString(),
    sourceName: 'Reuters', originalLanguage: 'en', originalUrl: 'https://www.reuters.com/markets/example',
    ...extra,
  } as ConsolidatedNewsStory;
}
function request(params: string) { return new NextRequest(`https://www.the-sfm.com/api/market/special-news?${params}`); }

beforeEach(() => { vi.clearAllMocks(); mocked.quotes.mockResolvedValue(new Map()); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('special news data and independent quotes', () => {
  it('resolves only explicit symbols or an unambiguous exact US equity company name', () => {
    expect(explicitUsSymbols('Example (NASDAQ: EXMP) receives a bid-price notice')).toEqual(['EXMP']);
    expect(explicitUsSymbols('The CEO discussed FDA and EPS updates')).toEqual([]);
    expect(companyHint('Example Global Limited Announces Receipt of Nasdaq Notification')).toBe('Example Global Limited');
    expect(companyHint('Best Penny Stocks to Buy')).toBeNull();
    const quote = { symbol: 'EXMP', longname: 'Example Global Limited', quoteType: 'EQUITY', exchange: 'NCM' };
    expect(matchedUsEquity('Example Global Limited', [quote])).toBe('EXMP');
    expect(matchedUsEquity('Another Company', [quote])).toBeNull();
    expect(matchedUsEquity('Example Global Limited', [{ ...quote, exchange: 'TOR' }])).toBeNull();
    expect(matchedUsEquity('Example Global Limited', [{ ...quote, quoteType: 'ETF' }])).toBeNull();
    expect(matchedUsEquity('Example Global Limited', [quote, { ...quote, symbol: 'EXMPB' }])).toBeNull();
  });
  it('returns relevant articles before quote or translation providers finish', async () => {
    mocked.aggregate.mockResolvedValue({
      stories: [story('Apple quarterly earnings exceed expectations', { symbols: ['AAPL'], imageUrl: 'https://images.example.com/earnings.jpg' })],
      liveUpdatesAvailable: true, lastSuccessfulUpdate: '2026-09-18T12:00:00.000Z',
    });
    const response = await GET(request('topic=earnings-news&lang=ar'));
    const payload = await response.json();
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({ title: 'Apple quarterly earnings exceed expectations', source: 'Reuters', imageUrl: 'https://images.example.com/earnings.jpg' });
    expect(payload.tickerItems[0].symbol).toBe('AAPL');
    expect(payload.updatedAt).toBe('2026-09-18T12:00:00.000Z');
    expect(mocked.quotes).not.toHaveBeenCalled();
    expect(mocked.translate).not.toHaveBeenCalled();
  });

  it('loads a sector ticker even when news providers are unavailable', async () => {
    mocked.aggregate.mockRejectedValue(new Error('news offline'));
    const response = await GET(request('topic=healthcare-stocks&part=ticker'));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.tickerItems.map((item: { symbol: string }) => item.symbol)).toContain('LLY');
    expect(mocked.aggregate).not.toHaveBeenCalled();
  });

  it('filters sports and lifestyle stories out of the metals API even with GOLD metadata', async () => {
    mocked.aggregate.mockResolvedValue({
      stories: [
        story('Sabres announce rosters for Blue and Gold Scrimmage', { symbols: ['GOLD'], companyNames: ['Gold'] }),
        story('Forever Young wins Jockey Club Gold Cup', { symbols: ['GOLD'] }),
        story('Silver futures gain as industrial demand grows', { id: 'silver' }),
        story('Gold miners increase production', { id: 'gold' }),
      ], liveUpdatesAvailable: true,
    });
    const payload = await (await GET(request('topic=metals-news&lang=ar'))).json();
    expect(payload.items.map((item: { id: string }) => item.id)).toEqual(['silver', 'gold']);
  });

  it('screens verified USD common shares independently of the news feed', async () => {
    const seconds = Math.floor(Date.now() / 1000);
    const row = { s: 'NASDAQ:EXMP', d: ['EXMP', 'Example', 'NASDAQ', 'stock', 'USD', 0.75, 1.2, seconds, ['common']] };
    const changed = (index: number, value: unknown) => ({ ...row, d: row.d.map((v, i) => i === index ? value : v) });
    const invalid = [changed(3, 'fund'), changed(4, 'CAD'), changed(5, 1), changed(5, 0),
      changed(7, seconds - 5 * 86400), changed(7, seconds + 3600), changed(8, ['warrant']), { ...row, s: 'NYSE:EXMP' }];
    expect(underDollarQuotes({ data: invalid })).toEqual([]);
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [row, row] }));
    const payload = await (await GET(request('topic=stocks-under-1&part=ticker'))).json();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocked.aggregate).not.toHaveBeenCalled();
    expect(payload.tickerItems).toHaveLength(1);
    expect(payload.tickerItems[0]).toMatchObject({ symbol: 'EXMP', price: 0.75, source: 'TradingView', asOf: new Date(seconds * 1000).toISOString() });
  });

  it('does not label a hardcoded watchlist as current IPO or merger news', async () => {
    for (const topic of ['new-stocks', 'mergers-acquisitions-news', 'unusual-moves-news']) {
      const payload = await (await GET(request(`topic=${topic}&part=ticker`))).json();
      expect(payload.tickerItems).toEqual([]);
    }
  });

  it('does not turn investors mentioned in IPO articles into newly listed stocks', async () => {
    mocked.aggregate.mockResolvedValue({
      stories: [story('Example Labs files for an IPO with backing from Nvidia and Microsoft', {
        symbols: ['NVDA', 'MSFT'], companyNames: ['Nvidia', 'Microsoft'],
      })], liveUpdatesAvailable: true,
    });
    const news = await (await GET(request('topic=new-stocks'))).json();
    expect(news.items).toHaveLength(1);
    expect(news.tickerItems).toEqual([]);
    const ticker = await (await GET(request('topic=new-stocks&part=ticker&symbols=NVDA,MSFT,AAPL'))).json();
    expect(ticker.tickerItems).toEqual([]);
    expect(mocked.quotes).not.toHaveBeenCalled();
  });

  it('requires IPO evidence in the headline rather than summary mentions or classifier labels', () => {
    expect(matchesTopic('new-stocks', story('Microsoft reports quarterly results', {
      summary: 'Its investment in Example Labs could benefit from an IPO.', eventType: 'ipo_listing',
    }))).toBe(false);
    expect(matchesTopic('new-stocks', story('Example Labs announces its initial public offering'))).toBe(true);
    expect(matchesTopic('new-stocks', story('بدء اكتتاب شركة جديدة في السوق الأمريكية'))).toBe(true);
    expect(matchesTopic('new-stocks', story('Example Labs begins trading on Nasdaq'))).toBe(true);
    expect(matchesTopic('new-stocks', story('Example Labs plans a direct listing'))).toBe(true);
  });

  it('excludes retrospective IPO returns stories about established stocks', () => {
    expect(matchesTopic('new-stocks', story('Nvidia returns since its IPO'))).toBe(false);
    expect(matchesTopic('new-stocks', story('If you invested $1,000 in Apple at its IPO'))).toBe(false);
    expect(matchesTopic('new-stocks', story('عوائد سهم أبل منذ اكتتاب الشركة'))).toBe(false);
  });

  it('uses original publication dates and returns only recent IPO news newest first', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T12:00:00Z'));
    mocked.aggregate.mockResolvedValue({
      liveUpdatesAvailable: false, storedFallbackUsed: true,
      stories: [
        story('Older IPO announcement', { id: 'older', publishedAt: '2026-09-18T10:00:00Z' }),
        story('Stale IPO announcement', { id: 'stale', publishedAt: '2026-08-01T10:00:00Z', latestUpdatedAt: '2026-09-19T11:00:00Z' }),
        story('Newest IPO announcement', { id: 'newest', publishedAt: '2026-09-19T10:00:00Z' }),
        story('Undated IPO announcement', { id: 'undated', publishedAt: 'invalid' }),
        story('Future IPO announcement', { id: 'future', publishedAt: '2026-09-20T10:00:00Z' }),
        story('Recycled IPO announcement', { id: 'recycled', publishedAt: '2026-09-19T10:00:00Z', earliestPublishedAt: '2026-01-01T10:00:00Z' }),
      ],
    });
    const payload = await (await GET(request('topic=new-stocks'))).json();
    expect(payload.items.map((item: { id: string }) => item.id)).toEqual(['newest', 'older']);
    mocked.translate.mockImplementation(async items => items);
    const translated = await (await GET(request('topic=new-stocks&part=translation'))).json();
    expect(translated.items.map((item: { id: string }) => item.id)).toEqual(['newest', 'older']);
    vi.useRealTimers();
  });

  it('uses explicit OR alternatives and accepts Arabic topic evidence', () => {
    for (const topic of Object.values(TOPICS)) expect(topic.query).toContain(' OR ');
    expect(matchesTopic('earnings-news', story('ارتفاع أرباح شركة أبل'))).toBe(true);
    expect(matchesTopic('unusual-moves-news', story('Nvidia shares surges after results'))).toBe(true);
    expect(matchesTopic('mergers-acquisitions-news', story('Retailer launches a discount offer'))).toBe(false);
    expect(matchesTopic('metals-news', story('Oil price jumps', { eventType: 'commodity_price_event' }))).toBe(false);
    expect(cleanTopic('__proto__')).toBeNull();
  });

  it('accepts multilingual regional IPO headlines and rejects retrospective or unrelated ones', () => {
    expect(matchesTopic('ipo-gulf-news', story('بدء الاكتتاب في أسهم شركة جديدة في بورصة الكويت'))).toBe(true);
    expect(matchesTopic('ipo-uk-news', story('Example plc confirms intention to float on the London Stock Exchange'))).toBe(true);
    expect(matchesTopic('ipo-europe-news', story('Example SE plant Börsengang in Frankfurt'))).toBe(true);
    expect(matchesTopic('ipo-europe-news', story('Example annonce son introduction en Bourse sur Euronext Paris'))).toBe(true);
    expect(matchesTopic('ipo-asia-news', story('Example Ltd shares jump in Hong Kong trading debut'))).toBe(true);
    expect(matchesTopic('ipo-arab-news', story('البورصة المصرية توافق على قيد وطرح شركة جديدة', { title: 'طرح عام أولي لشركة جديدة في البورصة المصرية' }))).toBe(true);
    expect(matchesTopic('ipo-us-news', story('Apple returns since its IPO'))).toBe(false);
    expect(matchesTopic('ipo-gulf-news', story('Oil prices rise in Gulf trading'))).toBe(false);
  });

  it.each([
    ['Kuwaiti company prices its Nasdaq IPO', 'Demand from investors in Kuwait', 'Gulf News', 'ipo-us-news'],
    ['US company launches IPO on Boursa Kuwait', 'Banks in Cairo advise on the deal', 'Reuters', 'ipo-gulf-news'],
    ['بدء طرح عام في بورصة الكويت', 'بمشاركة مستثمرين من مصر', 'القاهرة', 'ipo-gulf-news'],
    ['بدء اكتتاب في بورصة عمان', '', 'وكالة عمان', 'ipo-arab-news'],
    ['طرح عام أولي في سلطنة عمان', '', 'الصحافة الأردنية', 'ipo-gulf-news'],
    ['اكتتاب في عمان', '', 'Reuters', null],
    ['Gulf investors back IPO', 'The company will list on the London Stock Exchange', 'Reuters', 'ipo-uk-news'],
    ['IPO on Nasdaq Nordic', '', 'Wall Street Journal', 'ipo-europe-news'],
    ['Asian company sets IPO price on Nasdaq Dubai', '', 'Reuters', 'ipo-gulf-news'],
    ['British startup seeks IPO', '', 'London', null],
    ['الأسهم الأوروبية تتراجع وسط ترقب اكتتاب شركة أمريكية', '', 'Reuters', null],
    ['إدراج شركات على قائمة العقوبات البريطانية', '', 'Reuters', null],
    ['بورصة الكويت تعلن إدراج أول صكوك', '', 'Reuters', null],
    ['إلغاء إدراج أسهم شركة في سوق أبوظبي', '', 'Reuters', null],
    ['قرار بشأن اكتتاب مصر في رأسمال هيئة التنمية الدولية', '', 'Reuters', null],
    ['سوق أبوظبي يعتزم إدراج صندوق للأسهم الأميركية', '', 'Reuters', null],
    ['Company prices IPO on Nasdaq', '', 'Nasdaq', 'ipo-us-news'],
    ['IPO planned', 'Kuwait Times', 'Kuwait Times', null],
    ['Issuer hires agency for UK public affairs ahead of London IPO', '', 'Trade press', null],
    ['طرح عام أولي عبر زيادة رأس المال في بورصة الدار البيضاء', '', 'Reuters', 'ipo-arab-news'],
    ['اكتتاب لزيادة رأس المال في بورصة الكويت', '', 'Reuters', null],
    ['US IPO attracts demand', '', 'Reuters', 'ipo-us-news'],
    ['IPO on HKEX', '', 'Gulf News', 'ipo-asia-news'],
    ['Introduction en Bourse à Casablanca', '', 'Paris', 'ipo-arab-news'],
    ['Company sets IPO price - Gulf News', 'Company sets IPO price  Gulf News', 'Gulf News', null],
    ['Company sets IPO price', 'Investors await details', 'Kuwait Times', null],
    ['إدراج الكويت على القائمة الرمادية', '', 'القبس', null],
    ['بورصة البحرين تعلن إدراج أذون خزانة حكومية', '', 'بورصة البحرين', null],
    ['اكتتاب الكويت في زيادة رأس مال صندوق النقد العربي', '', 'القبس', null],
    ['إدراج أسهم الشركة في بورصة مسقط', '', 'Reuters', 'ipo-gulf-news'],
    ['شركة تطرح أسهمها للاكتتاب في البورصة المصرية', '', 'Reuters', 'ipo-arab-news'],
  ] as const)('isolates the listing for %s', (title, summary, sourceName, expected) => {
    const item = story(title, { summary, sourceName });
    expect(IPO_TOPIC_IDS.filter(topic => matchesTopic(topic, item))).toEqual(expected ? [expected] : []);
  });

  it('serves regional IPO news newest first without deriving a price strip from mentioned companies', async () => {
    mocked.aggregate.mockResolvedValue({
      liveUpdatesAvailable: true,
      stories: [
        story('Older Gulf IPO priced', { id: 'older', publishedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(), symbols: ['AAPL'], companyNames: ['Apple'] }),
        story('Newest Gulf IPO opens for subscription - Reuters', { summary: 'Newest Gulf IPO opens for subscription &nbsp;&nbsp; Reuters', id: 'newest', publishedAt: new Date(Date.now() - 3_600_000).toISOString() }),
        story('Saudi bank reports quarterly profit', { id: 'unrelated' }),
      ],
    });
    const payload = await (await GET(request('topic=ipo-gulf-news&lang=ar'))).json();
    expect(payload.items.map((item: { id: string }) => item.id)).toEqual(['newest', 'older']);
    expect(payload.tickerItems).toEqual([]);
    expect(payload.items[0]).toMatchObject({ title: 'Newest Gulf IPO opens for subscription', summary: '', source: 'Reuters' });
    expect(payload.items[1]).toMatchObject({ ticker: null, symbols: [], companyNames: [], price: null });
    expect(mocked.aggregate.mock.calls[0][0]).toMatchObject({ marketCodes: ['GULF'] });
    const ticker = await (await GET(request('topic=ipo-gulf-news&part=ticker&symbols=AAPL'))).json();
    expect(ticker.tickerItems).toEqual([]);
    expect(mocked.quotes).not.toHaveBeenCalled();
  });

  it('requires fresh USD equity evidence for the under-$1 classification', () => {
    const quote = {
      symbol: 'EXAMPLE', price: 0.5, currency: 'USD', assetType: 'EQUITY', available: true,
      asOf: new Date().toISOString(), change: null, changePercent: null,
      source: 'Yahoo Finance' as const, delayed: true as const,
    };
    expect(verifiedUnderOne(quote)).toBe(true);
    expect(verifiedUnderOne({ ...quote, currency: 'CAD' })).toBe(false);
    expect(verifiedUnderOne({ ...quote, assetType: 'CRYPTOCURRENCY' })).toBe(false);
    expect(verifiedUnderOne({ ...quote, asOf: '2020-01-01T00:00:00Z' })).toBe(false);
    expect(verifiedUnderOne({ ...quote, asOf: null })).toBe(false);
    expect(verifiedUnderOne({ ...quote, price: 1 })).toBe(false);
  });

  it('returns an under-$1 story after resolving its named company and verifying its quote', async () => {
    mocked.aggregate.mockResolvedValue({
      stories: [story('Example Global Limited Receives Nasdaq Minimum Bid Price Deficiency Notice')],
      liveUpdatesAvailable: true,
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ quotes: [
      { symbol: 'EXMP', longname: 'Example Global Limited', quoteType: 'EQUITY', exchange: 'NCM' },
    ] }), { status: 200 }));
    mocked.quotes.mockResolvedValue(new Map([['EXMP', {
      symbol: 'EXMP', available: true, currency: 'USD', assetType: 'EQUITY', price: 0.5,
      asOf: new Date().toISOString(), source: 'Yahoo Finance',
    }]]));
    const payload = await (await GET(request('topic=stocks-under-1'))).json();
    expect(mocked.aggregate.mock.calls[0][1]).toMatchObject({ includeLiveProviders: true, forceExternal: false });
    expect(mocked.quotes).toHaveBeenCalledWith(['EXMP']);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({ ticker: 'EXMP', price: 0.5, priceVerified: true });
  });
});
