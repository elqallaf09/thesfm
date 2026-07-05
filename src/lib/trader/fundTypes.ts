import type { ShariahStatus } from '@/lib/market/shariah-screening';

export type TraderFundType =
  | 'fund'
  | 'etf'
  | 'mutual_fund'
  | 'index_fund'
  | 'money_market_fund'
  | 'bond_fund'
  | 'sukuk_fund'
  | 'reit'
  | 'commodity_fund'
  | 'sector_fund'
  | 'thematic_fund'
  | 'shariah_compliant_fund'
  | 'leveraged_etf'
  | 'inverse_etf'
  | 'income_fund'
  | 'growth_fund'
  | 'balanced_fund'
  | 'hedge_fund';

export type TraderFundStructure = 'etf' | 'mutual_fund' | 'listed_fund' | 'reit' | 'unknown';

export type TraderFundFilter =
  | 'all'
  | 'etf'
  | 'mutual_fund'
  | 'index_fund'
  | 'money_market_fund'
  | 'bond_sukuk_fund'
  | 'reit'
  | 'commodity_fund'
  | 'sector_fund'
  | 'thematic_fund'
  | 'shariah_fund'
  | 'leveraged_etf'
  | 'inverse_etf'
  | 'income_fund'
  | 'growth_fund'
  | 'balanced_fund'
  | 'hedge_fund';

export const TRADER_FUND_TYPE_LABELS: Record<TraderFundType, { ar: string; en: string }> = {
  fund: { ar: 'صندوق استثماري', en: 'Fund' },
  etf: { ar: 'الصناديق المتداولة', en: 'Exchange Traded Funds' },
  mutual_fund: { ar: 'الصناديق الاستثمارية المشتركة', en: 'Mutual Funds' },
  index_fund: { ar: 'صناديق المؤشرات', en: 'Index Funds' },
  money_market_fund: { ar: 'صناديق سوق النقد', en: 'Money Market Funds' },
  bond_fund: { ar: 'صناديق السندات والصكوك', en: 'Bond Funds' },
  sukuk_fund: { ar: 'صناديق الصكوك', en: 'Sukuk Funds' },
  reit: { ar: 'صناديق الاستثمار العقاري', en: 'Real Estate Investment Trusts' },
  commodity_fund: { ar: 'صناديق السلع', en: 'Commodity Funds' },
  sector_fund: { ar: 'الصناديق القطاعية', en: 'Sector Funds' },
  thematic_fund: { ar: 'الصناديق الموضوعية', en: 'Thematic Funds' },
  shariah_compliant_fund: { ar: 'الصناديق المتوافقة مع الشريعة', en: 'Shariah-Compliant Funds' },
  leveraged_etf: { ar: 'الصناديق المتداولة ذات الرافعة المالية', en: 'Leveraged ETFs' },
  inverse_etf: { ar: 'الصناديق العكسية المتداولة', en: 'Inverse ETFs' },
  income_fund: { ar: 'صناديق الدخل', en: 'Income Funds' },
  growth_fund: { ar: 'صناديق النمو', en: 'Growth Funds' },
  balanced_fund: { ar: 'الصناديق المتوازنة', en: 'Balanced Funds' },
  hedge_fund: { ar: 'صناديق التحوط', en: 'Hedge Funds' },
};

