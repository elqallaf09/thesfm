import 'server-only';
import type { MarketSearchItem } from '@/lib/market/marketService';

export type ProviderListing = MarketSearchItem & { exchange: string; source: string; exchangeName: string; mic: string };
export type ProviderDirectory = { rows: ProviderListing[]; status: 'directory' | 'snapshot' | 'unavailable'; asOf: string | null };
const SOURCE = 'https://api.twelvedata.com/stocks';
const COUNTRIES: Record<string, string> = {
  'United States': 'US', China: 'CN', Kuwait: 'KW', 'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA', Qatar: 'QA', Bahrain: 'BH', Oman: 'OM',
  Japan: 'JP', India: 'IN', 'South Korea': 'KR', 'Hong Kong': 'HK', Canada: 'CA', Australia: 'AU', 'United Kingdom': 'GB', Germany: 'DE', France: 'FR',
  Switzerland: 'CH', Netherlands: 'NL', Belgium: 'BE', Spain: 'ES', Italy: 'IT', Portugal: 'PT', Austria: 'AT', Denmark: 'DK', Sweden: 'SE', Norway: 'NO',
  Finland: 'FI', Ireland: 'IE', Poland: 'PL', Greece: 'GR', Turkey: 'TR', Brazil: 'BR', Mexico: 'MX', Singapore: 'SG', Malaysia: 'MY', Thailand: 'TH',
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
    if (typeof symbol !== 'string' || !/^[A-Z0-9][A-Z0-9.&/_-]{0,31}$/i.test(symbol) || typeof name !== 'string' || !name.trim()
      || typeof mic !== 'string' || !/^[A-Z0-9]{4}$/.test(mic) || PRIMARY_MIC.has(mic)
      || typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency) || typeof country !== 'string'
      || typeof exchange !== 'string' || !exchange || !['Common Stock', 'Preferred Stock', 'Depositary Receipt', 'American Depositary Receipt'].includes(String(type))) continue;
    const region = `TD_${mic}`;
    rows.set(`${region}:${symbol}`, { symbol: symbol.toUpperCase(), providerSymbol: symbol, name: name.trim(), assetType: 'stock', currency,
      country: COUNTRIES[country] || country, exchange: region, exchangeName: exchange, mic, source: SOURCE });
  }
  return [...rows.values()];
}
let saved: ProviderDirectory | null = null, pending: Promise<ProviderDirectory> | null = null, expires = 0;
export async function getProviderDirectory(): Promise<ProviderDirectory> {
  if (saved && expires > Date.now()) return saved;
  if (pending) return pending;
  pending = (async () => {
    try {
      // One catalog request per day per warm process; no quote fanout. A failed
      // refresh retains the last directory and reports snapshot status.
      const response = await fetch(SOURCE, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('DIRECTORY_UNAVAILABLE');
      const payload = await response.text();
      if (payload.length > 40_000_000) throw new Error('DIRECTORY_TOO_LARGE');
      const rows = parseProviderDirectory(JSON.parse(payload));
      if (!rows.length) throw new Error('EMPTY_DIRECTORY');
      saved = { rows, status: 'directory', asOf: new Date().toISOString() }; expires = Date.now() + 86400000;
    } catch {
      saved = { rows: saved?.rows || [], status: saved?.rows.length ? 'snapshot' : 'unavailable', asOf: saved?.asOf || null };
      expires = Date.now() + 300000;
    }
    return saved;
  })().finally(() => { pending = null; });
  return pending;
}
