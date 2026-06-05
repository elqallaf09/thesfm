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
  reason: string;
  screeningSource: string | null;
  methodology: string;
  lastScreenedAt: string | null;
  financialRatios: null;
  notes: string;
};

export const SHARIAH_SCREENING_SOURCE_CONNECTED = false;

export const SHARIAH_SCREENING_METHOD =
  'لم يتم ربط مصدر تصنيف شرعي موثوق بعد. يعرض النظام الأسعار والأخبار من مزودي بيانات السوق، بينما تبقى حالة التصنيف غير مصنفة إلى أن يتوفر مصدر فحص شرعي موثق.';

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
    reason: 'لا تتوفر بيانات تصنيف شرعي مؤكدة من مصدر موثوق لهذا الرمز حاليًا.',
    screeningSource: null,
    methodology: SHARIAH_SCREENING_METHOD,
    lastScreenedAt: null,
    financialRatios: null,
    notes: 'هذه الحالة ليست فتوى ولا تعني توافقًا أو عدم توافق. يلزم الرجوع إلى جهة شرعية موثوقة أو مزود فحص شرعي معتمد.',
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