export const TRADER_FUND_FILTERS: Array<{ id: TraderFundFilter; ar: string; en: string }> = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'etf', ar: 'الصناديق المتداولة ETF', en: 'ETFs' },
  { id: 'mutual_fund', ar: 'الصناديق الاستثمارية المشتركة', en: 'Mutual Funds' },
  { id: 'index_fund', ar: 'صناديق المؤشرات', en: 'Index Funds' },
  { id: 'money_market_fund', ar: 'صناديق سوق النقد', en: 'Money Market Funds' },
  { id: 'bond_sukuk_fund', ar: 'صناديق السندات والصكوك', en: 'Bond/Sukuk Funds' },
  { id: 'reit', ar: 'صناديق الاستثمار العقاري REITs', en: 'REITs' },
  { id: 'commodity_fund', ar: 'صناديق السلع', en: 'Commodity Funds' },
  { id: 'sector_fund', ar: 'الصناديق القطاعية', en: 'Sector Funds' },
  { id: 'thematic_fund', ar: 'الصناديق الموضوعية', en: 'Thematic Funds' },
  { id: 'shariah_fund', ar: 'الصناديق المتوافقة مع الشريعة', en: 'Shariah Funds' },
  { id: 'leveraged_etf', ar: 'الصناديق ذات الرافعة', en: 'Leveraged ETFs' },
  { id: 'inverse_etf', ar: 'الصناديق العكسية', en: 'Inverse ETFs' },
  { id: 'income_fund', ar: 'صناديق الدخل', en: 'Income Funds' },
  { id: 'growth_fund', ar: 'صناديق النمو', en: 'Growth Funds' },
  { id: 'balanced_fund', ar: 'الصناديق المتوازنة', en: 'Balanced Funds' },
];

const FUND_TYPE_ALIASES: Record<string, TraderFundType> = {
  fund: 'fund',
  funds: 'fund',
  etf: 'etf',
  etfs: 'etf',
  exchange_traded_fund: 'etf',
  exchange_traded_funds: 'etf',
  mutual_fund: 'mutual_fund',
  mutual_funds: 'mutual_fund',
  index_fund: 'index_fund',
  index_funds: 'index_fund',
  money_market: 'money_market_fund',
  money_market_fund: 'money_market_fund',
  money_market_funds: 'money_market_fund',
  bond: 'bond_fund',
  bond_fund: 'bond_fund',
  bond_funds: 'bond_fund',
  sukuk: 'sukuk_fund',
  sukuk_fund: 'sukuk_fund',
  sukuk_funds: 'sukuk_fund',
  reit: 'reit',
  reits: 'reit',
  real_estate_investment_trust: 'reit',
  commodity_fund: 'commodity_fund',
  commodity_funds: 'commodity_fund',
  sector_fund: 'sector_fund',
  sector_funds: 'sector_fund',
  thematic_fund: 'thematic_fund',
  thematic_funds: 'thematic_fund',
  shariah: 'shariah_compliant_fund',
  shariah_compliant: 'shariah_compliant_fund',
  shariah_compliant_fund: 'shariah_compliant_fund',
  leveraged: 'leveraged_etf',
  leveraged_etf: 'leveraged_etf',
  inverse: 'inverse_etf',
  inverse_etf: 'inverse_etf',
  income: 'income_fund',
  income_fund: 'income_fund',
  growth: 'growth_fund',
  growth_fund: 'growth_fund',
  balanced: 'balanced_fund',
  balanced_fund: 'balanced_fund',
  hedge: 'hedge_fund',
  hedge_fund: 'hedge_fund',
};

const FUND_FILTER_ALIASES: Record<string, TraderFundFilter> = {
  all: 'all',
  any: 'all',
  '*': 'all',
  etf: 'etf',
  etfs: 'etf',
  fund: 'all',
  funds: 'all',
  mutual: 'mutual_fund',
  mutual_fund: 'mutual_fund',
  index: 'index_fund',
  index_fund: 'index_fund',
  money_market: 'money_market_fund',
  money_market_fund: 'money_market_fund',
  bond: 'bond_sukuk_fund',
  bonds: 'bond_sukuk_fund',
  bond_fund: 'bond_sukuk_fund',
  sukuk: 'bond_sukuk_fund',
  sukuk_fund: 'bond_sukuk_fund',
  bond_sukuk: 'bond_sukuk_fund',
  bond_sukuk_fund: 'bond_sukuk_fund',
  reit: 'reit',
  reits: 'reit',
  commodity: 'commodity_fund',
  commodity_fund: 'commodity_fund',
  sector: 'sector_fund',
  sector_fund: 'sector_fund',
  thematic: 'thematic_fund',
  thematic_fund: 'thematic_fund',
  shariah: 'shariah_fund',
  shariah_fund: 'shariah_fund',
  shariah_compliant: 'shariah_fund',
  leveraged: 'leveraged_etf',
  leveraged_etf: 'leveraged_etf',
  inverse: 'inverse_etf',
  inverse_etf: 'inverse_etf',
  income: 'income_fund',
  income_fund: 'income_fund',
  growth: 'growth_fund',
  growth_fund: 'growth_fund',
  balanced: 'balanced_fund',
  balanced_fund: 'balanced_fund',
  hedge: 'hedge_fund',
  hedge_fund: 'hedge_fund',
};

