import { afterEach, describe, expect, it } from 'vitest';
import { clearFetchStoreRegistry, createFetchStore, getOrCreateFetchStore } from '@/lib/market-state/sharedFetchStore';

afterEach(() => {
  clearFetchStoreRegistry();
});

describe('createFetchStore', () => {
  it('dedupes concurrent fetch() calls into a single underlying request', async () => {
    let calls = 0;
    const store = createFetchStore(async () => {
      calls += 1;
      await new Promise(resolve => setTimeout(resolve, 5));
      return 'value';
    });

    await Promise.all([store.fetch({ force: true }), store.fetch(), store.fetch()]);
    expect(calls).toBe(1);
    expect(store.getState().data).toBe('value');
    expect(store.getState().status).toBe('success');
  });

  it('keeps the last-good value visible while a refetch is in progress (stale-while-revalidate)', async () => {
    let resolveSecond: (value: string) => void = () => {};
    let call = 0;
    const store = createFetchStore(async () => {
      call += 1;
      if (call === 1) return 'first';
      return new Promise<string>(resolve => { resolveSecond = resolve; });
    });

    await store.fetch({ force: true });
    expect(store.getState().data).toBe('first');

    const second = store.fetch({ force: true });
    expect(store.getState().data).toBe('first'); // still visible during the second fetch
    expect(store.getState().status).toBe('loading');
    resolveSecond('second');
    await second;
    expect(store.getState().data).toBe('second');
  });

  it('refuses to refetch faster than the minimum interval unless forced (prevents a rerender storm)', async () => {
    let calls = 0;
    const store = createFetchStore(async () => { calls += 1; return calls; }, { minRefetchIntervalMs: 10_000 });

    await store.fetch({ force: true });
    await store.fetch(); // too soon, should be a no-op
    await store.fetch(); // too soon, should be a no-op
    expect(calls).toBe(1);

    await store.fetch({ force: true }); // explicit force bypasses the interval
    expect(calls).toBe(2);
  });

  it('reports a classified error message on failure rather than throwing to the caller', async () => {
    const store = createFetchStore(async () => { throw new Error('network down'); });
    await store.fetch({ force: true });
    expect(store.getState().status).toBe('error');
    expect(store.getState().error).toBe('network down');
  });

  it('notifies subscribers on every state transition', async () => {
    const store = createFetchStore(async () => 'value');
    const notifications: string[] = [];
    const unsubscribe = store.subscribe(() => notifications.push(store.getState().status));
    await store.fetch({ force: true });
    unsubscribe();
    expect(notifications).toContain('loading');
    expect(notifications).toContain('success');
  });
});

describe('getOrCreateFetchStore', () => {
  it('returns the same store instance for the same key — N callers share one fetch', async () => {
    let calls = 0;
    const fetcher = async () => { calls += 1; return 'shared'; };

    const storeA = getOrCreateFetchStore('shared-key', fetcher);
    const storeB = getOrCreateFetchStore('shared-key', fetcher);
    expect(storeA).toBe(storeB);

    await Promise.all([storeA.fetch({ force: true }), storeB.fetch({ force: true })]);
    expect(calls).toBe(1);
  });

  it('returns distinct stores for distinct keys', () => {
    const storeA = getOrCreateFetchStore('key-a', async () => 'a');
    const storeB = getOrCreateFetchStore('key-b', async () => 'b');
    expect(storeA).not.toBe(storeB);
  });
});

describe('clearFetchStoreRegistry', () => {
  it('disposes and clears every registered store', () => {
    const store = getOrCreateFetchStore('to-clear', () => new Promise(() => {}));
    void store.fetch();
    clearFetchStoreRegistry();
    const recreated = getOrCreateFetchStore('to-clear', async () => 'fresh');
    expect(recreated).not.toBe(store);
  });
});
