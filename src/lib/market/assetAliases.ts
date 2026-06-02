import type { MarketAssetType } from '@/lib/market/marketService';

export type AssetAlias = {
  aliases: string[];
  symbol: string;
  symbolCandidates: string[];
  nameAr: string;
  nameEn: string;
  marketAr: string;
  marketEn: string;
  assetType: MarketAssetType;
  currency: string;
};

export const assetAliases: AssetAlias[] = [
  {
    aliases: ['بيتك', 'بيت التمويل الكويتي', 'KFH', 'Kuwait Finance House'],
    symbol: 'KFH',
    symbolCandidates: ['KFH.KW', 'KFH', 'KFH:KSE'],
    nameAr: 'بيت التمويل الكويتي',
    nameEn: 'Kuwait Finance House',
    marketAr: 'بورصة الكويت',
    marketEn: 'Boursa Kuwait',
    assetType: 'stock',
    currency: 'KWD',
  },
  {
    aliases: ['وطني', 'بنك الكويت الوطني', 'NBK', 'National Bank of Kuwait'],
    symbol: 'NBK',
    symbolCandidates: ['NBK.KW', 'NBK', 'NBK:KSE'],
    nameAr: 'بنك الكويت الوطني',
    nameEn: 'National Bank of Kuwait',
    marketAr: 'بورصة الكويت',
    marketEn: 'Boursa Kuwait',
    assetType: 'stock',
    currency: 'KWD',
  },
  {
    aliases: ['زين', 'شركة زين', 'شركة الاتصالات المتنقلة زين', 'Zain'],
    symbol: 'ZAIN',
    symbolCandidates: ['ZAIN.KW', 'ZAIN', 'ZAIN:KSE'],
    nameAr: 'شركة الاتصالات المتنقلة زين',
    nameEn: 'Zain',
    marketAr: 'بورصة الكويت',
    marketEn: 'Boursa Kuwait',
    assetType: 'stock',
    currency: 'KWD',
  },
];

export function normalizeAssetSearchText(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s./:-]/gu, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function findAssetAliasMatches(query: unknown) {
  const normalizedQuery = normalizeAssetSearchText(query);
  if (!normalizedQuery) return [];

  return assetAliases.filter(asset => {
    const searchable = [
      asset.symbol,
      asset.nameAr,
      asset.nameEn,
      asset.marketAr,
      asset.marketEn,
      ...asset.aliases,
      ...asset.symbolCandidates,
    ].map(normalizeAssetSearchText);

    return searchable.some(value => value === normalizedQuery
      || value.startsWith(normalizedQuery)
      || normalizedQuery.startsWith(value)
      || value.includes(normalizedQuery));
  });
}
