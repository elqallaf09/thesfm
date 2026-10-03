import 'server-only';

import { createServerSupabaseAdmin } from './adminAccess';
import { publicCatalogItem, type CatalogRow } from '@/lib/sharia-research/publicCatalog';
import { SHARIAH_UNIVERSE } from '@/lib/market/shariahUniverse';
import { shariahUniverseIdentity } from '@/lib/market/shariahUniverseIdentity';
import { boubyanSecurityKey, normalizeBoubyanCompanyName } from '@/lib/market/boubyanReference';
import { publishedShariahFundCatalogItem } from '@/lib/market/shariahPublishedFundProfiles';

export type PublicShariahCatalogItem = ReturnType<typeof publicCatalogItem>;
type CatalogStorage = 'available' | 'unavailable' | 'error';
const COLUMNS = 'id,symbol,provider_symbol,name,asset_type,exchange,country,sector,shariah_status,shariah_source,shariah_reason,shariah_last_reviewed_at,shariah_manual_override,shariah_screening_data';
const universeBySymbol = new Map(SHARIAH_UNIVERSE.map(item => [item.symbol, item]));

function withPublishedFund(row: CatalogRow, item: PublicShariahCatalogItem, now: Date): PublicShariahCatalogItem {
  if (row.asset_type !== 'etf' || row.shariah_manual_override || row.shariah_status === 'non_compliant'
    || item.publishedShariahReference || item.publishedShariahDesignation) return item;
  const universe = universeBySymbol.get(row.symbol.toUpperCase());
  if (!universe || universe.assetType !== 'etf') return item;
  const known = shariahUniverseIdentity(universe.symbol);
  const actualKey = boubyanSecurityKey({ ...row, assetType: row.asset_type, providerSymbol: row.provider_symbol });
  if (!known || !actualKey || actualKey !== boubyanSecurityKey(known)
    || normalizeBoubyanCompanyName(row.name) !== normalizeBoubyanCompanyName(known.name)) return item;
  const published = publishedShariahFundCatalogItem(universe, now);
  return published ? {
    ...item,
    ...published,
    name: item.name || published.name,
    sector: item.sector || published.sector,
    exchange: item.exchange ?? published.exchange,
  } : item;
}

/** No raw publication row becomes a stock merely because it appears in a PDF. */
export function mergeShariahPublicCatalog(rows: readonly CatalogRow[], now = new Date()) {
  const items = rows.map(row => withPublishedFund(row, publicCatalogItem(row, now), now));
  const present = new Set(items.map(item => item.canonicalSecurityId).filter(Boolean));
  const unresolvedSymbols = new Set(items.filter(item => !item.canonicalSecurityId).map(item => item.symbol.toUpperCase()));
  for (const universe of SHARIAH_UNIVERSE) {
    const identity = shariahUniverseIdentity(universe.symbol);
    if (!identity) continue;
    const key = boubyanSecurityKey(identity);
    if (!key || present.has(key) || unresolvedSymbols.has(universe.symbol.toUpperCase())) continue;
    const row: CatalogRow = {
      symbol: identity.symbol,
      provider_symbol: identity.providerSymbol,
      name: identity.name,
      asset_type: identity.assetType,
      exchange: identity.exchange,
      country: identity.country,
      sector: universe.sector,
    };
    const item = withPublishedFund(row, publicCatalogItem(row, now), now);
    if (!item.publishedShariahReference && !item.fundReview) continue;
    items.push(item);
    present.add(key);
  }
  return items;
}

const unresolvedCatalogReason = {
  ar: 'تعذر ربط قرار الكتالوج بهوية ورقة مالية واحدة وبورصة محددة؛ يحتاج التصنيف إلى مراجعة.',
  en: 'The catalog decision cannot be linked to one exact security and exchange; review is required.',
  fr: 'La décision du catalogue ne peut pas être rattachée à un titre et une place boursière uniques ; un examen est nécessaire.',
};

export function shariahUniverseCatalogItem(
  symbol: string,
  items: readonly PublicShariahCatalogItem[],
  now = new Date(),
  exchange?: string,
): PublicShariahCatalogItem | null {
  const identity = shariahUniverseIdentity(symbol);
  const universe = universeBySymbol.get(symbol.toUpperCase());
  if (!identity || !universe) return null;
  const row: CatalogRow = { symbol: identity.symbol, provider_symbol: identity.providerSymbol,
    name: identity.name, asset_type: identity.assetType, exchange: exchange ?? identity.exchange,
    country: identity.country, sector: universe.sector };
  const key = boubyanSecurityKey({ ...identity, exchange: row.exchange });
  const matches = key ? items.filter(item => item.canonicalSecurityId === key) : [];
  if (matches.length === 1) return matches[0];
  const fallback = withPublishedFund(row, publicCatalogItem(row, now), now);
  // An unresolved stored decision must not be bypassed with a ticker-only
  // reference fallback, including when it may contain a manual override.
  if (matches.length > 1 || items.some(item => !item.canonicalSecurityId && item.symbol.toUpperCase() === symbol.toUpperCase())) {
    return { ...fallback, shariahStatus: 'needs_review', statusLabelAr: 'يحتاج مراجعة',
      reason: unresolvedCatalogReason, notes: unresolvedCatalogReason };
  }
  return fallback;
}

/** Public reads share one decision path; no source review writes market_symbols. */
export async function loadShariahPublicCatalog(options: { scope?: 'all' | 'universe'; now?: Date } = {}) {
  const now = options.now ?? new Date();
  const admin = createServerSupabaseAdmin();
  const rows: CatalogRow[] = [];
  let storage: CatalogStorage = admin ? 'available' : 'unavailable';
  if (admin) {
    try {
      for (let offset = 0; ; offset += 1000) {
        let query = admin.from('market_symbols').select(COLUMNS)
          .eq('is_active', true).in('asset_type', ['stock', 'etf']);
        if (options.scope === 'universe') query = query.in('symbol', SHARIAH_UNIVERSE.map(item => item.symbol));
        const result = await query.order('id').range(offset, offset + 999);
        if (result.error) throw new Error('CATALOG_READ_FAILED');
        rows.push(...(result.data ?? []) as CatalogRow[]);
        if ((result.data?.length ?? 0) < 1000) break;
      }
    } catch {
      storage = 'error';
    }
  }
  return {
    items: mergeShariahPublicCatalog(rows, now),
    storage: {
      state: storage,
      complete: storage === 'available',
      manualOverridesChecked: storage === 'available',
      loadedRows: rows.length,
    },
  };
}
