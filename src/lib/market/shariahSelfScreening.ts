import type { SupabaseClient } from '@supabase/supabase-js';
import { enrichShariahScreeningData } from '@/lib/market/shariahFundamentals';
import type {
  ShariahClassification,
  ShariahScreeningData,
  ShariahStatus,
} from '@/lib/market/shariah-screening';

type MarketSymbolRow = {
  id: string;
  symbol: string;
  display_symbol?: string | null;
  provider_symbol?: string | null;
  name?: string | null;
  company_name_ar?: string | null;
  company_name_en?: string | null;
  asset_type?: string | null;
  exchange?: string | null;
  country?: string | null;
  currency?: string | null;
  sector?: string | null;
  industry?: string | null;
  description?: string | null;
  shariah_status?: string | null;
  shariah_reason?: string | null;
  shariah_source?: string | null;
  shariah_last_reviewed_at?: string | null;
  shariah_manual_override?: boolean | null;
  shariah_reviewed_by?: string | null;
  shariah_screening_data?: ShariahScreeningData | null;
};

type BusinessRuleResult = {
  verdict: 'pass' | 'fail' | 'review';
  code: string;
  reason: string;
};

type RatioRuleResult = {
  key: string;
  label: string;
  value: number | null;
  threshold: number;
  operator: '<' | '<=';
  verdict: 'pass' | 'fail' | 'unknown';
};

export type SfmShariahRefreshResult = {
  ok: boolean;
  scanned: number;
  updated: number;
  compliant: number;
  nonCompliant: number;
  needsReview: number;
  unclassified: number;
  skippedManual: number;
  failed: Array<{ symbol: string; reason: string }>;
  model: string;
  methodology: string;
};

const MODEL = 'SFM Shariah Screener';
const METHODOLOGY = 'FTSE Yasaar-aligned rules-based equity screen';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_STALE_HOURS = 24;

// Public FTSE/Yasaar-style thresholds. This is an internal screening estimate,
// not a licensed FTSE classification and not a fatwa.
export const SFM_SHARIAH_THRESHOLDS = {
  debtToAssets: 1 / 3,
  cashAndInterestBearingToAssets: 1 / 3,
  receivablesAndCashToAssets: 0.5,
  nonPermissibleIncomeToRevenue: 0.05,
  interestIncomeToRevenue: 0.05,
} as const;

const PROHIBITED_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  { code: 'alcohol', pattern: /\b(alcohol|beer|brewery|breweries|distill(?:er|ery)|wine|liquor|spirits)\b/i },
  { code: 'tobacco', pattern: /\b(tobacco|cigarette|cigar|nicotine|vape|vaping|shisha)\b/i },
  { code: 'gambling', pattern: /\b(casino|gambling|lottery|betting|wagering|sportsbook)\b/i },
  { code: 'pork', pattern: /\b(pork|swine|hog processing|pork products)\b/i },
  { code: 'adult_content', pattern: /\b(pornography|adult entertainment|adult content)\b/i },
  { code: 'weapons_defense', pattern: /\b(weapons?|arms manufacturer|defen[cs]e contractor|military weapons|munitions|ammunition)\b/i },
  { code: 'entertainment', pattern: /\b(cinema|movie studio|motion picture|music label|casino resort|amusement|video entertainment|streaming entertainment)\b/i },
  { code: 'conventional_finance', pattern: /\b(conventional bank|commercial bank|investment bank|mortgage lender|consumer finance|payday lender|conventional insurance|reinsurance|life insurance|property casualty)\b/i },
];

const ISLAMIC_FINANCE_PATTERN = /\b(islamic|shariah?|shari'a|takaful|sukuk)\b/i;
const FINANCIAL_SECTOR_PATTERN = /\b(financial services|bank|banking|insurance|consumer finance|credit services|capital markets|mortgage)\b/i;

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsed)));
}

