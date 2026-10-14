import 'server-only';
import { z } from 'zod';
import { canonicalDataProvider, MARKET_DATASETS, PRIORITY_MARKET_SCOPES, type MarketDataset } from './catalog';
import { marketDataScope } from './scope';

const short = z.string().trim().min(1).max(160);
const date = z.string().datetime({ offset: true });
const schema = z.object({
  id: short.regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  providerId: short.regex(/^[a-zA-Z0-9][a-zA-Z0-9 _:-]*$/),
  dataset: z.custom<MarketDataset>(value => typeof value === 'string' && Object.hasOwn(MARKET_DATASETS, value)),
  // Exact scope only: no '*' or regional grants inherited by every exchange.
  scope: z.object({
    exchange: short.regex(/^[a-zA-Z0-9][a-zA-Z0-9_ -]*$/).nullable(),
    country: short.regex(/^[a-zA-Z]{2}$/).nullable(),
  }).strict(),
  planName: short,
  commercialDisplay: z.enum(['allowed', 'denied', 'unverified']),
  redistribution: z.enum(['allowed', 'denied', 'unverified']),
  delayType: z.enum(['realtime', 'delayed', 'eod', 'unknown']),
  delayMinutes: z.number().nonnegative().finite().nullable(),
  evidenceReference: short,
  reviewedAt: date,
  validUntil: date,
}).strict().refine(row => row.scope.exchange !== null || row.scope.country !== null)
  .refine(row => ![row.scope.exchange, row.scope.country].includes('*'))
  .refine(row => Date.parse(row.validUntil) > Date.parse(row.reviewedAt))
  .refine(row => {
    // A cache TTL is never a contractual delay. Unknown/EOD must not carry
    // invented minutes; a delayed feed needs an explicit positive interval.
    if (row.delayType === 'delayed') return row.delayMinutes !== null && row.delayMinutes > 0;
    if (row.delayType === 'realtime') return row.delayMinutes === null || row.delayMinutes === 0;
    return row.delayMinutes === null;
  });

export type MarketDataEntitlement = z.infer<typeof schema>;

function parseEntitlements(raw: string | undefined) {
  if (!raw?.trim()) return { state: 'not_configured' as const, entries: [] as MarketDataEntitlement[] };
  try {
    if (raw.length > 65_536) throw new Error('oversized');
    const entries = z.array(schema).max(200).parse(JSON.parse(raw));
    const scopes = new Set<string>(), ids = new Set<string>();
    for (const entry of entries) {
      entry.providerId = canonicalDataProvider(entry.providerId)!;
      entry.scope = marketDataScope(entry.scope.exchange, entry.scope.country);
      const known = PRIORITY_MARKET_SCOPES.find(scope => scope.exchange === entry.scope.exchange);
      if (known && entry.scope.country !== known.country) throw new Error('exchange_country_mismatch');
      if (['openbb', 'sfm'].includes(entry.providerId)) throw new Error('integration_is_not_data_owner');
      const key = JSON.stringify([entry.providerId, entry.dataset, entry.scope.exchange, entry.scope.country]);
      if (scopes.has(key) || ids.has(entry.id)) throw new Error('ambiguous_entitlement');
      scopes.add(key); ids.add(entry.id);
    }
    return { state: 'configured' as const, entries };
  } catch {
    // Do not return parsing errors: they may contain confidential agreement text.
    return { state: 'invalid' as const, entries: [] as MarketDataEntitlement[] };
  }
}

let cachedRaw: string | undefined;
let cachedConfig: ReturnType<typeof parseEntitlements> | undefined;

export function readMarketDataEntitlements(raw = process.env.MARKET_DATA_ENTITLEMENTS_JSON) {
  // Large history/calendar responses reuse parsing, but expiry is checked on
  // every record. Changing configuration invalidates the cache immediately.
  if (cachedConfig && raw === cachedRaw) return cachedConfig;
  cachedRaw = raw;
  cachedConfig = parseEntitlements(raw);
  return cachedConfig;
}

export function entitlementFor(input: { providerId: string | null; dataset: MarketDataset; exchange: string | null; country: string | null }, now = Date.now()) {
  const config = readMarketDataEntitlements();
  const entry = config.entries.find(row => row.providerId === input.providerId && row.dataset === input.dataset
    && row.scope.exchange === input.exchange && row.scope.country === input.country);
  const active = entry && Date.parse(entry.reviewedAt) <= now && Date.parse(entry.validUntil) > now;
  return { entry: active ? entry : null, state: config.state === 'invalid' ? 'invalid' as const : entry && !active ? 'expired_or_future' as const : active ? 'verified' as const : 'unverified' as const };
}
