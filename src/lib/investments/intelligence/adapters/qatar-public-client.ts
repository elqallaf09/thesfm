import 'server-only';

export const QATAR_DATASET = 'weekly-real-estates-sales-bulletin';
export const QATAR_API = `https://www.data.gov.qa/api/explore/v2.1/catalog/datasets/${QATAR_DATASET}`;
export const QATAR_SOURCE = `https://www.data.gov.qa/explore/dataset/${QATAR_DATASET}/`;
export const QATAR_LICENSE = 'https://creativecommons.org/licenses/by/4.0/';
export const QATAR_PROVIDER_ID = 'qa-moj-open-sales-context';
export const QATAR_SOURCE_NAME = 'Qatar Ministry of Justice · State of Qatar Open Data';
const MAX_BYTES = 1_000_000;
const MAX_CACHE_KEYS = 32;
const TTL = 10 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();

type JsonObject = Record<string, unknown>;
export function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('SOURCE_SCHEMA_CHANGED');
  return value as JsonObject;
}
export function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 300) : '';
}
export function normalized(value: unknown): string {
  return text(value).normalize('NFKC').replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}
export function rows(value: unknown, limit: number): JsonObject[] {
  const result = object(value);
  if (!Array.isArray(result.results) || result.results.length > limit || !Number.isSafeInteger(result.total_count) || Number(result.total_count) < 0) throw new Error('SOURCE_SCHEMA_CHANGED');
  return result.results.map(object);
}
export function dateOnly(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return null;
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

/** No arbitrary URL, redirects, cookies, authorization headers or private parcel IDs. */
export async function readQatarPublicJson(
  resource: 'metadata' | 'records',
  query: Record<string, string> = {},
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const url = new URL(resource === 'metadata' ? QATAR_API : `${QATAR_API}/records`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const useCache = (resource === 'metadata' || Boolean(query.group_by)) && fetcher === fetch && process.env.NODE_ENV !== 'test';
  const key = url.href;
  const cached = useCache ? cache.get(key) : undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (useCache && pending.has(key)) return pending.get(key)!;
  const load = async () => {
    const response = await fetcher(url, { signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('SOURCE_UNAVAILABLE');
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json') || !response.body) throw new Error('SOURCE_SCHEMA_CHANGED');
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > MAX_BYTES) { await response.body.cancel(); throw new Error('SOURCE_RESPONSE_TOO_LARGE'); }
    const reader = response.body.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error('SOURCE_RESPONSE_TOO_LARGE');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    const combined = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
    const data: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(combined));
    if (useCache) {
      if (cache.size >= MAX_CACHE_KEYS) cache.delete(cache.keys().next().value!);
      cache.set(key, { expiresAt: Date.now() + TTL, value: data });
    }
    return data;
  };
  if (useCache && pending.size >= MAX_CACHE_KEYS) throw new Error('SOURCE_BUSY');
  const request = load();
  if (useCache) pending.set(key, request);
  try { return await request; } finally { if (useCache) pending.delete(key); }
}

/** Recheck the published license, identity and field contract before every cached batch. */
export async function verifyQatarDataset(fetcher: typeof fetch = fetch) {
  const data = object(await readQatarPublicJson('metadata', {}, fetcher));
  const metadata = object(object(data.metas).default);
  if (data.dataset_id !== QATAR_DATASET || metadata.publisher !== 'Ministry of Justice' || metadata.license_url !== QATAR_LICENSE) throw new Error('SOURCE_LICENSE_OR_IDENTITY_CHANGED');
  if (!Array.isArray(data.fields)) throw new Error('SOURCE_SCHEMA_CHANGED');
  const fields = new Map(data.fields.map(field => { const item = object(field); return [item.name, item.type]; }));
  const required: Record<string, string> = {
    registration_date: 'date', encrypted_transaction_number: 'text',
    municipality_name: 'text', sm_lbldy: 'text', district_name: 'text', sm_lmntq: 'text',
    property_type: 'text', nw_l_qr: 'text', usage: 'text', lstkhdm: 'text',
    area_square_meters: 'int', price_per_square_meter: 'int', property_value: 'int',
    number_of_shares_2400: 'int', share_area: 'int', share_value: 'int',
  };
  for (const [name, type] of Object.entries(required)) if (fields.get(name) !== type) throw new Error('SOURCE_SCHEMA_CHANGED');
  return { metadataUpdatedAt: dateOnly(metadata.modified) };
}
