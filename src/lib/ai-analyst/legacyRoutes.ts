import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { mergeClientHash, resolveInternalDestination } from '@/lib/auth/redirects';

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

const LEGACY_HASH_PROBE_PATH = '/ai-analyst';

type CanonicalLegacySection = 'alerts' | 'watchlist';

const CANONICAL_SECTION_PATHS: Record<CanonicalLegacySection, string> = {
  alerts: '/ai-analyst/alerts',
  watchlist: '/ai-analyst/watchlist',
};

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
  // Reuse the login redirect fragment policy so a legacy compatibility route
  // cannot move OAuth/recovery credentials into an application destination.
  const destination = mergeClientHash(LEGACY_HASH_PROBE_PATH, hash, LEGACY_HASH_PROBE_PATH);
  return destination === LEGACY_HASH_PROBE_PATH
    ? ''
    : destination.slice(LEGACY_HASH_PROBE_PATH.length);
}

function preservedMarketAnalysisHash(hash: string) {
  return normalizeLegacyTab(hash) ? '' : preservedHash(hash);
}

/**
 * Preserves non-routing context while moving a legacy section to its direct
 * canonical child route. `tab` and `legacy` are intentionally consumed by
 * the mapper, and redirect controls remain fail-closed.
 */
function appendSafeSectionContext(params: URLSearchParams, output: URLSearchParams) {
  for (const [key, value] of params.entries()) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === 'tab' || normalizedKey === 'legacy') continue;
    if (UNSAFE_REDIRECT_QUERY_KEYS.has(normalizedKey)) continue;
    if (INTERNAL_RETURN_QUERY_KEYS.has(normalizedKey) && !isSafeInternalNavigationValue(value)) continue;
    output.append(key, value);
  }
}

function canonicalSectionDestination(
  section: CanonicalLegacySection,
  { search, hash = '' }: LegacyMarketAnalysisRouteInput,
) {
  const output = new URLSearchParams();
  appendSafeSectionContext(normalizedSearch(search), output);
  return `${CANONICAL_SECTION_PATHS[section]}${querySuffix(output)}${preservedHash(hash)}`;
}

/** Maps direct legacy personal-tool aliases without relying on hidden tabs. */
export function mapLegacyAiAnalystSectionRoute(
  section: CanonicalLegacySection,
  input: LegacyMarketAnalysisRouteInput,
): string {
  return canonicalSectionDestination(section, input);
}

/**
 * Centralizes legacy route migration. Completed capabilities map directly to
 * their canonical child routes; only trader tools without a data-only parity
 * surface retain an explicit temporary compatibility intent.
 */
export function mapLegacyMarketAnalysisRoute({ search, hash = '' }: LegacyMarketAnalysisRouteInput): string {
  const params = normalizedSearch(search);
  const symbol = validSymbol(params.get('symbol'));
  const hasTabParameter = Boolean(params.get('tab'));
  const tab = normalizeLegacyTab(params.get('tab')) ?? normalizeLegacyTab(hash);

  if (symbol && (!hasTabParameter && !tab)) {
    const { output } = sharedAssetParams(params, symbol);
    appendSafeLegacyContext(params, output);
    return `/ai-analyst/analyze/${encodeURIComponent(symbol)}${querySuffix(output)}${preservedMarketAnalysisHash(hash)}`;
  }

  if (symbol && (tab === 'analyze' || tab === 'technicalAnalysis' || tab === 'assetReport')) {
    const { output } = sharedAssetParams(params, symbol);
    appendSafeLegacyContext(params, output);
    return `/ai-analyst/analyze/${encodeURIComponent(symbol)}${querySuffix(output)}${preservedMarketAnalysisHash(hash)}`;
  }

  if (tab === 'watchlist') return canonicalSectionDestination('watchlist', { search, hash: preservedMarketAnalysisHash(hash) });
  if (tab === 'alerts') return canonicalSectionDestination('alerts', { search, hash: preservedMarketAnalysisHash(hash) });

  const directTabDestinations: Partial<Record<NonNullable<typeof tab>, string>> = {
    overview: '/ai-analyst/market-leadership',
    analyze: '/ai-analyst/analyze',
    technicalAnalysis: '/ai-analyst/analyze',
    assetReport: '/ai-analyst/analyze',
    economicCalendar: '/ai-analyst/calendar',
    sessions: '/ai-analyst/markets/sessions',
    newsSentiment: '/ai-analyst/news',
    comparison: '/ai-analyst/compare',
  };

  if (tab && tab !== 'traderTools') {
    const output = new URLSearchParams();
    appendSafeSectionContext(params, output);
    return `${directTabDestinations[tab] ?? '/ai-analyst/market-leadership'}${querySuffix(output)}${preservedMarketAnalysisHash(hash)}`;
  }

  if (!tab) {
    const output = new URLSearchParams();
    appendSafeSectionContext(params, output);
    return `/ai-analyst/market-leadership${querySuffix(output)}${preservedMarketAnalysisHash(hash)}`;
  }

  // Trader tools have no equivalent public, data-only surface yet. Keep the
  // compatibility intent explicit rather than redirecting users to an
  // unrelated destination. The legacy workspace itself remains temporary.
  const output = new URLSearchParams();
  output.set('legacy', 'market');
  output.set('tab', 'traderTools');
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
  } else {
    if (params.has('assetType')) output.set('assetType', normalizeAiAnalystAssetType(params.get('assetType')));
    if (params.has('horizon') || params.has('range') || params.has('timeframe')) {
      output.set('horizon', normalizeAiAnalystHorizon(params.get('horizon') ?? params.get('range') ?? params.get('timeframe')));
    }
    if (params.get('autoRun') === '1') output.set('autoRun', '1');
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
