import { twelveDataObservation, type QuoteObservation } from '@/lib/market/quoteObservation';
import type { MarketDataProviderContext, MarketDelayType, NormalizedMarketQuote } from '@/lib/market/marketDataProviders';
import { TWELVE_RETRY_HEADER } from '@/lib/server/twelve-data-fetch';
import { QuoteProviderError } from './quoteFailure';

type Candidate = { symbol: string; exchange: string | null; mic?: string };
// null preserves existing candidate handling for unrelated index symbols.
// Only the three unverified US caret identities are deliberately suppressed.
export function twelveDataIndexCandidates(symbol: string): Candidate[] | null {
  if (['^GSPC', '^DJI', '^NDX'].includes(symbol)) return [];
  // Verified native identities from Twelve Data's public /indices directory.
  const indices: Record<string, Candidate> = {
    FTSE: { symbol: 'FTSE', exchange: 'LSE', mic: 'XLON' },
    GDAXI: { symbol: 'GDAXI', exchange: 'XETR', mic: 'XETR' },
    N225: { symbol: 'N225', exchange: 'JPX', mic: 'XJPX' },
  };
  const known = indices[symbol.replace(/^\^/, '')];
  return known ? [known] : null;
}
type QuoteInput = {
  symbol: string; providerSymbol: string; provider: 'twelve_data'; providerName: string;
  delayType: MarketDelayType; observation?: QuoteObservation; context?: MarketDataProviderContext;
} & Partial<Record<'name' | 'price' | 'currency' | 'change' | 'changePercent' | 'open' | 'high' | 'low'
  | 'previousClose' | 'volume' | 'market' | 'exchange' | 'exchangeCode' | 'country' | 'assetType' | 'lastUpdated', unknown>>;
type JsonResult = { ok: boolean; status: number; data: unknown; cacheHit: boolean; cacheAgeSeconds: number; headers: Headers };

export async function fetchTwelveDataQuote(options: {
  symbol: string; market?: string | null; context?: MarketDataProviderContext; key: string; candidates: Candidate[];
  fetchJson: (url: string, options: { cacheKey: string; ttlMs: number; forceFresh?: boolean }) => Promise<JsonResult>;
  normalize: (input: QuoteInput) => NormalizedMarketQuote | null;
  success: (latency: number, cacheHit: boolean) => void;
}): Promise<NormalizedMarketQuote | null> {
  const { symbol, market, context } = options;
  const candidates = new Map(options.candidates.map(candidate => [`${candidate.symbol}:${candidate.exchange || ''}`, candidate]));
  let failure: QuoteProviderError | null = null;
  for (const candidate of candidates.values()) {
    const params = new URLSearchParams({ symbol: candidate.symbol, apikey: options.key, timezone: 'UTC' });
    if (candidate.exchange) params.set('exchange', candidate.exchange);
    if (candidate.mic) params.set('mic_code', candidate.mic);
    const started = Date.now();
    const result = await options.fetchJson(`https://api.twelvedata.com/quote?${params}`, {
      cacheKey: `quote:twelve_data:${candidate.symbol}:${candidate.exchange || ''}`, ttlMs: 45_000, forceFresh: context?.forceFresh,
    });
    const body = result.data as Record<string, unknown> | null;
    if (!result.ok || !body || body.status === 'error') {
      const status = Number(body?.code) || result.status;
      failure = new QuoteProviderError(status, String(body?.message || 'provider_error'), result.headers.get(TWELVE_RETRY_HEADER), candidate.symbol);
      // A rejected account/quota must not be retried using another symbol alias.
      if ([401, 402, 403, 429].includes(status)) throw failure;
      continue;
    }
    if (body.symbol && String(body.symbol).toUpperCase() !== candidate.symbol.toUpperCase()) continue;
    if (candidate.mic && (body.symbol !== candidate.symbol || body.mic_code !== candidate.mic)) continue;
    const kind = String(body.type ?? body.instrument_type ?? '').trim();
    if (candidate.mic && /^(?:(?:common|preferred)\s+)?stocks?$|^equity$|^etf$|^(?:mutual\s+)?fund$|^bond$|^forex$|^crypto(?:currency)?$|^commodit(?:y|ies)$|^futures?$/i.test(kind)) continue;
    const observed = twelveDataObservation(body);
    const quote = options.normalize({
      symbol: context?.symbol ?? symbol, providerSymbol: candidate.exchange ? `${candidate.symbol}:${candidate.exchange}` : candidate.symbol,
      provider: 'twelve_data', providerName: 'Twelve Data', name: body.name, price: body.close ?? body.price,
      currency: body.currency, change: body.change, changePercent: body.percent_change, open: body.open, high: body.high,
      low: body.low, previousClose: body.previous_close, volume: body.volume, market: market ?? body.exchange,
      exchange: body.exchange ?? candidate.exchange, exchangeCode: body.mic_code ?? candidate.exchange,
      country: body.country, assetType: body.type ?? body.instrument_type, ...observed,
      delayType: body.mic_code === 'XKUW' ? 'eod' : observed.delayType, context,
    });
    if (quote) {
      if (result.cacheHit) Object.assign(quote, { cached: true, cacheAgeSeconds: result.cacheAgeSeconds });
      options.success(Date.now() - started, result.cacheHit); return quote;
    }
  }
  if (failure) throw failure;
  return null;
}
