import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const admin = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: admin }));
const now = Date.parse('2026-10-28T05:15:00Z');
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv('TWELVE_DATA_API_KEY', 'test-only'); admin.mockReset(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('persistent Twelve Data cooldown', () => {
  it('never shortens an existing or concurrently inserted cooldown', async () => {
    type Row = { cache_key: string; payload: unknown; expires_at: string; updated_at: string };
    let stored: Row | null = null;
    const clauses: string[] = [];
    admin.mockReturnValue({ from: (table: string) => {
      expect(table).toBe('trader_cache');
      return {
        upsert: (row: Row, options: { ignoreDuplicates: boolean }) => ({ abortSignal: async () => {
          expect(options.ignoreDuplicates).toBe(true); stored ??= row; return { error: null };
        } }),
        update: (row: Row) => ({ eq: (column: string, key: string) => ({ lt: (expiry: string, until: string) => ({ abortSignal: async () => {
          clauses.push(`${column}:${expiry}`);
          if (stored?.cache_key === key && stored.expires_at < until) stored = row;
          return { error: null };
        } }) }) }),
      };
    } });
    const { publishTwelveDataCooldown } = await import('@/lib/server/market-provider-cooldown');
    await Promise.all([publishTwelveDataCooldown(now + 90_000), publishTwelveDataCooldown(now + 86_400_000)]);
    await publishTwelveDataCooldown(now + 120_000);
    expect(stored).toMatchObject({ cache_key: expect.stringMatching(/^market_provider_cooldown:twelve_data:[a-f0-9]{24}$/), expires_at: new Date(now + 86_400_000).toISOString() });
    expect(clauses).toEqual(Array(3).fill('cache_key:expires_at'));
  });
  it('validates the future shared record and treats database failures as unavailable persistence', async () => {
    const result = { data: { payload: { version: 1, reason: 'provider_rate_limited', until: new Date(now + 60_000).toISOString() }, expires_at: new Date(now + 60_000).toISOString() }, error: null };
    const query = vi.fn().mockResolvedValue(result);
    admin.mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ abortSignal: (signal: AbortSignal) => ({ maybeSingle: () => query(signal) }) }) }) }) });
    const { readTwelveDataCooldown } = await import('@/lib/server/market-provider-cooldown');
    expect(await readTwelveDataCooldown()).toBe(now + 60_000);
    query.mockRejectedValue(new Error('database unavailable'));
    expect(await readTwelveDataCooldown()).toBeNull();
    expect(query.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });
});
