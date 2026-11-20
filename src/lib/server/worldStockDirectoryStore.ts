import 'server-only';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type { ProviderDirectory, ProviderListing } from '@/lib/world-stocks/providerDirectory';

// A worldwide directory can exceed Next's 2 MiB data-cache item limit. Keep a
// compressed, atomic last-success snapshot in the existing private cache table.
const CACHE_KEY = 'world_stock_directory:v1';
const SOURCE = 'https://api.twelvedata.com/stocks?type=Common%20Stock';
const KEEP_MS = 30 * 86_400_000;
const MAX_COMPRESSED_BYTES = 8 * 1024 * 1024;
const MAX_DIRECTORY_BYTES = 64 * 1024 * 1024;
const MAX_ROWS = 250_000;
const zip = promisify(gzip), unzip = promisify(gunzip);
type StoredDirectory = { version: 1; encoding: 'gzip-base64'; source: string; asOf: string; count: number; data: string };

function validAsOf(value: unknown, now: number): value is string {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now + 60_000 && time > now - KEEP_MS;
}

function validatedRows(value: unknown): ProviderListing[] | null {
  if (!Array.isArray(value) || !value.length || value.length > MAX_ROWS) return null;
  const rows: ProviderListing[] = [], seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.symbol !== 'string' || !/^[A-Z0-9][A-Z0-9.&/_-]{0,31}$/.test(row.symbol)
      || typeof row.providerSymbol !== 'string' || row.providerSymbol.toUpperCase() !== row.symbol
      || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 1024
      || typeof row.mic !== 'string' || !/^[A-Z0-9]{4}$/.test(row.mic) || row.exchange !== `TD_${row.mic}`
      || typeof row.exchangeName !== 'string' || !row.exchangeName.trim() || row.exchangeName.length > 256
      || typeof row.currency !== 'string' || row.currency !== 'GBp' && !/^[A-Z]{3}$/.test(row.currency)
      || typeof row.country !== 'string' || !row.country || row.country.length > 128
      || row.assetType !== 'stock' || row.source !== SOURCE) return null;
    const identity = `${row.exchange}:${row.symbol}`;
    if (seen.has(identity)) return null;
    seen.add(identity);
    // Reconstruct the schema; cached metadata never carries prices or secrets.
    rows.push({ symbol: row.symbol, providerSymbol: row.providerSymbol, name: row.name, mic: row.mic,
      exchange: row.exchange, exchangeName: row.exchangeName, currency: row.currency, country: row.country,
      assetType: 'stock', source: SOURCE });
  }
  return rows;
}

export async function readStoredProviderDirectory(now = Date.now()): Promise<ProviderDirectory | null> {
  try {
    const admin = createServerSupabaseAdmin();
    if (!admin) return null;
    const { data, error } = await admin.from('trader_cache').select('payload, expires_at').eq('cache_key', CACHE_KEY)
      .abortSignal(AbortSignal.timeout(2500)).maybeSingle();
    if (error || !data || !Number.isFinite(Date.parse(data.expires_at)) || Date.parse(data.expires_at) <= now) return null;
    const payload = data.payload as Partial<StoredDirectory> | null;
    if (!payload || payload.version !== 1 || payload.encoding !== 'gzip-base64' || payload.source !== SOURCE
      || !validAsOf(payload.asOf, now) || !Number.isInteger(payload.count) || Number(payload.count) < 1 || Number(payload.count) > MAX_ROWS
      || typeof payload.data !== 'string' || !payload.data.length || payload.data.length > Math.ceil(MAX_COMPRESSED_BYTES / 3) * 4
      || payload.data.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.data)) return null;
    const compressed = Buffer.from(payload.data, 'base64');
    if (compressed.byteLength > MAX_COMPRESSED_BYTES) return null;
    const decoded = await unzip(compressed, { maxOutputLength: MAX_DIRECTORY_BYTES });
    const rows = validatedRows(JSON.parse(decoded.toString('utf8')));
    if (!rows || rows.length !== payload.count) return null;
    return { rows, status: 'snapshot', asOf: payload.asOf };
  } catch { return null; }
}

export async function saveStoredProviderDirectory(directory: ProviderDirectory, now = Date.now()): Promise<void> {
  try {
    if (directory.status !== 'directory' || !validAsOf(directory.asOf, now)) return;
    const rows = validatedRows(directory.rows);
    if (!rows) return;
    const admin = createServerSupabaseAdmin();
    if (!admin) return;
    const serialized = Buffer.from(JSON.stringify(rows));
    if (serialized.byteLength > MAX_DIRECTORY_BYTES) return;
    const compressed = await zip(serialized);
    if (compressed.byteLength > MAX_COMPRESSED_BYTES) return;
    const payload: StoredDirectory = { version: 1, encoding: 'gzip-base64', source: SOURCE,
      asOf: directory.asOf, count: rows.length, data: compressed.toString('base64') };
    await admin.from('trader_cache').upsert({ cache_key: CACHE_KEY, payload,
      expires_at: new Date(Date.parse(directory.asOf) + KEEP_MS).toISOString(), updated_at: new Date(now).toISOString(),
    }, { onConflict: 'cache_key' }).abortSignal(AbortSignal.timeout(5000));
  } catch { /* A failed refresh/write never replaces the last successful snapshot. */ }
}
