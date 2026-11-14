import type { MarketSearchItem } from '@/lib/market/marketService';
import type { MarketSymbolSearchResult } from '@/lib/market/marketSymbolDirectory';
import { normalizeAssetSearchText } from '@/lib/market/assetAliases';

// Reconciled against the exchange's October 2026 report on 2026-11-14.
// These are listing identities only, never prices or a claim of live coverage.
const SOURCE = 'https://reports.boursakuwait.com.kw/en/indicativefreefloat/10/2026';
const LISTINGS = [
  ['ALG', 'Ali Alghanim Sons Automotive Company', 'شركة أولاد علي الغانم للسيارات'],
  ['BEYOUT', 'Beyout Holding Company', 'شركة بيوت القابضة'],
  ['ALFTAQA', 'Action Energy Company', 'الشركة العملية للطاقة', 'ألف طاقة'],
  ['TROLLEY', 'Trolley General Trading Company', 'شركة ترولي للتجارة العامة', 'ترولي'],
  ['JTC', 'JTC Logistics Transportation & Stevedoring Company', 'شركة جي تي سي لوجستيك للنقليات والمناولة'],
];
const RENAMED: Record<string, string> = { ERESCO: 'ALENMA', KPPC: 'PHC', PAPER: 'SHUAIBA' };
// CMA resolution 153/2026, effective 2026-10-15:
// https://www.cma.gov.kw/en/web/cma/cma-board-releases/-/cmaboardreleases/detail/2010947
const DELISTED = new Set(['DALQANRE']);

export function reconcileKuwaitDirectory(items: MarketSearchItem[], query: string): MarketSearchItem[] {
  const reconciled = items.flatMap(item => {
    if (((item as MarketSymbolSearchResult).exchangeId ?? item.exchange) !== 'BOURSA_KUWAIT') return [item];
    if (DELISTED.has(item.symbol)) return [];
    const symbol = RENAMED[item.symbol];
    return [symbol ? { ...item, symbol, displaySymbol: symbol, providerSymbol: `${symbol}.KW`, aliases: [...(item.aliases ?? []), item.symbol] } : item];
  });
  const needle = normalizeAssetSearchText(query);
  const additions = LISTINGS.filter(row => !needle || normalizeAssetSearchText([...row, `${row[0]}.KW`].join(' ')).includes(needle)).map(([symbol, name, companyNameAr, alias]) => ({
    symbol, displaySymbol: symbol, providerSymbol: `${symbol}.KW`, name, companyNameAr, companyNameEn: name,
    assetType: 'stock' as const, exchange: 'BOURSA_KUWAIT', exchangeId: 'BOURSA_KUWAIT', country: 'KW', currency: 'KWD',
    aliases: [symbol, `${symbol}.KW`, companyNameAr, alias].filter(Boolean),
    source: SOURCE, lastSyncedAt: '2026-11-14',
  }));
  return [...reconciled, ...additions];
}
