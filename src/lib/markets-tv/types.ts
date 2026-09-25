export type TvLanguage = 'ar' | 'en' | 'fr';
export type TvGroup = 'world' | 'global' | 'us' | 'gulf' | 'europe' | 'asia' | 'crypto' | 'forex' | 'commodities' | 'watchlist';
export type TvView = 'markets' | 'map' | 'sessions' | 'brief';
export type TvSettings = {
  language: TvLanguage; theme: 'dark' | 'light'; layout: 'balanced' | 'quotes';
  groups: TvGroup[]; autoRotate: boolean; rotationSeconds: number; ticker: boolean; sound: boolean;
  marketIds?: string[]; stripDensity?: 'comfortable' | 'balanced' | 'compact'; stripSpeed?: number;
  pricedOnly?: boolean; autoHideControls?: boolean; marketSpeeds?: Record<string, number>;
};
export type TvQuote = {
  symbol: string; displaySymbol?: string; name: string; nameAr: string; currency: string | null; price: number | null;
  changePercent: number | null; source: string | null; observedAt: string | null; receivedAt: string | null;
  status: 'available' | 'delayed' | 'stale' | 'reference' | 'unknown_time' | 'unavailable';
  exchange: string | null; country: string | null;
};
export type TvMarket = { id: string; group: TvGroup; labelAr: string; labelEn: string; labelFr: string; count: number; status: string };
export type TvSnapshot = { page?: number; pageSize?: number; directoryTotal?: number; market?: string;  group: TvGroup; quotes: TvQuote[]; generatedAt: string; available: number; total: number; };
export type TvNews = { id: string; title: string; source: string; publishedAt: string; url: string };
export type TvDevice = { id: string; name: string; expiresAt: string; settings: TvSettings; };
export type TvAlert = { id: string; symbol: string; alert_type: string; threshold: number; currency: string | null; status: string };
export const TV_GROUPS: TvGroup[] = ['world', 'global', 'us', 'gulf', 'europe', 'asia', 'crypto', 'forex', 'commodities', 'watchlist'];
export const TV_STRIP_SPEEDS = [36, 56, 80] as const;
export const DEFAULT_TV_STRIP_SPEED = TV_STRIP_SPEEDS[1];
export const DEFAULT_TV_SETTINGS: TvSettings = {
  language: 'ar', theme: 'dark', layout: 'balanced', groups: ['world', 'global', 'gulf', 'us', 'europe', 'asia', 'crypto', 'forex', 'commodities'],
  autoRotate: false, rotationSeconds: 30, ticker: true, sound: false, stripSpeed: DEFAULT_TV_STRIP_SPEED,
  stripDensity: 'balanced', pricedOnly: false, autoHideControls: false,
};
export function normalizeTvSettings(value: unknown): TvSettings {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const groups = Array.isArray(row.groups) ? [...new Set(row.groups.filter((g): g is TvGroup => TV_GROUPS.includes(g as TvGroup)))] : [];
  // Preserve the chosen slow/normal/fast preset for existing TVs.
  const oldSpeedIndex = [20, 32, 44].indexOf(Number(row.stripSpeed));
  const stripSpeed = oldSpeedIndex >= 0 ? TV_STRIP_SPEEDS[oldSpeedIndex] : TV_STRIP_SPEEDS.find(speed => speed === Number(row.stripSpeed)) ?? DEFAULT_TV_STRIP_SPEED;
  const marketSpeeds: Record<string, number> = {};
  if (row.marketSpeeds && typeof row.marketSpeeds === 'object' && !Array.isArray(row.marketSpeeds)) {
    for (const [market, speed] of Object.entries(row.marketSpeeds).slice(0, 150)) {
      if (/^[A-Za-z0-9_]{1,32}$/.test(market) && !['__proto__', 'constructor', 'prototype'].includes(market)
        && TV_STRIP_SPEEDS.some(value => value === speed)) marketSpeeds[market] = speed as number;
    }
  }
  return {
    language: row.language === 'en' || row.language === 'fr' ? row.language : 'ar',
    theme: row.theme === 'light' ? 'light' : 'dark', layout: row.layout === 'quotes' ? 'quotes' : 'balanced',
    groups: groups.length ? groups : [...DEFAULT_TV_SETTINGS.groups], autoRotate: row.autoRotate === true,
    rotationSeconds: [20, 30, 60, 120].includes(Number(row.rotationSeconds)) ? Number(row.rotationSeconds) : 30,
    ticker: row.ticker !== false, sound: row.sound === true,
    marketIds: Array.isArray(row.marketIds) ? [...new Set(row.marketIds.filter((id): id is string => typeof id === 'string' && /^[A-Za-z0-9_]{1,32}$/.test(id)))].slice(0, 150) : undefined,
    stripDensity: row.stripDensity === 'compact' || row.stripDensity === 'comfortable' ? row.stripDensity : 'balanced',
    stripSpeed, marketSpeeds, pricedOnly: row.pricedOnly === true, autoHideControls: row.autoHideControls === true,
  };
}