function staleHours() {
  const parsed = Number(process.env.SHARIAH_REFRESH_STALE_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STALE_HOURS;
}

function isStale(row: MarketSymbolRow, force: boolean) {
  if (force) return true;
  if (!row.shariah_last_reviewed_at) return true;
  const reviewed = new Date(row.shariah_last_reviewed_at).getTime();
  return !Number.isFinite(reviewed) || Date.now() - reviewed >= staleHours() * 60 * 60 * 1000;
}

function rowName(row: MarketSymbolRow) {
  return cleanText(row.company_name_en || row.name || row.company_name_ar || row.symbol);
}

function businessRule(row: Pick<MarketSymbolRow, 'symbol' | 'exchange' | 'country'> & { name?: string | null }, data: ShariahScreeningData): BusinessRuleResult {
  const sector = cleanText(data.sector);
  const industry = cleanText(data.industry);
  const description = cleanText(data.businessDescription);
  const haystack = [row.name, sector, industry, description].map(cleanText).filter(Boolean).join(' ');

  for (const rule of PROHIBITED_PATTERNS) {
    if (rule.pattern.test(haystack)) {
      return {
        verdict: 'fail',
        code: `business_${rule.code}`,
        reason: `Business activity matched the prohibited ${rule.code.replaceAll('_', ' ')} screen.`,
      };
    }
  }

  if (FINANCIAL_SECTOR_PATTERN.test(haystack)) {
    if (ISLAMIC_FINANCE_PATTERN.test(haystack)) {
      return {
        verdict: 'review',
        code: 'islamic_financial_institution_review',
        reason: 'Islamic financial institutions require a dedicated institution-level Shariah review.',
      };
    }
    const country = cleanText(row.country).toUpperCase();
    const exchange = cleanText(row.exchange).toUpperCase();
    const conventionalMarket = ['US', 'USA', 'UNITED STATES', 'GB', 'UK', 'UNITED KINGDOM', 'CANADA'].includes(country)
      || /(NASDAQ|NYSE|AMEX|LSE|TSX)/.test(exchange);
    return conventionalMarket
      ? {
          verdict: 'fail',
          code: 'business_conventional_finance',
          reason: 'The company operates in conventional interest-based financial services.',
        }
      : {
          verdict: 'review',
          code: 'financial_institution_review',
          reason: 'Financial institutions require confirmation that their activities are Shariah-based rather than conventional.',
        };
  }

  if (!sector && !industry && !description) {
    return {
      verdict: 'review',
      code: 'business_data_missing',
      reason: 'Business activity data is not detailed enough for an automatic Shariah screen.',
    };
  }

  return { verdict: 'pass', code: 'business_pass', reason: 'No prohibited business activity was detected in the available company data.' };
}

function ratioRule(key: string, label: string, value: unknown, threshold: number, operator: '<' | '<='): RatioRuleResult {
  const numeric = numberOrNull(value);
  if (numeric === null) return { key, label, value: null, threshold, operator, verdict: 'unknown' };
  const passes = operator === '<' ? numeric < threshold : numeric <= threshold;
  return { key, label, value: numeric, threshold, operator, verdict: passes ? 'pass' : 'fail' };
}

function financialRules(data: ShariahScreeningData) {
  return [
    ratioRule('interestBearingDebtRatio', 'Interest-bearing debt / total assets', data.interestBearingDebtRatio, SFM_SHARIAH_THRESHOLDS.debtToAssets, '<'),
    ratioRule('cashAndInterestBearingSecuritiesRatio', 'Cash + interest-bearing securities / total assets', data.cashAndInterestBearingSecuritiesRatio, SFM_SHARIAH_THRESHOLDS.cashAndInterestBearingToAssets, '<'),
    ratioRule('accountsReceivableAndCashRatio', 'Accounts receivable + cash / total assets', data.accountsReceivableAndCashRatio, SFM_SHARIAH_THRESHOLDS.receivablesAndCashToAssets, '<'),
    ratioRule('nonPermissibleRevenueRatio', 'Interest and non-permissible income / total revenue', data.nonPermissibleRevenueRatio, SFM_SHARIAH_THRESHOLDS.nonPermissibleIncomeToRevenue, '<='),
    ratioRule('interestIncomeRatio', 'Interest income / total revenue', data.interestIncomeRatio, SFM_SHARIAH_THRESHOLDS.interestIncomeToRevenue, '<='),
  ];
}

function classification(status: ShariahStatus, reason: string, data: ShariahScreeningData, business: BusinessRuleResult, ratios: RatioRuleResult[]): ShariahClassification {
  const now = new Date().toISOString();
  return {
    shariahStatus: status,
    shariahReason: reason,
    shariahSource: `${MODEL} · ${METHODOLOGY}`,
    shariahLastReviewedAt: now,
    shariahManualOverride: false,
    shariahReviewedBy: 'automatic:sfm-shariah-screener',
    shariahScreeningData: {
      ...data,
      screeningModel: MODEL,
      screeningMethodology: METHODOLOGY,
      screeningMethodologyReference: 'https://www.lseg.com/en/ftse-russell/indices/global-shariah',
      screeningRules: {
        business,
        financial: ratios,
      },
      screeningDisclaimer: 'Automated rules-based screening estimate; not a fatwa or certified Shariah opinion.',
      screeningGeneratedAt: now,
    },
    shariahMethod: 'automatic_screening',
  };
}

export function classifySfmShariahStock(
  row: Pick<MarketSymbolRow, 'symbol' | 'exchange' | 'country'> & { name?: string | null },
  data: ShariahScreeningData,
): ShariahClassification {
  const business = businessRule(row, data);
  const ratios = financialRules(data);

  if (business.verdict === 'fail') {
    return classification('non_compliant', business.reason, data, business, ratios);
  }
  if (business.verdict === 'review') {
    return classification('needs_review', business.reason, data, business, ratios);
  }

  const failedRatio = ratios.find(rule => rule.verdict === 'fail');
  if (failedRatio) {
    return classification(
      'non_compliant',
      `${failedRatio.label} is outside the configured Shariah threshold.`,
      data,
      business,
      ratios,
    );
  }

  const unknown = ratios.filter(rule => rule.verdict === 'unknown');
  if (unknown.length) {
    return classification(
      'needs_review',
      `Automatic screening is missing ${unknown.map(rule => rule.label).join(', ')}.`,
      data,
      business,
      ratios,
    );
  }

  return classification(
    'compliant',
    'Available business activity and financial ratios passed the SFM rules-based Shariah screen.',
    data,
    business,
    ratios,
  );
}

async function screenOne(admin: SupabaseClient, row: MarketSymbolRow) {
  if (row.shariah_manual_override) return { kind: 'manual' as const, status: null };
  const enriched = await enrichShariahScreeningData({
    symbol: row.symbol,
    providerSymbol: row.provider_symbol || row.display_symbol,
    name: rowName(row),
    exchange: row.exchange,
    country: row.country,
    sector: row.sector,
    industry: row.industry,
    description: row.description,
    existing: row.shariah_screening_data,
  });
  const result = classifySfmShariahStock({
    symbol: row.symbol,
    name: rowName(row),
    exchange: row.exchange,
    country: row.country,
  }, enriched.data);

  const { error } = await admin
    .from('market_symbols')
    .update({
      shariah_status: result.shariahStatus,
      shariah_reason: result.shariahReason,
      shariah_source: result.shariahSource,
      shariah_last_reviewed_at: result.shariahLastReviewedAt,
      shariah_manual_override: false,
      shariah_reviewed_by: result.shariahReviewedBy,
      shariah_screening_data: result.shariahScreeningData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('shariah_manual_override', false);
  if (error) throw new Error(`db_update_${error.code || 'failed'}`);
  return { kind: 'screened' as const, status: result.shariahStatus };
}

export async function refreshSfmShariahClassifications(
  admin: SupabaseClient,
  options: { limit?: number; force?: boolean } = {},
): Promise<SfmShariahRefreshResult> {
  const limit = clampLimit(options.limit);
  const force = options.force === true;
  const fetchLimit = Math.min(MAX_LIMIT * 3, Math.max(limit, limit * 3));
  const { data, error } = await admin
    .from('market_symbols')
    .select('id,symbol,display_symbol,provider_symbol,name,company_name_ar,company_name_en,asset_type,exchange,country,currency,sector,industry,description,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_reviewed_by,shariah_screening_data')
    .eq('is_active', true)
    .eq('asset_type', 'stock')
    .order('shariah_last_reviewed_at', { ascending: true, nullsFirst: true })
    .limit(fetchLimit);

  if (error) {
    return {
      ok: false,
      scanned: 0,
      updated: 0,
      compliant: 0,
      nonCompliant: 0,
      needsReview: 0,
      unclassified: 0,
      skippedManual: 0,
      failed: [{ symbol: 'market_symbols', reason: `load_${error.code || 'failed'}` }],
      model: MODEL,
      methodology: METHODOLOGY,
    };
  }

  const candidates = ((data ?? []) as MarketSymbolRow[])
    .filter(row => !row.shariah_manual_override && isStale(row, force))
    .slice(0, limit);
  let compliant = 0;
  let nonCompliant = 0;
  let needsReview = 0;
  let unclassified = 0;
  let skippedManual = 0;
  const failed: Array<{ symbol: string; reason: string }> = [];

  for (let index = 0; index < candidates.length; index += 3) {
    const chunk = candidates.slice(index, index + 3);
    const results = await Promise.allSettled(chunk.map(row => screenOne(admin, row)));
    results.forEach((result, offset) => {
      const row = chunk[offset];
      if (result.status === 'rejected') {
        failed.push({ symbol: row.symbol, reason: result.reason instanceof Error ? result.reason.message : 'screen_failed' });
        return;
      }
      if (result.value.kind === 'manual') {
        skippedManual += 1;
        return;
      }
      if (result.value.status === 'compliant') compliant += 1;
      else if (result.value.status === 'non_compliant') nonCompliant += 1;
      else if (result.value.status === 'needs_review') needsReview += 1;
      else unclassified += 1;
    });
    if (index + 3 < candidates.length) await new Promise(resolve => setTimeout(resolve, 150));
  }

  return {
    ok: failed.length === 0,
    scanned: candidates.length,
    updated: compliant + nonCompliant + needsReview + unclassified,
    compliant,
    nonCompliant,
    needsReview,
    unclassified,
    skippedManual,
    failed,
    model: MODEL,
    methodology: METHODOLOGY,
  };
}
