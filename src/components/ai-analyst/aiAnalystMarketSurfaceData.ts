export type AiAnalystMarketSurfaceLocale = 'ar' | 'en' | 'fr';

export type AiAnalystMarketSurfaceStatus =
  | 'loading'
  | 'available'
  | 'partial'
  | 'stale'
  | 'unavailable';

export type AiAnalystDirectoryAssetType =
  | 'STOCK'
  | 'CRYPTO'
  | 'FOREX'
  | 'INDEX'
  | 'COMMODITY'
  | 'FUND';

export type AiAnalystMarketDirectoryAsset = Readonly<{
  symbol: string;
  name: string | null;
  assetType: AiAnalystDirectoryAssetType;
  exchange: string | null;
  currency: string | null;
  market: string | null;
  source: string | null;
}>;

export type AiAnalystMarketDirectoryGroup = Readonly<{
  id: string;
  arabicName: string | null;
  englishName: string | null;
  family: string | null;
  currency: string | null;
  source: string | null;
  totalSymbols: number | null;
}>;

export type AiAnalystMarketDirectory = Readonly<{
  status: AiAnalystMarketSurfaceStatus;
  assets: readonly AiAnalystMarketDirectoryAsset[];
  groups: readonly AiAnalystMarketDirectoryGroup[];
  total: number | null;
  dataAsOf: string | null;
}>;

export type AiAnalystNewsStory = Readonly<{
  id: string;
  title: string;
  summary: string | null;
  sourceName: string | null;
  publishedAt: string | null;
  url: string | null;
  official: boolean;
}>;

export type AiAnalystNewsFeed = Readonly<{
  status: AiAnalystMarketSurfaceStatus;
  stories: readonly AiAnalystNewsStory[];
  dataAsOf: string | null;
}>;

type UnknownRecord = Record<string, unknown>;

const SYMBOL_PATTERN = /^[A-Z0-9.^=:-]{1,32}$/;
const DIRECTORY_GROUP_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const SAFE_TEXT_MAX = 180;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function text(value: unknown, max = SAFE_TEXT_MAX): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, max) : null;
}

function finiteInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : null;
}

function timestamp(value: unknown): string | null {
  const candidate = text(value, 64);
  return candidate && Number.isFinite(Date.parse(candidate)) ? candidate : null;
}

function isSafePathSymbol(value: string): boolean {
  return SYMBOL_PATTERN.test(value) && !value.includes('..');
}

export function aiAnalystMarketSurfaceLocale(language: string | null | undefined): AiAnalystMarketSurfaceLocale {
  return language === 'en' || language === 'fr' ? language : 'ar';
}

export function normalizeAiAnalystDirectoryAssetType(value: unknown): AiAnalystDirectoryAssetType {
  const type = String(value ?? '').trim().toUpperCase();
  if (type === 'CRYPTO') return 'CRYPTO';
  if (type === 'FOREX' || type === 'FX') return 'FOREX';
  if (type === 'INDEX' || type === 'INDICES') return 'INDEX';
  if (type === 'COMMODITY' || type === 'GOLD' || type === 'SILVER' || type === 'OIL' || type === 'GAS') return 'COMMODITY';
  if (type === 'FUND' || type === 'ETF' || type === 'ETFS') return 'FUND';
  return 'STOCK';
}

