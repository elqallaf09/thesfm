import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { resolveInternalDestination } from '@/lib/auth/redirects';

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

const CANONICAL_ASSET_QUERY_KEYS = new Set([
  'symbol', 'assettype', 'horizon', 'range', 'timeframe', 'autorun', 'tab', 'legacy',
]);

const UNSAFE_REDIRECT_QUERY_KEYS = new Set([
  'next', 'redirect', 'redirectto', 'redirecturl', 'callback', 'callbackurl',
  'continue', 'continueurl', 'destination',
]);

const INTERNAL_RETURN_QUERY_KEYS = new Set([
  'return', 'returnto', 'returnurl',
]);

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

function isSafeInternalNavigationValue(value: string) {
  return Boolean(resolveInternalDestination(value));
}

/**
 * Preserve opaque legacy query context after moving to a canonical AI Analyst
 * route. Navigation-control values are kept only when they remain internal,
 * so canonicalization cannot introduce an open redirect.
 */
function appendSafeLegacyContext(params: URLSearchParams, output: URLSearchParams) {
  for (const [key, value] of params.entries()) {
    const normalizedKey = key.toLowerCase();
    if (CANONICAL_ASSET_QUERY_KEYS.has(normalizedKey)) continue;
    if (UNSAFE_REDIRECT_QUERY_KEYS.has(normalizedKey)) continue;
    if (INTERNAL_RETURN_QUERY_KEYS.has(normalizedKey) && !isSafeInternalNavigationValue(value)) continue;
    output.append(key, value);
  }
}

function preservedHash(hash: string) {
  return hash;
}

function preservedMarketAnalysisHash(hash: string) {
  return normalizeLegacyTab(hash) ? '' : preservedHash(hash);
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
    appendSafeLegacyContext(params, output);
    return `/ai-analyst/analyze/${encodeURIComponent(symbol)}${querySuffix(output)}${preservedMarketAnalysisHash(hash)}`;
  }

  if (symbol && !hasTabParameter && !tab) {
    const { output } = sharedAssetParams(params, symbol);
    appendSafeLegacyContext(params, output);
    return `/ai-analyst/analyze/${encodeURIComponent(symbol)}${querySuffix(output)}${preservedMarketAnalysisHash(hash)}`;
  }

  if (!symbol && !tab) {
    const output = new URLSearchParams();
    appendSafeLegacyContext(params, output);
    return `/ai-analyst/overview${querySuffix(output)}${preservedMarketAnalysisHash(hash)}`;
  }

  if (!symbol && tab === 'overview') {
    const output = new URLSearchParams();
    appendSafeLegacyContext(params, output);
    return `/ai-analyst/overview${querySuffix(output)}${preservedMarketAnalysisHash(hash)}`;
  }

  const output = new URLSearchParams();
  output.set('legacy', 'market');
  output.set('tab', tab ?? 'overview');
  if (symbol) {
    const asset = sharedAssetParams(params, symbol);
    output.set('symbol', asset.symbol);
    for (const [key, value] of asset.output.entries()) output.set(key, value);
  }
  appendSafeLegacyContext(params, output);
  return `/ai-analyst/overview${querySuffix(output)}${preservedMarketAnalysisHash(hash)}`;
}

export function mapLegacyMarketAgentRoute({ search, hash = '' }: LegacyMarketAnalysisRouteInput): string {
  const params = normalizedSearch(search);
  const symbol = validSymbol(params.get('symbol'));
  const output = new URLSearchParams();
  if (symbol) {
    const asset = sharedAssetParams(params, symbol);
    for (const [key, value] of asset.output.entries()) output.set(key, value);
    output.set('symbol', symbol);
  }
  appendSafeLegacyContext(params, output);
  return `/ai-analyst/agent${querySuffix(output)}${preservedHash(hash)}`;
}

export function mapLegacySymbolDetailsRoute(
  symbolValue: string,
  { search = '', hash = '' }: Partial<LegacyMarketAnalysisRouteInput> = {},
): string {
  const symbol = validSymbol(symbolValue);
  if (!symbol) return '/ai-analyst/overview';
  const params = normalizedSearch(search);
  const { output } = sharedAssetParams(params, symbol);
  appendSafeLegacyContext(params, output);
  return `/ai-analyst/analyze/${encodeURIComponent(symbol)}${querySuffix(output)}${preservedHash(hash)}`;
}
