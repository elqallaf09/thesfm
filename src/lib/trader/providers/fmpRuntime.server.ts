import 'server-only';

import { randomUUID } from 'crypto';
import {
  applySharedFmpCooldown,
  fmpQueuedFetch as fmpQueuedFetchLocal,
  markFmpRateLimited as markFmpRateLimitedLocal,
  setFmpSharedCooldownAdapter,
} from './fmpRuntime';
import { getPersistentCache, setPersistentCache } from '@/lib/trader/persistentCache';
import { acquireScanLock, releaseScanLock } from '@/lib/trader/scannerLock';

type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

type SharedFmpCooldown = {
  version: 1;
  until: string;
  reason: 'provider_rate_limited';
};

const FMP_SHARED_COOLDOWN_CACHE_KEY = 'market_provider_cooldown:fmp';
const FMP_SHARED_COOLDOWN_LOCK_KEY = 'market_provider_cooldown:fmp:write';
const FMP_SHARED_COOLDOWN_LOOKUP_TIMEOUT_MS = 300;
const FMP_SHARED_COOLDOWN_REFRESH_MS = process.env.NODE_ENV === 'test' ? 0 : 5_000;

let sharedCooldownCheckedAt = 0;
let sharedCooldownSync: Promise<void> | null = null;

function parsedFutureTimestamp(value: string | null | undefined, now = Date.now()) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) && timestamp > now ? timestamp : null;
}

async function readSharedFmpCooldown(): Promise<SharedFmpCooldown | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      getPersistentCache<SharedFmpCooldown>(FMP_SHARED_COOLDOWN_CACHE_KEY),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), FMP_SHARED_COOLDOWN_LOOKUP_TIMEOUT_MS);
        timer.unref?.();
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function synchronizeSharedFmpCooldown(now = Date.now()) {
  if (now - sharedCooldownCheckedAt < FMP_SHARED_COOLDOWN_REFRESH_MS) return;
  if (sharedCooldownSync) return sharedCooldownSync;

  sharedCooldownSync = (async () => {
    const shared = await readSharedFmpCooldown();
    const sharedUntil = parsedFutureTimestamp(shared?.until, now);
    if (sharedUntil) applySharedFmpCooldown(sharedUntil);
    sharedCooldownCheckedAt = now;
  })().finally(() => {
    sharedCooldownSync = null;
  });

  return sharedCooldownSync;
}

function publishSharedFmpCooldown(untilMs: number) {
  void (async () => {
    const runId = randomUUID();
    const lock = await acquireScanLock(FMP_SHARED_COOLDOWN_LOCK_KEY, runId, 3_000);
    if (!lock.acquired) return;

    try {
      const current = await readSharedFmpCooldown();
      const currentUntil = parsedFutureTimestamp(current?.until) ?? 0;
      const effectiveUntil = Math.max(untilMs, currentUntil);
      await setPersistentCache(
        FMP_SHARED_COOLDOWN_CACHE_KEY,
        { version: 1, until: new Date(effectiveUntil).toISOString(), reason: 'provider_rate_limited' } satisfies SharedFmpCooldown,
        Math.max(1_000, effectiveUntil - Date.now()),
      );
    } finally {
      await releaseScanLock(FMP_SHARED_COOLDOWN_LOCK_KEY, runId);
    }
  })().catch(() => undefined);
}

setFmpSharedCooldownAdapter({
  synchronize: synchronizeSharedFmpCooldown,
  publish: publishSharedFmpCooldown,
});

export async function fmpQueuedFetch(input: RequestInfo | URL, init?: NextFetchInit) {
  return fmpQueuedFetchLocal(input, init);
}

export function markFmpRateLimited(response: Response | null, message: unknown = 'provider_rate_limited') {
  markFmpRateLimitedLocal(response, message);
}

/**
 * Hydrates this server's in-memory runtime state from the shared cooldown.
 * The read is bounded, so status aggregation can call this without turning a
 * diagnostics request into an unbounded cache dependency.
 */
export async function synchronizeFmpSharedCooldown() {
  await synchronizeSharedFmpCooldown();
}

export function __resetFmpServerRuntimeForTests() {
  sharedCooldownCheckedAt = 0;
  sharedCooldownSync = null;
}
