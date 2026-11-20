import 'server-only';
import { after } from 'next/server';
import type { MarketSearchItem } from '@/lib/market/marketService';
import { readStoredProviderDirectory, saveStoredProviderDirectory } from '@/lib/server/worldStockDirectoryStore';

export type ProviderListing = MarketSearchItem & { exchange: string; source: string; exchangeName: string; mic: string };
export type ProviderDirectory = { rows: ProviderListing[]; status: 'directory' | 'snapshot' | 'unavailable'; asOf: string | null };
// The unfiltered endpoint also includes non-equity catalogs and exceeds the
// response budget. Request ordinary company shares explicitly. US funds and
// other share classes continue to come from the complete Nasdaq directory.
const SOURCE = 'https://api.twelvedata.com/stocks?type=Common%20Stock';
const COUNTRIES: Record<string, string> = {
  'United States': 'US', China: 'CN', Kuwait: 'KW', 'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA', Qatar: 'QA', Bahrain: 'BH', Oman: 'OM',
  Japan: 'JP', India: 'IN', 'South Korea': 'KR', 'Hong Kong': 'HK', Canada: 'CA', Australia: 'AU', 'United Kingdom': 'GB', Germany: 'DE', France: 'FR',
  Switzerland: 'CH', Netherlands: 'NL', Belgium: 'BE', Spain: 'ES', Italy: 'IT', Portugal: 'PT', Austria: 'AT', Denmark: 'DK', Sweden: 'SE', Norway: 'NO',
  Finland: 'FI', Ireland: 'IE', Poland: 'PL', Greece: 'GR', Turkey: 'TR', 'Czech Republic': 'CZ', Hungary: 'HU', Romania: 'RO',
  Estonia: 'EE', Latvia: 'LV', Lithuania: 'LT', Iceland: 'IS', Russia: 'RU', Brazil: 'BR', Mexico: 'MX', Singapore: 'SG', Malaysia: 'MY', Thailand: 'TH',
  Albania: 'AL', Andorra: 'AD', Belarus: 'BY', 'Bosnia and Herzegovina': 'BA', Bulgaria: 'BG', Croatia: 'HR', Cyprus: 'CY', Czechia: 'CZ',
  Luxembourg: 'LU', Malta: 'MT', Moldova: 'MD', Monaco: 'MC', Montenegro: 'ME', 'North Macedonia': 'MK', 'San Marino': 'SM', Serbia: 'RS',
  Slovakia: 'SK', Slovenia: 'SI', Ukraine: 'UA', Liechtenstein: 'LI', Kosovo: 'XK', 'Vatican City': 'VA',
  Indonesia: 'ID', Philippines: 'PH', Vietnam: 'VN', Taiwan: 'TW', 'South Africa': 'ZA', Egypt: 'EG', Jordan: 'JO', Morocco: 'MA', 'New Zealand': 'NZ',
};
// Those markets use the exchange directories already maintained by THE SFM.
const PRIMARY_MIC = new Set(['XNAS', 'XNYS', 'XASE', 'ARCX', 'BATS', 'IEXG', 'XKUW', 'XSHG', 'XSHE', 'XDFM', 'DIFX']);
export function providerRegion(value: unknown): value is string { return typeof value === 'string' && /^TD_[A-Z0-9]{4}$/.test(value); }
export function parseProviderDirectory(payload: unknown): ProviderListing[] {
  const body = payload as { status?: string; data?: unknown[] } | null;
  if (body?.status !== 'ok' || !Array.isArray(body.data)) throw new Error('INVALID_DIRECTORY');
  const rows = new Map<string, ProviderListing>();
  for (const raw of body.data) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const { symbol, name, mic_code: mic, currency, country, exchange, type } = item;
    if (typeof symbol !== 'string' || !/^[A-Z0-9][A-Z0-9.&/_-]{0,31}$/i.test(symbol) || typeof name !== 'string' || !name.trim() || name.length > 1024
      || typeof mic !== 'string' || !/^[A-Z0-9]{4}$/.test(mic) || PRIMARY_MIC.has(mic)
      // GBp is the source's explicit pence denomination, not GBP pounds.
      || typeof currency !== 'string' || currency !== 'GBp' && !/^[A-Z]{3}$/.test(currency) || typeof country !== 'string' || !country.trim() || country.length > 128
      || typeof exchange !== 'string' || !exchange.trim() || exchange.length > 256 || !['Common Stock', 'Preferred Stock', 'Depositary Receipt', 'American Depositary Receipt'].includes(String(type))) continue;
    const region = `TD_${mic}`;
    rows.set(`${region}:${symbol.toUpperCase()}`, { symbol: symbol.toUpperCase(), providerSymbol: symbol, name: name.trim(), assetType: 'stock', currency,
      country: COUNTRIES[country] || country, exchange: region, exchangeName: exchange, mic, source: SOURCE });
  }
  return [...rows.values()];
}
const DAY_MS = 86_400_000;
let saved: ProviderDirectory | null = null, pending: Promise<ProviderDirectory> | null = null, expires = 0;
let hydrated = false, hydration: Promise<void> | null = null, revision = 0;

