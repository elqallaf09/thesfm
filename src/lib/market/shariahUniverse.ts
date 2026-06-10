export type ShariahScreeningStatus = 'compliant' | 'review' | 'non_compliant' | 'unknown';
export type ShariahAssetType = 'stock' | 'etf';

export type ShariahUniverseItem = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  assetType: ShariahAssetType;
  aliases?: string[];
};

export type ShariahScreeningItem = ShariahUniverseItem & {
  shariahStatus: ShariahScreeningStatus;
  statusLabelAr: string;
  reason: { ar: string; en: string; fr: string };
  screeningSource: string | null;
  methodology: { ar: string; en: string; fr: string };
  lastScreenedAt: string | null;
  financialRatios: null;
  notes: { ar: string; en: string; fr: string };
};

export const SHARIAH_SCREENING_SOURCE_CONNECTED = false;

export const SHARIAH_SCREENING_METHOD = {
  ar: 'لم يتم ربط مصدر تصنيف شرعي موثوق بعد. يعرض النظام الأسعار والأخبار من مزودي بيانات السوق، بينما تبقى حالة التصنيف غير مصنفة إلى أن يتوفر مصدر فحص شرعي موثق.',
  en: 'No trusted Sharia screening source is connected yet. The system displays prices and news from market data providers, while classification status remains unclassified until a verified Sharia screening source is available.',
  fr: `Aucune source de filtrage charia fiable n'est encore connectée. Le système affiche les prix et les actualités des fournisseurs de données de marché, tandis que le statut de classification reste non classé jusqu'à ce qu'une source vérifiée soit disponible.`,
};

export const SHARIAH_UNIVERSE: ShariahUniverseItem[] = [
  { symbol: 'AAPL', name: 'Apple', sector: 'technology', industry: 'Consumer electronics', assetType: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'technology', industry: 'Software and cloud', assetType: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'semiconductors', industry: 'Semiconductors and AI infrastructure', assetType: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'technology', industry: 'Internet services', assetType: 'stock', aliases: ['Google'] },
  { symbol: 'META', name: 'Meta Platforms', sector: 'technology', industry: 'Social platforms and digital ads', assetType: 'stock' },
  { symbol: 'TSLA', name: 'Tesla', sector: 'consumer', industry: 'Electric vehicles', assetType: 'stock' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'semiconductors', industry: 'Semiconductors', assetType: 'stock' },
  { symbol: 'ASML', name: 'ASML Holding', sector: 'semiconductors', industry: 'Semiconductor equipment', assetType: 'stock' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor', sector: 'semiconductors', industry: 'Semiconductor foundry', assetType: 'stock' },
  { symbol: 'AVGO', name: 'Broadcom', sector: 'semiconductors', industry: 'Semiconductors and infrastructure software', assetType: 'stock' },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'consumer', industry: 'Consumer staples retail', assetType: 'stock' },
  { symbol: 'WMT', name: 'Walmart', sector: 'consumer', industry: 'Consumer staples retail', assetType: 'stock' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'consumer', industry: 'Consumer staples', assetType: 'stock' },
  { symbol: 'KO', name: 'Coca-Cola', sector: 'consumer', industry: 'Beverages', assetType: 'stock' },
  { symbol: 'PEP', name: 'PepsiCo', sector: 'consumer', industry: 'Beverages and snacks', assetType: 'stock' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'healthcare', industry: 'Healthcare products', assetType: 'stock' },
  { symbol: 'ABBV', name: 'AbbVie', sector: 'healthcare', industry: 'Biopharmaceuticals', assetType: 'stock' },
  { symbol: 'MRK', name: 'Merck', sector: 'healthcare', industry: 'Pharmaceuticals', assetType: 'stock' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'healthcare', industry: 'Managed healthcare', assetType: 'stock' },
  { symbol: 'SPUS', name: 'SP Funds S&P 500 Sharia Industry Exclusions ETF', sector: 'sharia_etf', industry: 'Sharia-screened ETF', assetType: 'etf', aliases: ['SP Funds'] },
  { symbol: 'HLAL', name: 'Wahed FTSE USA Shariah ETF', sector: 'sharia_etf', industry: 'Shariah ETF', assetType: 'etf', aliases: ['Wahed'] },
  { symbol: 'UMMA', name: 'Wahed Dow Jones Islamic World ETF', sector: 'sharia_etf', industry: 'Islamic world ETF', assetType: 'etf', aliases: ['Dow Jones Islamic World'] },
  { symbol: 'SPRE', name: 'SP Funds S&P Global REIT Sharia ETF', sector: 'sharia_etf', industry: 'Sharia REIT ETF', assetType: 'etf' },
  { symbol: 'SPSK', name: 'SP Funds Dow Jones Global Sukuk ETF', sector: 'sharia_etf', industry: 'Sukuk ETF', assetType: 'etf' },
];

export function shariahStatusLabelAr(status: ShariahScreeningStatus) {
  if (status === 'compliant') return 'متوافق';
  if (status === 'review') return 'يحتاج مراجعة';
  if (status === 'non_compliant') return 'غير متوافق';
  return 'غير مصنف';
}

export function buildUnknownShariahScreening(item: ShariahUniverseItem): ShariahScreeningItem {
  return {
    ...item,
    shariahStatus: 'unknown',
    statusLabelAr: shariahStatusLabelAr('unknown'),
    reason: {
      ar: 'لا تتوفر بيانات تصنيف شرعي مؤكدة من مصدر موثوق لهذا الرمز حاليًا.',
      en: 'No verified Sharia classification data is available for this symbol from a trusted source at this time.',
      fr: `Aucune donnée de classification charia vérifiée n'est disponible pour ce symbole depuis une source fiable actuellement.`,
    },
    screeningSource: null,
    methodology: SHARIAH_SCREENING_METHOD,
    lastScreenedAt: null,
    financialRatios: null,
    notes: {
      ar: 'هذه الحالة ليست فتوى ولا تعني توافقًا أو عدم توافق. يلزم الرجوع إلى جهة شرعية موثوقة أو مزود فحص شرعي معتمد.',
      en: 'This status is not a Sharia ruling and does not imply compliance or non-compliance. A qualified Sharia authority or certified screening provider must be consulted.',
      fr: `Ce statut n'est pas une décision charia et n'implique ni conformité ni non-conformité. Une autorité charia qualifiée ou un fournisseur de filtrage certifié doit être consulté.`,
    },
  };
}

export function getShariahScreeningItems() {
  return SHARIAH_UNIVERSE.map(buildUnknownShariahScreening);
}

export function getShariahScreeningCounts(items: ShariahScreeningItem[]) {
  return items.reduce(
    (acc, item) => {
      acc[item.shariahStatus] += 1;
      return acc;
    },
    { compliant: 0, review: 0, non_compliant: 0, unknown: 0 } as Record<ShariahScreeningStatus, number>,
  );
}
