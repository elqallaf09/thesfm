import type { TvAsset } from '@/lib/server/markets-tv/catalog';
import type { TvQuote } from './types';
import { quoteStatus } from './quotes';

// Explicit continuous futures, never aliases for spot metal or a dated contract.
export const TV_COMMODITIES = [
 {symbol:'COMEX:GC1!',ticker:'GC1!',exchange:'COMEX',currency:'USD',name:'Gold · continuous futures',nameAr:'الذهب · عقد مستمر'},
 {symbol:'COMEX:SI1!',ticker:'SI1!',exchange:'COMEX',currency:'USD',name:'Silver · continuous futures',nameAr:'الفضة · عقد مستمر'},
 {symbol:'NYMEX:CL1!',ticker:'CL1!',exchange:'NYMEX',currency:'USD',name:'WTI oil · continuous futures',nameAr:'نفط WTI · عقد مستمر'},
 {symbol:'NYMEX:NG1!',ticker:'NG1!',exchange:'NYMEX',currency:'USD',name:'Natural gas · continuous futures',nameAr:'الغاز · عقد مستمر'},
] as const;
export const TV_COMMODITY_COLUMNS = ['name', 'description', 'exchange', 'type', 'currency', 'close', 'change', 'update_time', 'update_mode', 'current_session'];

export function tvCommodityIdentity(asset: TvAsset) {
 if(asset.assetType!=='commodity'||asset.currency!=='USD')return null;
 return TV_COMMODITIES.find(item=>item.symbol===asset.symbol&&item.exchange===asset.exchange)||null;
}

export function verifiedTvCommodityQuote(asset: TvAsset, payload: unknown, receivedAt: string, now = Date.now()): TvQuote | null {
  const bank = tvCommodityIdentity(asset);
  if (!bank || !payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) return null;
  const rows = payload.data.filter((row: unknown) => row && typeof row === 'object' && 's' in row && row.s === `${bank.exchange}:${bank.ticker}`);
  if (rows.length !== 1 || !Array.isArray(rows[0].d) || rows[0].d.length !== TV_COMMODITY_COLUMNS.length) return null;
  const [ticker, , exchange, type, currency, price, change, timestamp, mode, session] = rows[0].d as unknown[];
  if (ticker !== bank.ticker || exchange !== bank.exchange || type !== 'futures' || currency !== bank.currency) return null;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || typeof timestamp !== 'number' || !Number.isInteger(timestamp)) return null;
  const observed = timestamp * 1000;
  if (!Number.isFinite(observed) || observed > now + 60_000 || now - observed > 7 * 86_400_000) return null;
  // Preserve the upstream quote clock. Request/response time is never price time.
  // No live entitlement is inferred even if an upstream mode says realtime.
  const delayed = mode === 'delayed_streaming_600';
  const closed = session === 'out_of_session';
  const regular = session === 'regular';
  const quote: TvQuote = {
    symbol: asset.symbol, displaySymbol: asset.displaySymbol, name: asset.name, nameAr: asset.nameAr || asset.name,
    price, currency: bank.currency,
    changePercent: typeof change === 'number' && Number.isFinite(change) && Math.abs(change) < 200 ? change : null,
    source: 'TradingView', observedAt: new Date(observed).toISOString(), receivedAt,
    exchange: bank.exchange, country: 'US',
    observation: { precision: 'instant', marketOpen: closed ? false : regular ? true : null },
    delayType: delayed ? 'delayed' : null, changeBasis: 'session',
    status: closed ? 'closed' : delayed ? 'delayed' : 'unknown_delay',
  };
  return { ...quote, status: quoteStatus(quote, now) };
}