function key(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
}

function upper(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function firstType(values: unknown[]) {
  for (const value of values) {
    const normalized = FUND_TYPE_ALIASES[key(value)];
    if (normalized) return normalized;
  }
  return null;
}

export function normalizeFundType(value: unknown): TraderFundType | null {
  return FUND_TYPE_ALIASES[key(value)] ?? null;
}

export function normalizeFundFilter(value: unknown): TraderFundFilter {
  return FUND_FILTER_ALIASES[key(value)] ?? 'all';
}

export function inferFundStructure(value: unknown, name?: unknown, sector?: unknown): TraderFundStructure {
  const haystack = upper([value, name, sector].filter(Boolean).join(' '));
  if (/\b(REIT|REAL ESTATE INVESTMENT TRUST)\b/.test(haystack)) return 'reit';
  if (/\b(ETF|EXCHANGE TRADED|EXCHANGE-TRADED|ETN|ETV)\b/.test(haystack)) return 'etf';
  if (/\b(MUTUAL FUND|OPEN END|OPEN-END)\b/.test(haystack)) return 'mutual_fund';
  if (/\b(FUND|TRUST)\b/.test(haystack)) return 'listed_fund';
  return 'unknown';
}

export function classifyFundType(input: {
  explicitType?: unknown;
  rawAssetType?: unknown;
  symbol?: unknown;
  name?: unknown;
  sector?: unknown;
  industry?: unknown;
  fundStructure?: TraderFundStructure;
}): TraderFundType {
  const explicit = firstType([input.explicitType]);
  if (explicit && explicit !== 'fund') return explicit;
  const rawType = firstType([input.rawAssetType]);

  const haystack = upper([
    input.symbol,
    input.name,
    input.sector,
    input.industry,
    input.rawAssetType,
  ].filter(Boolean).join(' '));

  if (/\bSUKUK\b/.test(haystack)) return 'sukuk_fund';
  if (/\b(SHARIAH?|ISLAMIC|HALAL)\b/.test(haystack)) return 'shariah_compliant_fund';
  if (/\b(REIT|REAL ESTATE INVESTMENT TRUST)\b/.test(haystack)) return 'reit';
  if (/\b(INVERSE|ULTRASHORT|BEAR|SHORT)\b/.test(haystack)) return 'inverse_etf';
  if (/\b(LEVERAGED|ULTRA|BULL|2X|3X|1\.5X|TWO TIMES|THREE TIMES)\b/.test(haystack)) return 'leveraged_etf';
  if (/\b(MONEY MARKET|T-?BILL|TREASURY BILL|ULTRA SHORT GOVERNMENT)\b/.test(haystack)) return 'money_market_fund';
  if (/\b(BOND|FIXED INCOME|TREASUR(?:Y|IES)|MUNICIPAL|MUNI|DEBT|CREDIT|LOAN|TIPS|HIGH YIELD|CLO)\b/.test(haystack)) return 'bond_fund';
  if (/\b(COMMODIT(?:Y|IES)|GOLD|SILVER|OIL|NATURAL GAS|BRENT|COPPER|AGRICULTURE|CORN|SOYBEAN|WHEAT|METALS?|MINING)\b/.test(haystack)) return 'commodity_fund';
  if (/\b(SECTOR|TECHNOLOGY|ENERGY|FINANCIAL|HEALTH ?CARE|INDUSTRIAL|UTILIT(?:Y|IES)|SEMICONDUCTOR|BANK|CONSUMER|COMMUNICATION SERVICES)\b/.test(haystack)) return 'sector_fund';
  if (/\b(THEMATIC|ARTIFICIAL INTELLIGENCE|ROBOTICS|CYBERSECURITY|CLOUD|INNOVATION|FUTURE|BITCOIN|ETHEREUM|CRYPTO)\b/.test(haystack)) return 'thematic_fund';
  if (/\b(INDEX|MSCI|S&P|NASDAQ|DOW JONES|RUSSELL|FTSE|STOXX)\b/.test(haystack)) return 'index_fund';
  if (/\b(INCOME|DIVIDEND|YIELD|DISTRIBUTION)\b/.test(haystack)) return 'income_fund';
  if (/\bGROWTH\b/.test(haystack)) return 'growth_fund';
  if (/\b(BALANCED|ALLOCATION|CONSERVATIVE|MODERATE)\b/.test(haystack)) return 'balanced_fund';
  if (/\b(HEDGE|LONG\/SHORT|LONG SHORT|MARKET NEUTRAL|ABSOLUTE RETURN|MANAGED FUTURES)\b/.test(haystack)) return 'hedge_fund';
  if (/\b(MUTUAL FUND|OPEN END|OPEN-END)\b/.test(haystack)) return 'mutual_fund';
  if (input.fundStructure === 'etf') return 'etf';
  return explicit ?? rawType ?? 'fund';
}

export function fundTypeLabel(fundType: TraderFundType | null | undefined) {
  return TRADER_FUND_TYPE_LABELS[fundType ?? 'fund'] ?? TRADER_FUND_TYPE_LABELS.fund;
}

export function isPossiblyShariahFund(input: {
  fundType?: TraderFundType | null;
  shariahStatus?: ShariahStatus | string | null;
  name?: unknown;
  sector?: unknown;
}) {
  const status = String(input.shariahStatus ?? '').trim().toLowerCase();
  if (status === 'compliant') return true;
  if (status === 'non_compliant') return false;
  const haystack = upper([input.name, input.sector].filter(Boolean).join(' '));
  const tagged = input.fundType === 'shariah_compliant_fund'
    || input.fundType === 'sukuk_fund'
    || /\b(SHARIAH?|ISLAMIC|HALAL|SUKUK)\b/.test(haystack);
  return tagged && (status === 'needs_review' || status === 'possible' || status === 'partial' || !status);
}

export function fundMatchesFilter(input: {
  assetType?: unknown;
  fundType?: TraderFundType | string | null;
  fundStructure?: TraderFundStructure | string | null;
  fundFilter?: unknown;
  shariahStatus?: ShariahStatus | string | null;
  name?: unknown;
  sector?: unknown;
}) {
  const filter = normalizeFundFilter(input.fundFilter);
  if (filter === 'all') return true;
  if (String(input.assetType ?? '').toLowerCase() !== 'fund') return false;

  const fundType = normalizeFundType(input.fundType) ?? 'fund';
  const structure = String(input.fundStructure ?? 'unknown').toLowerCase();
  if (filter === 'etf') return structure === 'etf' || ['etf', 'leveraged_etf', 'inverse_etf'].includes(fundType);
  if (filter === 'bond_sukuk_fund') return fundType === 'bond_fund' || fundType === 'sukuk_fund';
  if (filter === 'shariah_fund') {
    return isPossiblyShariahFund({
      fundType,
      shariahStatus: input.shariahStatus,
      name: input.name,
      sector: input.sector,
    });
  }
  return fundType === filter;
}
