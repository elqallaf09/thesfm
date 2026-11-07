import type { TvAsset } from '@/lib/server/markets-tv/catalog';
import type { TvQuote } from './types';
import { quoteStatus } from './quotes';

// Listing identities verified against the exchange/issuer, not name searches.
export const TV_WORLD_STOCKS = [
  { symbol: 'ASML.AS', ticker: 'ASML', exchange: 'EURONEXT', mic: 'XAMS', region: 'TD_XAMS', currency: 'EUR', country: 'NL', isin: 'NL0010273215' },
  { symbol: 'SAP.DE', ticker: 'SAP', exchange: 'XETR', mic: 'XETR', region: 'TD_XETR', currency: 'EUR', country: 'DE', isin: 'DE0007164600' },
  { symbol: 'NESN.SW', ticker: 'NESN', exchange: 'SIX', mic: 'XSWX', region: 'TD_XSWX', currency: 'CHF', country: 'CH', isin: 'CH0038863350' },
  { symbol: '7203.T', ticker: '7203', exchange: 'TSE', mic: 'XTKS', region: 'TD_XTKS', currency: 'JPY', country: 'JP', isin: 'JP3633400001' },
  { symbol: '6758.T', ticker: '6758', exchange: 'TSE', mic: 'XTKS', region: 'TD_XTKS', currency: 'JPY', country: 'JP', isin: 'JP3435000009' },
  { symbol: '0700.HK', ticker: '700', exchange: 'HKEX', mic: 'XHKG', region: 'TD_XHKG', currency: 'HKD', country: 'HK', isin: 'KYG875721634' },
] as const;
export const TV_WORLD_STOCK_COLUMNS = ['name', 'description', 'exchange', 'type', 'currency', 'close', 'change', 'update_time', 'isin', 'update_mode', 'current_session'];

export function tvWorldStockIdentity(asset: TvAsset) {
  if (asset.assetType && asset.assetType !== 'stock') return null;
  return TV_WORLD_STOCKS.find(bank => {
    if (asset.currency !== bank.currency || asset.country && asset.country !== bank.country) return false;
    if (asset.mic && asset.mic !== bank.mic || asset.providerSymbol && asset.providerSymbol !== (bank.symbol === '0700.HK' ? '0700' : bank.ticker)) return false;
    const market = asset.mic || asset.region || asset.exchange;
    if (![bank.mic, bank.region, bank.exchange, `TD_${bank.mic}`].includes(market || '')) return false;
    // Require the exact listing or an explicit MIC for bare symbols.
    return asset.symbol === bank.symbol || asset.mic === bank.mic && asset.symbol === bank.ticker;
  }) || null;
}

export function verifiedTvWorldStockQuote(asset: TvAsset, payload: unknown, receivedAt: string, now = Date.now()): TvQuote | null {
  const bank = tvWorldStockIdentity(asset);
  if (!bank || !payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) return null;
  const rows = payload.data.filter((row: unknown) => row && typeof row === 'object' && 's' in row && row.s === `${bank.exchange}:${bank.ticker}`);
  if (rows.length !== 1 || !Array.isArray(rows[0].d) || rows[0].d.length !== TV_WORLD_STOCK_COLUMNS.length) return null;
  const [ticker, , exchange, type, currency, price, change, timestamp, isin, mode, session] = rows[0].d as unknown[];
  if (ticker !== bank.ticker || exchange !== bank.exchange || type !== 'stock' || currency !== bank.currency || isin !== bank.isin) return null;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || typeof timestamp !== 'number' || !Number.isInteger(timestamp)) return null;
  const observed = timestamp * 1000;
  if (!Number.isFinite(observed) || observed > now + 60_000 || now - observed > 7 * 86_400_000) return null;
  // Preserve the upstream quote clock. Request/response time is never price time.
  // No live entitlement is inferred even if an upstream mode says realtime.
  const delayed = mode === 'delayed_streaming_900' || mode === 'delayed_streaming_1200';
  const closed = session === 'out_of_session';
  const regular = session === 'regular';
  const quote: TvQuote = {
    symbol: asset.symbol, displaySymbol: asset.displaySymbol, name: asset.name, nameAr: asset.nameAr || asset.name,
    price, currency: bank.currency,
    changePercent: typeof change === 'number' && Number.isFinite(change) && Math.abs(change) < 200 ? change : null,
    source: 'TradingView', observedAt: new Date(observed).toISOString(), receivedAt,
    exchange: asset.exchange || bank.region, country: bank.country,
    observation: { precision: 'instant', marketOpen: closed ? false : regular ? true : null },
    delayType: delayed ? 'delayed' : null, changeBasis: 'session',
    status: closed ? 'closed' : delayed ? 'delayed' : 'unknown_delay',
  };
  return { ...quote, status: quoteStatus(quote, now) };
}
