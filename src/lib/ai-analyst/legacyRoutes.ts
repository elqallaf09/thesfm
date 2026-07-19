import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';

export type LegacyMarketAnalysisRouteInput = {
  search: string;
  hash?: string;
};

const SYMBOL_PATTERN = /^[A-Za-z0-9.^=:_/-]{1,32}$/;

const LEGACY_TAB_ALIASES: Record<string, string> = {
  overview: 'overview',
  'command-center': 'overview',
  dashboard: 'overview',
  analyze: 'analyze',
  analysis: 'analyze',
  tradertools: 'traderTools',
  'trader-tools': 'traderTools',
  tools: 'traderTools',
  economiccalendar: 'economicCalendar',
  'economic-calendar': 'economicCalendar',
  calendar: 'economicCalendar',
  sessions: 'sessions',
  'trading-sessions': 'sessions',
  technicalanalysis: 'technicalAnalysis',
  'technical-analysis': 'technicalAnalysis',
  technical: 'technicalAnalysis',
  newssentiment: 'newsSentiment',
  'news-sentiment': 'newsSentiment',
  news: 'newsSentiment',
  sentiment: 'newsSentiment',
  watchlist: 'watchlist',
  'market-watchlist': 'watchlist',
  alerts: 'alerts',
  'market-alerts': 'alerts',
  'price-alerts': 'alerts',
  comparison: 'comparison',
  compare: 'comparison',
  assetreport: 'assetReport',
  'asset-report': 'assetReport',
  report: 'assetReport',
};

const SUPPORTED_ASSET_TYPES: readonly IntelligenceAssetType[] = [
  'STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND',
];

const SUPPORTED_HORIZONS: readonly IntelligenceHorizon[] = [
  'INTRADAY', 'SHORT_TERM', 'SWING', 'POSITION', 'LONG_TERM',
];

function normalizedSearch(search: string) {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

function validSymbol(value: string | null) {
  const symbol = String(value ?? '').trim().toUpperCase();
  const unsafePathLikeValue = symbol.startsWith('/') || symbol.endsWith('/') || symbol.includes('//') || symbol.includes('..');
  return SYMBOL_PATTERN.test(symbol) && !unsafePathLikeValue ? symbol : null;
}

/** Canonical route-level validation shared by the client picker and server aliases. */
export function normalizeAiAnalystSymbol(value: string | null | undefined): string | null {
  return validSymbol(value ?? null);
}

export function normalizeAiAnalystAssetType(value: string | null | undefined): IntelligenceAssetType {
  const normalized = String(value ?? '').trim().toUpperCase();
  if ((SUPPORTED_ASSET_TYPES as readonly string[]).includes(normalized)) return normalized as IntelligenceAssetType;
  if (normalized === 'ETF') return 'FUND';
  if (normalized === 'GOLD') return 'COMMODITY';
  if (normalized === 'STOCKS') return 'STOCK';
  if (normalized === 'INDICES') return 'INDEX';
  if (normalized === 'METALS') return 'COMMODITY';
  return 'STOCK';
}

export function normalizeAiAnalystHorizon(value: string | null | undefined): IntelligenceHorizon {
  const normalized = String(value ?? '').trim().toUpperCase();
  if ((SUPPORTED_HORIZONS as readonly string[]).includes(normalized)) return normalized as IntelligenceHorizon;
  if (normalized === '1D') return 'INTRADAY';
  if (normalized === '1W') return 'SHORT_TERM';
  if (normalized === '1M') return 'SWING';
  if (normalized === '1Y') return 'POSITION';
  if (normalized === 'ALL' || normalized === 'MAX') return 'LONG_TERM';
  return 'SWING';
}

function normalizeLegacyTab(value: string | null | undefined) {
  const raw = String(value ?? '').trim().replace(/^#/, '').toLowerCase();
  return LEGACY_TAB_ALIASES[raw] ?? null;
}

function querySuffix(params: URLSearchParams) {
  const value = params.toString();
  return value ? `?${value}` : '';
}

function sharedAssetParams(params: URLSearchParams, symbol: string) {
  const output = new URLSearchParams();
  output.set('assetType', normalizeAiAnalystAssetType(params.get('assetType')));
  output.set('horizon', normalizeAiAnalystHorizon(params.get('horizon') ?? params.get('range') ?? params.get('timeframe')));
  if (params.get('autoRun') === '1') output.set('autoRun', '1');
  return { output, symbol };
}

/**
 * Centralizes legacy route migration. It deliberately maps old tools to the
 * hidden compatibility view rather than discarding working watchlist, alert,
 * calendar, or report flows while they are progressively absorbed.
 */
export function mapLegacyMarketAnalysisRoute({ search, hash = '' }: LegacyMarketAnalysisRouteInput): string {
  const params = normalizedSearch(search);
  const symbol = validSymbol(params.get('symbol'));
  const hasTabParameter = Boolean(params.get('tab'));
  const tab = normalizeLegacyTab(params.get('tab')) ?? normalizeLegacyTab(hash);

  if (symbol && ((!hasTabParameter && !hash) || tab === 'analyze')) {
    const { output } = sharedAssetParams(params, symbol);
    return `/ai-analyst/analyze/${encodeURIComponent(symbol)}${querySuffix(output)}`;
  }

  if (!symbol && !tab) return '/ai-analyst/overview';
  if (!symbol && tab === 'overview') return '/ai-analyst/overview';

  const output = new URLSearchParams();
  output.set('legacy', 'market');
  output.set('tab', tab ?? 'overview');
  if (symbol) {
    const asset = sharedAssetParams(params, symbol);
    output.set('symbol', asset.symbol);
    for (const [key, value] of asset.output.entries()) output.set(key, value);
  }
  return `/ai-analyst/overview${querySuffix(output)}`;
}

export function mapLegacyMarketAgentRoute({ search }: Pick<LegacyMarketAnalysisRouteInput, 'search'>): string {
  const params = normalizedSearch(search);
  const symbol = validSymbol(params.get('symbol'));
  if (!symbol) return '/ai-analyst/agent';
  const { output } = sharedAssetParams(params, symbol);
  output.set('symbol', symbol);
  return `/ai-analyst/agent${querySuffix(output)}`;
}

export function mapLegacySymbolDetailsRoute(symbolValue: string): string {
  const symbol = validSymbol(symbolValue);
  return symbol
    ? `/ai-analyst/analyze/${encodeURIComponent(symbol)}?assetType=STOCK&horizon=SWING`
    : '/ai-analyst/overview';
}
