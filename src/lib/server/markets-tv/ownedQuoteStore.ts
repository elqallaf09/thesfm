import 'server-only';
import { createHash } from 'node:crypto';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import type { TvQuote } from '@/lib/markets-tv/types';

/* THE SFM as its own last-resort provider. Every verified quote any screen
 * receives is kept in the shared private cache (no new schema), so when every
 * upstream source is out, the TV shows the last verified observation with its
 * original source and clock — labelled stale once it ages — never a made-up one. */

const PREFIX = 'tv_owned_quote:v1:';
const KEEP_MS = 8 * 86_400_000;
const READ_TIMEOUT_MS = 800;
const WRITE_TIMEOUT_MS = 1200;
type Stored = { version: 1; key: string; quote: TvQuote };
const lastWritten = new Map<string, string>();

function cacheKey(identity: string) {
  return PREFIX + createHash('sha256').update(identity).digest('hex').slice(0, 32);
}

/** Only fully verified observations are kept. */
export function isOwnableQuote(quote: TvQuote, now = Date.now()) {
  const observed = Date.parse(quote.observedAt || '');
  return quote.price !== null && Number.isFinite(quote.price) && quote.price > 0 && Boolean(quote.source) && !quote.issue
    && Number.isFinite(observed) && observed <= now + 60_000 && quoteStatus(quote, now) !== 'unknown_time';
}

export async function saveOwnedTvQuote(identity: string, quote: TvQuote): Promise<void> {
  if (!isOwnableQuote(quote)) return;
  const stamp = `${quote.observedAt}|${quote.price}|${quote.source}`;
  if (lastWritten.get(identity) === stamp) return;
  try {
    const admin = createServerSupabaseAdmin();
    if (!admin) return;
    const now = Date.now();
    const payload: Stored = { version: 1, key: identity, quote: { ...quote, retryAt: undefined } };
    const { error } = await admin.from('trader_cache').upsert({
      cache_key: cacheKey(identity), payload, expires_at: new Date(now + KEEP_MS).toISOString(), updated_at: new Date(now).toISOString(),
    }, { onConflict: 'cache_key' }).abortSignal(AbortSignal.timeout(WRITE_TIMEOUT_MS));
    if (!error) lastWritten.set(identity, stamp);
  } catch { /* Persistence is best-effort; the live chain is unaffected. */ }
}

/** Last verified observation for this exact listing, with its status recomputed now. */
export async function readOwnedTvQuote(identity: string, symbol: string, now = Date.now()): Promise<TvQuote | null> {
  try {
    const admin = createServerSupabaseAdmin();
    if (!admin) return null;
    const { data, error } = await admin.from('trader_cache').select('payload, expires_at').eq('cache_key', cacheKey(identity))
      .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS)).maybeSingle();
    if (error || !data || Date.parse(data.expires_at) <= now) return null;
    const stored = data.payload as Partial<Stored> | null;
    const quote = stored?.quote;
    // The key is hashed, so also require the stored identity and symbol to match.
    if (stored?.version !== 1 || stored.key !== identity || !quote || quote.symbol !== symbol || !isOwnableQuote(quote, now)) return null;
    return { ...quote, status: quoteStatus({ ...quote, status: 'stale' }, now) };
  } catch { return null; }
}

export function __resetOwnedTvQuotesForTests() { lastWritten.clear(); }
