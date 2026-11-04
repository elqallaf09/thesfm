import type { IntelligenceAssetType } from '@/domain/intelligence/contracts';
import type { TvQuote } from './types';

export function tvAnalysisAssetType(quote: Pick<TvQuote, 'symbol' | 'exchange'>): IntelligenceAssetType {
  if (quote.symbol.startsWith('^')) return 'INDEX';
  if (quote.symbol.endsWith('=F')) return 'COMMODITY';
  if (quote.exchange === 'FOREX' || quote.symbol.endsWith('=X')) return 'FOREX';
  if (quote.exchange === 'BINANCE' || /[-/](USD|USDT|USDC|BTC|ETH)$/.test(quote.symbol)) return 'CRYPTO';
  return 'STOCK';
}

export function tvAnalysisHref(quote: Pick<TvQuote, 'symbol' | 'exchange' | 'currency'>): string {
  const suffixes: Record<string, string> = { TD_XAMS: 'AS', TD_XETR: 'DE', TD_XSWX: 'SW', TD_XTKS: 'T', TD_XHKG: 'HK', TD_XPAR: 'PA', TD_XLON: 'L' };
  const suffix = suffixes[quote.exchange || ''];
  // Directory rows can carry a bare local ticker. Never analyze that as a US ADR.
  if (quote.exchange?.startsWith('TD_') && !suffix && !quote.symbol.includes('.')) {
    return `/world-stocks/${encodeURIComponent(quote.symbol)}?region=${encodeURIComponent(quote.exchange)}`;
  }
  const symbol = suffix && !quote.symbol.includes('.') ? `${quote.symbol}.${suffix}` : quote.symbol;
  const params = new URLSearchParams({ assetType: tvAnalysisAssetType(quote), autoRun: '1', source: 'markets-tv' });
  return `/ai-analyst/analyze/${encodeURIComponent(symbol)}?${params}`;
}