export function normalizeAiAnalystMarketDirectoryPayload(payload: unknown): AiAnalystMarketDirectory {
  const root = record(payload);
  const envelope = record(root?.envelope);
  const pagination = record(root?.pagination);
  const rawAssets = Array.isArray(root?.markets) ? root.markets : [];
  const rawGroups = Array.isArray(root?.groups) ? root.groups : [];

  const assets = rawAssets.flatMap((item): AiAnalystMarketDirectoryAsset[] => {
    const row = record(item);
    const symbol = text(row?.displaySymbol ?? row?.symbol, 32)?.toUpperCase();
    if (!symbol || !isSafePathSymbol(symbol)) return [];
    const currency = text(row?.currency, 3)?.toUpperCase();
    return [{
      symbol,
      name: text(row?.displayName ?? row?.name),
      assetType: normalizeAiAnalystDirectoryAssetType(row?.assetType),
      exchange: text(row?.exchange, 80),
      currency: currency && CURRENCY_PATTERN.test(currency) ? currency : null,
      market: text(row?.marketName ?? row?.market, 100),
      source: text(row?.source, 100),
    }];
  });

  const groups = rawGroups.flatMap((item): AiAnalystMarketDirectoryGroup[] => {
    const row = record(item);
    const id = text(row?.id, 64);
    if (!id || !DIRECTORY_GROUP_PATTERN.test(id)) return [];
    const currency = text(row?.currency, 3)?.toUpperCase();
    return [{
      id,
      arabicName: text(row?.ar, 120),
      englishName: text(row?.en, 120),
      family: text(row?.family, 100),
      currency: currency && CURRENCY_PATTERN.test(currency) ? currency : null,
      source: text(row?.source, 100),
      totalSymbols: finiteInteger(row?.totalSymbols),
    }];
  });

  const rootStatus = text(root?.status, 32)?.toLowerCase();
  const responseStatus = text(envelope?.status, 32)?.toLowerCase() ?? rootStatus;
  const stale = root?.stale === true || envelope?.freshness && record(envelope.freshness)?.isStale === true;
  const partial = responseStatus === 'partial' || responseStatus === 'degraded' || root?.partialFailure === true;
  const empty = responseStatus === 'empty' || rootStatus === 'empty';
  const unavailable = (!empty && (root?.ok === false || root?.success === false))
    || responseStatus === 'unavailable'
    || responseStatus === 'error'
    || rootStatus === 'provider_error'
    || rootStatus === 'rate_limited'
    || rootStatus === 'unauthorized'
    || rootStatus === 'not_configured';
  const status: AiAnalystMarketSurfaceStatus = stale
    ? 'stale'
    : unavailable
      ? 'unavailable'
      : partial
        ? 'partial'
        : assets.length > 0 || groups.length > 0
          ? 'available'
          : 'unavailable';

  return {
    status,
    assets,
    groups,
    total: finiteInteger(pagination?.total),
    dataAsOf: timestamp(record(envelope?.freshness)?.asOf ?? root?.updatedAt ?? root?.updated_at),
  };
}

export function normalizeAiAnalystNewsPayload(payload: unknown): AiAnalystNewsFeed {
  const root = record(payload);
  const rawStories = Array.isArray(root?.items) ? root.items : Array.isArray(root?.stories) ? root.stories : [];
  const stories = rawStories.flatMap((item): AiAnalystNewsStory[] => {
    const row = record(item);
    const title = text(row?.title ?? row?.headline, 280);
    if (!title) return [];
    const id = text(row?.id, 120) ?? `${title}-${text(row?.publishedAt ?? row?.published_at, 64) ?? 'undated'}`;
    const candidateUrl = text(row?.originalUrl ?? row?.url, 2_000);
    return [{
      id,
      title,
      summary: text(row?.summary ?? row?.description, 900),
      sourceName: text(row?.sourceName ?? row?.source, 140),
      publishedAt: timestamp(row?.publishedAt ?? row?.published_at),
      url: isSafeAiAnalystExternalUrl(candidateUrl) ? candidateUrl : null,
      official: row?.isOfficial === true,
    }];
  });

  const rawStatus = text(root?.status, 32)?.toLowerCase();
  const stale = root?.stale === true;
  const partial = root?.partialFailure === true || rawStatus === 'degraded' || rawStatus === 'partial';
  const unavailable = root?.ok === false || root?.success === false || rawStatus === 'unavailable';
  const status: AiAnalystMarketSurfaceStatus = stale
    ? 'stale'
    : unavailable
      ? 'unavailable'
      : partial
        ? 'partial'
        : stories.length > 0
          ? 'available'
          : 'unavailable';

  return {
    status,
    stories,
    dataAsOf: timestamp(root?.lastUpdated ?? root?.updated_at ?? root?.lastSuccessfulUpdate),
  };
}

export function isSafeAiAnalystExternalUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function aiAnalystMarketAnalysisHref(symbol: string, assetType: AiAnalystDirectoryAssetType): string | null {
  const normalizedSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!isSafePathSymbol(normalizedSymbol)) return null;
  return `/ai-analyst/analyze/${encodeURIComponent(normalizedSymbol)}?assetType=${assetType}`;
}

export function aiAnalystMarketDirectoryUrl(options: Readonly<{ query?: string; assetType?: string; page?: number }> = {}): string {
  const params = new URLSearchParams({ limit: '24', quality: 'complete' });
  const query = text(options.query, 64);
  if (query && /^[A-Za-z0-9 .:^=/_-]+$/.test(query)) params.set('q', query);
  const assetType = text(options.assetType, 24)?.toLowerCase();
  if (assetType && ['stock', 'crypto', 'forex', 'index', 'commodity', 'fund', 'etf'].includes(assetType)) {
    params.set('assetType', assetType);
  }
  if (typeof options.page === 'number' && Number.isInteger(options.page) && options.page > 1 && options.page <= 10_000) {
    params.set('page', String(options.page));
  }
  return `/api/markets?${params.toString()}`;
}

export function aiAnalystNewsUrl(locale: AiAnalystMarketSurfaceLocale): string {
  const params = new URLSearchParams({ scope: 'general', limit: '12', lang: locale });
  return `/api/market-news?${params.toString()}`;
}
