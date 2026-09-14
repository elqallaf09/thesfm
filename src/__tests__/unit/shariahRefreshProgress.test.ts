import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runShariahRefresh, type RefreshProgress } from '@/lib/market/runShariahRefresh';
import { shariahRefreshHttpStatus, shariahRefreshOutcome } from '@/lib/market/shariahRefreshOutcome';
const partial = { ok: false, scanned: 9, updated: 8, failed: [{ symbol: 'TSLA', reason: 'official_provider_fetch_failed' }], hasMore: true };
describe('reported production 8/9 source failure', () => {
  it('is partial rather than a total failure and retains ok:false', () => {
    expect(shariahRefreshOutcome(partial)).toBe('partial');
    expect(shariahRefreshHttpStatus(partial)).toBe(200);
    expect(partial.ok).toBe(false);
  });
  it('does not hide a persistence or run-ledger failure behind partial success', () => {
    expect(shariahRefreshHttpStatus({ ...partial, fatal: true })).toBe(500);
    expect(shariahRefreshOutcome({ ...partial, fatal: true })).toBe('failed');
    expect(shariahRefreshHttpStatus({ ...partial, updated: 0 })).toBe(500);
  });
});
const success = (runId: string, patch = {}) => ({ runId, ok: true, scanned: 3, updated: 3, failed: [], hasMore: false, ...patch });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
function setup(fetcher: ReturnType<typeof vi.fn>, reload = vi.fn().mockResolvedValue(true)) {
  const progress: RefreshProgress[] = [];
  const controller = new AbortController();
  return { progress, controller, reload, options: { signal: controller.signal, fetcher: fetcher as typeof fetch,
    reload, onProgress: (value: RefreshProgress) => progress.push(value) } };
}
describe('serial interactive refresh with truthful progress', () => {
  it('continues past one failed stock and counts each saved batch exactly once', async () => {
    const times: number[] = [];
    const fetcher = vi.fn()
      .mockImplementationOnce(async () => { times.push(Date.now()); return response(success('r1', { ok: false, updated: 2, hasMore: true, failed: partial.failed })); })
      .mockImplementationOnce(async () => { times.push(Date.now()); return response(success('r2')); });
    const s = setup(fetcher); const promise = runShariahRefresh(s.options);
    await vi.runAllTimersAsync(); const result = await promise;
    expect(result).toMatchObject({ updated: 5, scanned: 6, batches: 2, stopped: false, failed: partial.failed });
    expect(s.reload).toHaveBeenCalledTimes(2);
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(5500);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ limit: 3 });
  });
  it('separates a failed table reload from successful saved classifications', async () => {
    const s = setup(vi.fn().mockResolvedValue(response(success('r1'))), vi.fn().mockRejectedValue(new Error('GET 500')));
    const promise = runShariahRefresh(s.options); await vi.runAllTimersAsync();
    expect(await promise).toMatchObject({ updated: 3, viewUnavailable: true, stopped: false });
    expect(s.progress[0]).toMatchObject({ updated: 3 });
  });
  it('keeps completed progress when the next HTTP response is lost; does not replay writes', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(success('r1', { hasMore: true }))).mockRejectedValueOnce(new Error('network'));
    const s = setup(fetcher); const promise = runShariahRefresh(s.options);
    const assertion = expect(promise).rejects.toThrow('network'); await vi.runAllTimersAsync(); await assertion;
    expect(s.progress.at(-1)?.updated).toBe(3); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('never declares authentication denial or rate limiting a successful scan', async () => {
    for (const status of [401, 403, 429]) {
      const s = setup(vi.fn().mockResolvedValue(response({ code: 'denied' }, status)));
      const promise = runShariahRefresh(s.options);
      const assertion = expect(promise).rejects.toMatchObject({ code: status === 429 ? 'RATE_LIMITED' : 'AUTH_REQUIRED' });
      await vi.runAllTimersAsync(); await assertion; expect(s.progress).toHaveLength(0);
    }
  });
  it('rejects malformed counters instead of displaying invented totals', async () => {
    const s = setup(vi.fn().mockResolvedValue(response(success('r1', { updated: 100 }))));
    const assertion = expect(runShariahRefresh(s.options)).rejects.toMatchObject({ code: 'REFRESH_RESPONSE_UNAVAILABLE' });
    await vi.runAllTimersAsync(); await assertion;
  });
  it('retries only the chosen failed symbol once, without forcing the whole catalog', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(success('r1', { hasMore: true, scanned: 1, updated: 1 })));
    const s = setup(fetcher); const promise = runShariahRefresh({ ...s.options, symbolId: 'selected-id' });
    await vi.runAllTimersAsync(); expect(await promise).toMatchObject({ updated: 1, batches: 1 });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ limit: 1, symbolId: 'selected-id', force: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('stops after a requested batch, not midway through confirmed saves', async () => {
    let stop = false;
    const s = setup(vi.fn().mockResolvedValue(response(success('r1', { hasMore: true }))), vi.fn(async () => { stop = true; return true; }));
    const promise = runShariahRefresh({ ...s.options, shouldStop: () => stop });
    await vi.runAllTimersAsync(); expect(await promise).toMatchObject({ updated: 3, batches: 1, stopped: true });
  });
  it('does not loop when the queue has no claimable rows', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(success('r1', { scanned: 0, updated: 0, hasMore: true })));
    const s = setup(fetcher); const promise = runShariahRefresh(s.options);
    await vi.runAllTimersAsync(); expect(await promise).toMatchObject({ updated: 0, batches: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('aborts before sending requests after the page is unmounted', async () => {
    const fetcher = vi.fn(); const s = setup(fetcher); s.controller.abort();
    await expect(runShariahRefresh(s.options)).rejects.toBeDefined(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('reports saved rows but stops continuation if persistence failed', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(success('r1', { ok: false, updated: 2, fatal: true, hasMore: true, failed: [{ symbol: 'X', reason: 'refresh_persistence_failed' }] }), 500));
    const s = setup(fetcher); const assertion = expect(runShariahRefresh(s.options)).rejects.toMatchObject({ code: 'REFRESH_STORAGE_FAILED' });
    await vi.runAllTimersAsync(); await assertion; expect(s.progress.at(-1)?.updated).toBe(2); expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
