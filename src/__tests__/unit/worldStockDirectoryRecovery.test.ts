import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderDirectory, ProviderListing } from '@/lib/world-stocks/providerDirectory';

const io = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), after: vi.fn() }));
vi.mock('@/lib/server/worldStockDirectoryStore', () => ({ readStoredProviderDirectory: io.read, saveStoredProviderDirectory: io.save }));
vi.mock('next/server', () => ({ after: io.after }));

const now = Date.parse('2026-11-20T10:00:00Z');
const listing: ProviderListing = { symbol: 'SAVED', providerSymbol: 'SAVED', name: 'Verified European company', exchange: 'TD_XPAR',
  exchangeName: 'Paris', mic: 'XPAR', currency: 'EUR', country: 'FR', assetType: 'stock', source: 'https://api.twelvedata.com/stocks?type=Common%20Stock' };
const retained = (asOf: string): ProviderDirectory => ({ rows: [listing], status: 'snapshot', asOf });
const response = (symbol = 'NEW') => new Response(JSON.stringify({ status: 'ok', data: [
  { symbol, name: 'Fresh European company', exchange: 'Paris', mic_code: 'XPAR', currency: 'EUR', country: 'France', type: 'Common Stock' },
] }), { status: 200 });

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  io.read.mockResolvedValue(null); io.save.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('world directory recovery across cold starts', () => {
  it('hydrates the last complete directory without downloading it again within its daily lifetime', async () => {
    io.read.mockResolvedValue(retained('2026-11-20T09:00:00Z'));
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const { getProviderDirectory, providerDirectoryRevision, peekProviderDirectory } = await import('@/lib/world-stocks/providerDirectory');
    const result = await getProviderDirectory();
    expect(result).toMatchObject({ status: 'snapshot', asOf: '2026-11-20T09:00:00Z', rows: [listing] });
    expect(peekProviderDirectory()).toBe(result);
    expect(providerDirectoryRevision()).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(io.save).not.toHaveBeenCalled();
  });

  it('returns stale complete rows immediately while a slow refresh remains alive and updates the revision', async () => {
    io.read.mockResolvedValue(retained('2026-11-18T09:00:00Z'));
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
    const { getProviderDirectory, providerDirectoryRevision, peekProviderDirectory } = await import('@/lib/world-stocks/providerDirectory');
    const first = await getProviderDirectory();
    expect(first).toMatchObject({ status: 'snapshot', asOf: '2026-11-18T09:00:00Z', rows: [listing] });
    const version = providerDirectoryRevision();
    expect(io.after).toHaveBeenCalledTimes(2);
    finish(response());
    await Promise.all(io.after.mock.calls.map(([work]) => work()));
    expect(peekProviderDirectory()).toMatchObject({ status: 'directory', asOf: '2026-11-20T10:00:00.000Z', rows: [expect.objectContaining({ symbol: 'NEW', exchange: 'TD_XPAR' })] });
    expect(providerDirectoryRevision()).toBeGreaterThan(version);
    expect(io.save).toHaveBeenCalledTimes(1);
  });

  it.each([
    () => new Response('upstream failure', { status: 503 }),
    () => new Response(JSON.stringify({ status: 'ok', data: [] })),
    () => new Response('invalid json'),
  ])('keeps the durable last success when refresh fails or returns an empty directory', async failedResponse => {
    const stored = retained('2026-11-18T09:00:00Z');
    io.read.mockResolvedValue(stored);
    const fetch = vi.fn(async () => failedResponse()); vi.stubGlobal('fetch', fetch);
    const { getProviderDirectory, peekProviderDirectory } = await import('@/lib/world-stocks/providerDirectory');
    await getProviderDirectory();
    await Promise.all(io.after.mock.calls.map(([work]) => work()));
    expect(peekProviderDirectory()).toEqual(stored);
    expect(await getProviderDirectory()).toEqual(stored);
    expect(io.save).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shares hydration and a cold provider fetch, then persists only the complete successful result', async () => {
    const fetch = vi.fn(async () => response()); vi.stubGlobal('fetch', fetch);
    const { getProviderDirectory, providerDirectoryRevision } = await import('@/lib/world-stocks/providerDirectory');
    const [first, second] = await Promise.all([getProviderDirectory(), getProviderDirectory()]);
    expect(first).toEqual(second);
    expect(first.rows).toHaveLength(1);
    expect(io.read).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(io.save).toHaveBeenCalledWith(first);
    expect(providerDirectoryRevision()).toBe(1);
  });

  it('keeps a slow cold hydration alive before the response budget can expire', async () => {
    let finish!: (directory: ProviderDirectory) => void;
    io.read.mockImplementationOnce(() => new Promise<ProviderDirectory>(resolve => { finish = resolve; }));
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const { getProviderDirectory, peekProviderDirectory } = await import('@/lib/world-stocks/providerDirectory');
    const work = getProviderDirectory();
    expect(io.after).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(peekProviderDirectory()).toBeNull();
    finish(retained('2026-11-20T09:00:00Z'));
    await io.after.mock.calls[0][0]();
    expect(await work).toMatchObject({ rows: [listing], status: 'snapshot' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns unavailable for a failed first load without inventing or persisting entries', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('error', { status: 503 })));
    const { getProviderDirectory, peekProviderDirectory } = await import('@/lib/world-stocks/providerDirectory');
    expect(await getProviderDirectory()).toEqual({ rows: [], status: 'unavailable', asOf: null });
    expect(peekProviderDirectory()).toBeNull();
    expect(io.save).not.toHaveBeenCalled();
  });
});