/** Consumers can invalidate a partial universe as soon as background work ends. */
export function providerDirectoryRevision(): number { return revision; }

/** Nonblocking access to verified rows; a refresh never erases their provenance. */
export function peekProviderDirectory(): ProviderDirectory | null {
  if (!saved?.rows.length) return null;
  return expires > Date.now() ? saved : { ...saved, status: 'snapshot' };
}

async function hydrateDirectory(): Promise<void> {
  if (hydrated) return;
  if (!hydration) {
    hydration = (async () => {
      const stored = await readStoredProviderDirectory();
      if (stored?.rows.length) {
        saved = stored;
        expires = Date.parse(stored.asOf || '') + DAY_MS;
        revision++;
      }
    })().finally(() => { hydrated = true; hydration = null; });
    const work = hydration;
    // Register before awaiting the shared-store read: its larger directory can
    // outlast search's 1.5-second budget even before a provider fetch starts.
    try { after(async () => { await work; }); } catch { /* Offline callers await hydration directly. */ }
  }
  await hydration;
}

function refreshDirectory(): Promise<ProviderDirectory> {
  if (pending) return pending;
  pending = (async (): Promise<ProviderDirectory> => {
    try {
      // One catalog request per day per warm process; no quote fanout. The
      // persistent snapshot also survives serverless process replacement.
      const response = await fetch(SOURCE, { cache: 'no-store', signal: AbortSignal.timeout(35000) });
      if (!response.ok) throw new Error('DIRECTORY_UNAVAILABLE');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('EMPTY_DIRECTORY');
      const decoder = new TextDecoder(), parts: string[] = []; let size = 0;
      try {
        for (;;) {
          const chunk = await reader.read(); if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 64_000_000) { await reader.cancel(); throw new Error('DIRECTORY_TOO_LARGE'); }
          parts.push(decoder.decode(chunk.value, { stream: true }));
        }
        parts.push(decoder.decode());
      } finally { reader.releaseLock(); }
      const payload = parts.join('');
      const rows = parseProviderDirectory(JSON.parse(payload));
      if (!rows.length) throw new Error('EMPTY_DIRECTORY');
      saved = { rows, status: 'directory', asOf: new Date().toISOString() };
      expires = Date.now() + DAY_MS;
      revision++;
      await saveStoredProviderDirectory(saved);
    } catch {
      saved = { rows: saved?.rows || [], status: saved?.rows.length ? 'snapshot' : 'unavailable', asOf: saved?.asOf || null };
      expires = Date.now() + 300000;
      revision++;
    }
    return saved;
  })().finally(() => { pending = null; });
  const work = pending;
  // searchWorldStocks has a shorter response budget. Keep a slow cold fetch
  // and its durable write alive after that response in serverless runtimes.
  try { after(async () => { await work; }); } catch { /* Offline callers await work directly. */ }
  return pending;
}

export async function getProviderDirectory(): Promise<ProviderDirectory> {
  await hydrateDirectory();
  if (saved && expires > Date.now()) return saved;
  const work = refreshDirectory();
  // Browsing can use the last complete directory while its daily refresh runs.
  return peekProviderDirectory() || work;
}
