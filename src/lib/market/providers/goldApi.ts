import type { MarketDataProvider, MarketDataProviderContext, NormalizedMarketQuote, ProviderHealthResult } from '@/lib/market/marketDataProviders';
import { observationIso } from '@/lib/market/quoteObservation';

/** Gold API's XAG feed is USD per troy ounce of spot silver, not SI futures. */
export function isSilverSpot(symbol: string, context: MarketDataProviderContext = {}) {
  const canonical = (context.symbol || symbol).trim().toUpperCase().replace(/[ /_-]/g, '');
  return ['XAG', 'XAGUSD', 'SILVER'].includes(canonical)
    && (!context.currency || context.currency.toUpperCase() === 'USD')
    && (!context.assetType || ['commodity', 'forex', 'metal'].includes(context.assetType));
}

export function normalizeGoldApiSilver(payload: unknown): NormalizedMarketQuote | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const row = payload as Record<string, unknown>;
  const observedAt = typeof row.updatedAt === 'string' && row.updatedAt.includes('T') ? observationIso(row.updatedAt) : null;
  if (row.symbol !== 'XAG' || row.currency !== 'USD' || typeof row.price !== 'number'
    || !Number.isFinite(row.price) || row.price <= 0 || !observedAt || Date.parse(observedAt) > Date.now() + 60_000) return null;
  return {
    symbol: 'XAGUSD', providerSymbol: 'XAG', name: 'Silver Spot / US Dollar', price: row.price,
    currency: 'USD', market: 'Metals', exchange: 'OTC', exchangeCode: null, country: 'Global', assetType: 'commodity',
    change: null, changePercent: null, open: null, high: null, low: null, previousClose: null, volume: null,
    provider: 'gold_api', providerName: 'Gold API', delayType: 'realtime', lastUpdated: observedAt,
    observation: { precision: 'instant', marketOpen: null },
  };
}

export class GoldApiProvider implements MarketDataProvider {
  name = 'gold_api' as const;
  displayName = 'Gold API';
  private cached: { quote: NormalizedMarketQuote; fetchedAt: number } | null = null;
  private pending: Promise<NormalizedMarketQuote | null> | null = null;
  configured() { return true; }
  supports(symbol: string, context: MarketDataProviderContext) { return isSilverSpot(symbol, context); }

  async getQuote(symbol: string, _market?: string | null, context: MarketDataProviderContext = {}) {
    if (!this.supports(symbol, context)) return null;
    // The public endpoint requires at least 30 seconds of caching, even on refresh.
    if (this.cached && Date.now() - this.cached.fetchedAt < 30_000) {
      return { ...this.cached.quote, cached: true, cacheAgeSeconds: Math.floor((Date.now() - this.cached.fetchedAt) / 1000) };
    }
    if (this.pending) return this.pending;
    this.pending = (async () => {
      const response = await fetch('https://api.gold-api.com/price/XAG', {
        headers: { accept: 'application/json', 'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)' },
        signal: AbortSignal.timeout(8000), next: { revalidate: 30 },
      });
      if (!response.ok) throw new Error(`provider_http_${response.status}`);
      const quote = normalizeGoldApiSilver(await response.json());
      if (quote) this.cached = { quote, fetchedAt: Date.now() };
      return quote;
    })().finally(() => { this.pending = null; });
    return this.pending;
  }

  // The free price endpoint has no historical candles or daily change fields.
  async getCandles() { return []; }
  async getCompanyProfile() { return null; }
  async getLogo() { return null; }
  async getNews() { return []; }
  async getSymbolSearch() { return []; }
  async getExchangeMetadata() { return null; }
  async healthCheck(): Promise<ProviderHealthResult> {
    const started = Date.now();
    const base = { provider: this.name, displayName: this.displayName, configured: true, remainingQuota: null, lastCheckedAt: new Date().toISOString() };
    try {
      const quote = await this.getQuote('XAGUSD');
      return { ...base, status: quote ? 'healthy' : 'no_data', latencyMs: Date.now() - started, latestError: quote ? null : 'NO_MARKET_DATA' };
    } catch {
      return { ...base, status: 'error', latencyMs: Date.now() - started, latestError: 'gold_api_request_failed' };
    }
  }
}
