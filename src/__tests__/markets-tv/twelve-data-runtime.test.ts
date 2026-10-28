import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const shared = vi.hoisted(() => ({ read: vi.fn(), publish: vi.fn() }));
vi.mock('@/lib/server/market-provider-cooldown', () => ({ readTwelveDataCooldown: shared.read, publishTwelveDataCooldown: shared.publish }));
const now = Date.parse('2026-10-28T05:15:30Z');
const url = (symbol: string, mic = 'XKUW') => `https://api.twelvedata.com/quote?symbol=${symbol}&mic_code=${mic}&apikey=test-only`;
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now); shared.read.mockReset().mockResolvedValue(null); shared.publish.mockReset().mockResolvedValue(undefined); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('shared Twelve Data quota protection', () => {
  it('coalesces identical consumers and lets one cancel without aborting the other', async () => {
    let release!: (value: Response) => void;
    const fetch = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { release = resolve; })); vi.stubGlobal('fetch', fetch);
    const { twelveDataFetch } = await import('@/lib/server/twelve-data-fetch');
    const a = new AbortController(), b = new AbortController();
    const first = twelveDataFetch(url('NBK'), { signal: a.signal });
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    const second = twelveDataFetch(url('NBK'), { signal: b.signal });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    a.abort(); await rejected;
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);
    release(Response.json({ symbol: 'NBK', close: '1.01' }));
    expect(await (await second).json()).toMatchObject({ symbol: 'NBK', close: '1.01' });
  });
  it('stops every quote path after a JSON 429 and honors the source Retry-After', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ code: 429, status: 'error', message: 'quota exhausted' }, { headers: { 'retry-after': '120' } }))
      .mockResolvedValueOnce(Response.json({ symbol: 'KFH', close: 1 })); vi.stubGlobal('fetch', fetch);
    const { twelveDataFetch, TWELVE_RETRY_HEADER } = await import('@/lib/server/twelve-data-fetch');
    const first = await twelveDataFetch(url('NBK'));
    const retry = new Date(now + 120_000).toISOString();
    expect(first.headers.get(TWELVE_RETRY_HEADER)).toBe(retry);
    const next = await twelveDataFetch('https://api.twelvedata.com/quote?symbol=EUR/USD&apikey=test-only');
    expect(next.status).toBe(429); expect(next.headers.get(TWELVE_RETRY_HEADER)).toBe(retry);
    expect(fetch).toHaveBeenCalledTimes(1); expect(shared.publish).toHaveBeenCalledWith(now + 120_000, 'test-only');
    vi.setSystemTime(now + 120_001);
    expect((await twelveDataFetch(url('KFH'))).status).toBe(200); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('distinguishes explicit daily exhaustion, minute reset and an unknown quota', async () => {
    const { twelveDataRetry } = await import('@/lib/server/twelve-data-fetch');
    expect(twelveDataRetry(new Response(), 'daily API credit limit reached', now).until).toBe(Date.parse('2026-10-29T00:00:01Z'));
    expect(twelveDataRetry(new Response(), 'limit per minute reached', now).until).toBe(Date.parse('2026-10-28T05:16:01Z'));
    expect(twelveDataRetry(new Response(), 'rate limited', now).until).toBe(now + 90_000);
    expect(twelveDataRetry(new Response(null, { headers: { 'retry-after': 'Wed, 28 Oct 2026 06:00:00 GMT' } }), '', now).until).toBe(Date.parse('2026-10-28T06:00:00Z'));
  });
  it('bounds concurrent fanout and cancels queued provider work after the first failure', async () => {
    const release: Array<(response: Response) => void> = [];
    const fetch = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { release.push(resolve); })); vi.stubGlobal('fetch', fetch);
    const { twelveDataFetch } = await import('@/lib/server/twelve-data-fetch');
    const work = Promise.all(Array.from({ length: 10 }, (_, i) => twelveDataFetch(url(`TEST${i}`))));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    for (const resolve of release) resolve(Response.json({ code: 429, status: 'error' }, { status: 429 }));
    const results = await work;
    expect(results.every(response => response.status === 429)).toBe(true); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('reads an existing cross-instance block without making another upstream request', async () => {
    shared.read.mockResolvedValue(now + 600_000);
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const { twelveDataFetch } = await import('@/lib/server/twelve-data-fetch');
    expect((await twelveDataFetch(url('NBK'))).status).toBe(429); expect(fetch).not.toHaveBeenCalled();
  });
  it('uses reported zero remaining credits without assuming a subscription capacity', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ symbol: 'NBK', close: 1 }, { headers: { 'api-credits-left': '0' } })); vi.stubGlobal('fetch', fetch);
    const { twelveDataFetch } = await import('@/lib/server/twelve-data-fetch');
    expect((await twelveDataFetch(url('NBK'))).status).toBe(200);
    expect((await twelveDataFetch(url('KFH'))).status).toBe(429); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('scopes a denied exchange without blocking a separately authorized market', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 403 })).mockResolvedValueOnce(Response.json({ symbol: 'DIB', close: 1 })); vi.stubGlobal('fetch', fetch);
    const { twelveDataFetch } = await import('@/lib/server/twelve-data-fetch');
    expect((await twelveDataFetch(url('NBK'))).status).toBe(403);
    expect((await twelveDataFetch(url('KFH'))).status).toBe(403);
    expect((await twelveDataFetch(url('DIB', 'XDFM'))).status).toBe(200); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('keeps independent credentials separate and waits for cooldown persistence', async () => {
    let persisted!: () => void;
    shared.publish.mockImplementation(() => new Promise<void>(resolve => { persisted = resolve; }));
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ code: 429, status: 'error' }, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ symbol: 'NBK', close: 1 })); vi.stubGlobal('fetch', fetch);
    const { twelveDataFetch } = await import('@/lib/server/twelve-data-fetch');
    let complete = false;
    const blocked = twelveDataFetch(url('NBK')).then(response => { complete = true; return response; });
    await vi.waitFor(() => expect(shared.publish).toHaveBeenCalledTimes(1));
    expect(complete).toBe(false);
    expect((await twelveDataFetch(url('NBK').replace('test-only', 'independent-account'))).status).toBe(200);
    persisted(); expect((await blocked).status).toBe(429); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('protects legacy quote, batch and candles behind the same cooldown, including nested batch errors', async () => {
    vi.stubEnv('TWELVE_DATA_API_KEY', 'test-only');
    const fetch = vi.fn().mockImplementation(async () => Response.json({ NBK: { code: 429, status: 'error', message: 'limit per minute' } })); vi.stubGlobal('fetch', fetch);
    const { twelveDataFetch } = await import('@/lib/server/twelve-data-fetch');
    await twelveDataFetch(url('NBK,KFH'));
    const legacy = await import('@/lib/market/providers/twelveData');
    expect(await legacy.fetchTwelveDataQuote('AAPL')).toBeNull();
    expect((await legacy.fetchTwelveDataBatch(['MSFT', 'AMZN'])).size).toBe(0);
    expect(await legacy.fetchTwelveDataTimeSeries('AAPL')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
