import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const directory = vi.hoisted(() => vi.fn());
vi.mock('@/lib/world-stocks/providerDirectory', () => ({ getProviderDirectory: directory }));
import { providerStockQuote } from '@/lib/world-stocks/providerQuote';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); vi.clearAllMocks(); });
describe('TV exchange-scoped quote loading', () => {
  it('does not reload the global directory or block another exchange after a market entitlement error', async () => {
    vi.stubEnv('TWELVE_DATA_API_KEY', 'synthetic-test-key');
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ code: 403, status: 'error' }), { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ symbol: 'TEST', mic_code: 'XTWO', currency: 'EUR', close: '12.5', percent_change: '1.25', timestamp: Math.floor(Date.now() / 1000) })));
    vi.stubGlobal('fetch', fetcher);
    const one = await providerStockQuote('TD_XONE', 'TEST', { providerSymbol: 'TEST', mic: 'XONE', currency: 'USD' });
    const two = await providerStockQuote('TD_XTWO', 'TEST', { providerSymbol: 'TEST', mic: 'XTWO', currency: 'EUR' });
    expect(one.price).toBeNull(); expect(two.price).toBe(12.5); expect(two.currency).toBe('EUR');
    expect(directory).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(2);
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('mic_code')).toBe('XTWO');
  });
  it('keeps the last verified quote with its original source time on a refresh failure', async () => {
    vi.useFakeTimers(); vi.stubEnv('TWELVE_DATA_API_KEY', 'synthetic-test-key');
    const timestamp = Math.floor(Date.now() / 1000);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ symbol: 'KEEP', mic_code: 'XKEP', currency: 'KWD', close: '1.125', timestamp }))).mockRejectedValueOnce(new Error('offline')));
    const first = await providerStockQuote('TD_XKEP','KEEP',{ providerSymbol: 'KEEP', mic: 'XKEP', currency: 'KWD' });
    vi.setSystemTime(Date.now() + 16000);
    const second = await providerStockQuote('TD_XKEP','KEEP',{ providerSymbol: 'KEEP', mic: 'XKEP', currency: 'KWD' });
    expect(second.price).toBe(first.price); expect(second.quoteTimestamp).toBe(new Date(timestamp * 1000).toISOString());
  });
});
