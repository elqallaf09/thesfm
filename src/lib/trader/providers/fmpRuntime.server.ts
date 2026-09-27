import 'server-only';

import {
  applySharedFmpCooldown,
  fmpQueuedFetch as fmpQueuedFetchLocal,
  markFmpRateLimited as markFmpRateLimitedLocal,
  setFmpSharedCooldownAdapter,
} from './fmpRuntime';
import { getPersistentCache } from '@/lib/trader/persistentCache';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

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
    try {
      const admin = createServerSupabaseAdmin();
      if (!admin) return;
      // This RPC performs the compare-and-set in PostgreSQL. A client-side
      // read followed by upsert can overwrite a longer Retry-After value when
      // two serverless instances are rate-limited at the same time.
      const { data, error } = await admin.rpc('extend_trader_cache_cooldown', {
        p_cache_key: FMP_SHARED_COOLDOWN_CACHE_KEY,
        p_candidate_until: new Date(untilMs).toISOString(),
        p_reason: 'provider_rate_limited',
      });
      if (error || typeof data !== 'string') return;
      const effectiveUntil = parsedFutureTimestamp(data);
      if (effectiveUntil) applySharedFmpCooldown(effectiveUntil);
    } catch {
      // A local cooldown has already been applied. Shared persistence is
      // best-effort and must not weaken that local backoff when unavailable.
    }
  })();
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
