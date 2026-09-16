import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { secureFetch } from '@/lib/sharia-research/secureFetch';
import { EVIDENCE_VERSION } from '@/lib/sharia-research/evidenceValidation';
import { publicCatalogItem } from '@/lib/sharia-research/publicCatalog';
import { getPublishedShariahFundProfile } from './shariahPublishedFunds';
import { loadIwmHoldings } from './shariahIwmHoldings';

export const FUND_REVIEW_METHOD = 'SFM_FUND_EVIDENCE_REVIEW';
const SPY_HOLDINGS = 'https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-spy.xlsx';
export type Holding = { symbol: string; name: string; identifier: string; weight: number; currency: string;
  assetClass?: string; exchange?: string };

/** Ticker alone is not an issuer identity. Require a distinctive full legal
 * name token sequence; similarly named or ambiguous securities stay unknown. */
export function sameHoldingIssuer(a: string, b: string) {
  const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\b(CLASS [A-Z]|INCORPORATED|INC|CORPORATION|CORP|COMPANY|CO|PLC|LTD|LIMITED|COM|COMMON|STOCK)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const first = normalize(a), second = normalize(b);
  return Boolean(first && first === second);
}
export function validateHoldingsArchive(bytes: Uint8Array) {
  if (bytes.byteLength > 2_000_000 || bytes.byteLength < 22) throw new Error('fund_holdings_size_limit');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let directory = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) if (view.getUint32(offset, true) === 0x06054b50) { directory = offset; break; }
  if (directory < 0) throw new Error('fund_invalid_archive');
  const count = view.getUint16(directory + 10, true), start = view.getUint32(directory + 16, true);
  if (count < 1 || count > 100 || view.getUint16(directory + 4, true) || view.getUint16(directory + 6, true)) throw new Error('fund_archive_limits');
  let at = start, expanded = 0;
  for (let i = 0; i < count; i++) {
    if (at + 46 > directory || view.getUint32(at, true) !== 0x02014b50 || (view.getUint16(at + 8, true) & 1)) throw new Error('fund_invalid_archive');
    expanded += view.getUint32(at + 24, true);
    if (expanded > 12_000_000) throw new Error('fund_archive_expansion_limit');
    at += 46 + view.getUint16(at + 28, true) + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  if (at > directory) throw new Error('fund_invalid_archive');
}
export function parseSpyRows(rows: unknown[][], now = new Date()) {
  if (rows.length < 8 || rows.length > 2500 || rows[1]?.[0] !== 'Ticker Symbol:' || rows[1]?.[1] !== 'SPY'
    || !/SPDR.*S&P 500.*ETF Trust/i.test(String(rows[0]?.[1] ?? ''))) throw new Error('fund_identity_mismatch');
  const dateText = /^As of (\d{2})-([A-Z][a-z]{2})-(20\d{2})$/.exec(String(rows[2]?.[1] ?? ''));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = dateText ? months.indexOf(dateText[2]) : -1;
  const stamp = dateText && month >= 0 ? Date.UTC(Number(dateText[3]), month, Number(dateText[1])) : NaN;
  if (!Number.isFinite(stamp) || new Date(stamp).getUTCMonth() !== month || stamp > now.getTime() || now.getTime() - stamp > 7 * 86400_000) throw new Error('fund_holdings_date_invalid_or_stale');
  const header = rows.findIndex(row => row[0] === 'Name' && row[1] === 'Ticker' && row[4] === 'Weight' && row[7] === 'Local Currency');
  if (header < 0 || header > 10) throw new Error('fund_holdings_layout_unrecognized');
  const holdings: Holding[] = [], identifiers = new Set<string>();
  let footer = false;
  for (const row of rows.slice(header + 1)) {
    const onlyText = typeof row[0] === 'string' && row.slice(1).every(value => value === null || value === undefined || value === '');
    if (onlyText && /^State Street Global Advisors \(SSGA\)/.test(String(row[0])) && holdings.length >= 100) footer = true;
    if (footer) {
      if (!onlyText && row.some(value => value !== null && value !== undefined && value !== '')) throw new Error('fund_holdings_after_disclaimer');
      continue;
    }
    if (row.every(value => value === null || value === undefined || value === '')) continue;
    const name = typeof row[0] === 'string' ? row[0].trim() : '';
    const symbol = typeof row[1] === 'string' ? row[1].trim().toUpperCase() : '';
    const identifier = String(row[2] ?? '').trim();
    const weight = row[4], currency = row[7];
    if (!name || typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 100
      || !identifier || identifiers.has(identifier) || typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) throw new Error('fund_holdings_row_invalid');
    identifiers.add(identifier); holdings.push({ symbol, name, identifier, weight, currency });
  }
  const total = holdings.reduce((sum, row) => sum + row.weight, 0);
  if (holdings.length < 100 || total < 99.5 || total > 100.5) throw new Error('fund_holdings_total_incomplete');
  return { asOf: new Date(stamp).toISOString().slice(0, 10), totalWeight: total, holdings };
}
async function summarizeUnderlying(holdings: Holding[], admin: SupabaseClient) {
  const catalog = await admin.from('market_symbols').select('symbol,name,asset_type,exchange,shariah_status,shariah_manual_override,shariah_source,shariah_reason,shariah_last_reviewed_at,shariah_screening_data')
    .eq('is_active', true).eq('asset_type', 'stock').abortSignal(AbortSignal.timeout(4000));
  if (catalog.error) throw new Error('fund_underlying_catalog_unavailable');
  const groups = new Map<string, typeof catalog.data>();
  for (const item of catalog.data ?? []) if (/^(NASDAQ|NYSE|AMEX|XNAS|XNYS)$/i.test(item.exchange ?? '')) groups.set(item.symbol, [...(groups.get(item.symbol) ?? []), item]);
  let passingWeight = 0, failingWeight = 0, unknownWeight = 0, negativeWeight = 0;
  for (const holding of holdings) {
    if (holding.weight < 0) { negativeWeight += holding.weight; continue; }
    const matches = groups.get(holding.symbol) ?? [];
    const venueMatches = !holding.exchange || matches.length === 1 && (
      holding.exchange.toUpperCase() === String(matches[0].exchange).toUpperCase()
      || holding.exchange === 'NASDAQ' && matches[0].exchange === 'XNAS'
      || holding.exchange === 'NYSE' && matches[0].exchange === 'XNYS');
    const eligible = (!holding.assetClass || holding.assetClass === 'Equity') && venueMatches;
    const status = eligible && matches.length === 1 && holding.currency === 'USD' && sameHoldingIssuer(holding.name, matches[0].name)
      ? publicCatalogItem(matches[0]).shariahStatus : 'needs_review';
    if (status === 'compliant') passingWeight += holding.weight;
    else if (status === 'non_compliant') failingWeight += holding.weight;
    else unknownWeight += holding.weight;
  }
  return { passingWeight, failingWeight, unknownWeight, negativeWeight, weightUnit: 'percentage_points',
    note: 'Underlying exposure totals are diagnostics, not fund pass/fail thresholds. Cash, derivatives and unmatched identities are unknown. Negative positions are shown separately; values are not renormalized.' };
}

function issuerHost(url: string) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
}

async function verifyPublishedShariahDesignation(row: { symbol: string; name: string }, signal: AbortSignal) {
  const profile = getPublishedShariahFundProfile(row.symbol, row.name);
  if (!profile) return null;
  const response = await secureFetch(profile.officialUrl, {
    maxBytes: 5_000_000,
    signal,
    acceptedContentTypes: ['text/html'],
    cacheTtlMs: 6 * 3600_000,
    respectRobots: true,
  });
  if (issuerHost(response.finalUrl) !== issuerHost(profile.officialUrl)) throw new Error('fund_shariah_source_identity_changed');
  const html = new TextDecoder().decode(response.body);
  if (!profile.identityPattern.test(html) || !profile.evidencePatterns.every(pattern => pattern.test(html))) {
    throw new Error('fund_shariah_designation_not_verified');
  }
  return {
    state: 'verified' as const,
    provider: profile.provider,
    designation: profile.designation,
    methodology: profile.methodology,
    authority: profile.authority,
    sourceUrl: response.finalUrl,
    verifiedAt: response.retrievedAt,
    sourceHash: createHash('sha256').update(response.body).digest('hex'),
  };
}

export async function reviewFundEvidence(row: { symbol: string; name: string; exchange: string; country: string }, admin: SupabaseClient, signal: AbortSignal) {
  const reviewedAt = new Date().toISOString();
  let fundReview: Record<string, unknown> = { coverage: 'unavailable', reason: 'official_fund_holdings_adapter_unavailable',
    structuralChecks: ['Complete dated holdings', 'Underlying securities and cash', 'Derivatives, lending and settlement terms', 'Fund-level Shariah methodology or published opinion'] };
  const sources: Array<{ title: string; url: string; retrievedAt: string; reportingPeriod: string | null; type: string; sourceHash?: string }> = [];
  const publishedProfile = getPublishedShariahFundProfile(row.symbol, row.name);
  if (publishedProfile) {
    try {
      const designation = await verifyPublishedShariahDesignation(row, signal);
      if (designation) {
        fundReview = { ...fundReview, coverage: 'published_designation_verified', reason: 'published_shariah_designation_verified_periodic_monitoring_required',
          publishedShariahDesignation: designation, periodicVerificationRequired: true };
        sources.push({ title: `${designation.provider} official published Shariah designation`, url: designation.sourceUrl,
          retrievedAt: designation.verifiedAt, reportingPeriod: null, type: 'fund_shariah_methodology', sourceHash: designation.sourceHash });
      }
    } catch (error) {
      fundReview = { ...fundReview, publishedShariahDesignation: {
        state: 'unverified', provider: publishedProfile.provider, designation: publishedProfile.designation,
        methodology: publishedProfile.methodology, authority: publishedProfile.authority, sourceUrl: publishedProfile.officialUrl,
        error: error instanceof Error ? error.message : 'fund_shariah_designation_verification_failed',
      } };
    }
  }
  if (['GLD', 'SLV'].includes(row.symbol)) fundReview.reason = 'physical_metal_custody_and_settlement_review_required';
  if (row.symbol === 'SPY' && /^(NYSE.?ARCA|ARCX)$/i.test(row.exchange)) {
    const response = await secureFetch(SPY_HOLDINGS, { maxBytes: 2_000_000, signal, acceptedContentTypes: ['spreadsheetml', 'octet-stream'], cacheTtlMs: 3600_000, respectRobots: true });
    if (response.finalUrl !== SPY_HOLDINGS) throw new Error('fund_source_redirected');
    validateHoldingsArchive(response.body);
    const { read, utils } = await import('xlsx');
    const book = read(response.body, { type: 'array', sheetRows: 2500, cellFormula: false, bookVBA: false });
    if (!book.Sheets.holdings) throw new Error('fund_holdings_sheet_missing');
    const parsed = parseSpyRows(utils.sheet_to_json<unknown[]>(book.Sheets.holdings, { header: 1, defval: null, raw: true }));
    fundReview = { ...fundReview, ...await summarizeUnderlying(parsed.holdings, admin), coverage: 'partial', reason: 'fund_level_review_not_completed',
      asOf: parsed.asOf, holdingCount: parsed.holdings.length, disclosedWeight: parsed.totalWeight };
    sources.push({ title: 'State Street SPY official dated holdings', url: SPY_HOLDINGS, retrievedAt: response.retrievedAt,
      reportingPeriod: parsed.asOf, type: 'fund_holdings', sourceHash: createHash('sha256').update(response.body).digest('hex') });
  } else if (row.symbol === 'IWM' && /^(NYSE.?ARCA|ARCX)$/i.test(row.exchange)) {
    const parsed = await loadIwmHoldings(signal);
    fundReview = { ...fundReview, ...await summarizeUnderlying(parsed.holdings, admin), coverage: 'partial', reason: 'fund_level_review_not_completed',
      asOf: parsed.asOf, holdingCount: parsed.holdings.length, disclosedWeight: parsed.totalWeight, totalWeightVerified: parsed.totalVerified,
      roundedWeightResidual: parsed.roundedWeightResidual, nonEquityPositions: parsed.nonEquityPositions };
    sources.push({ title: 'iShares IWM official dated holdings', url: parsed.sourceUrl, retrievedAt: parsed.retrievedAt,
      reportingPeriod: parsed.asOf, type: 'fund_holdings', sourceHash: parsed.sourceHash });
  }
  const published = (fundReview.publishedShariahDesignation as { state?: string; provider?: string } | undefined)?.state === 'verified';
  return { shariah_status: 'needs_review', shariah_reason: published
      ? `Published Shariah designation verified from ${(fundReview.publishedShariahDesignation as { provider?: string }).provider ?? 'the fund provider'}; SFM periodic source and holdings verification remains separate and is not a new fatwa.`
      : `Fund-level evidence review required: ${fundReview.reason}. Corporate debt/assets rules were not applied to this fund.`,
    shariah_source: published ? 'Official published Shariah designation + SFM source verification' : 'SFM fund evidence review (not a fund certification)',
    shariah_last_reviewed_at: reviewedAt,
    shariah_reviewed_by: 'automatic:sfm-evidence-v2', shariah_screening_data: { evidenceVersion: EVIDENCE_VERSION,
      methodologyId: FUND_REVIEW_METHOD, methodologyVersion: '1', screeningMethodology: 'Fund holdings, published methodology and contract evidence review',
      fetchedAt: reviewedAt, financialPeriod: null, missingFinancialFields: [], fieldCoverage: [], classification: 'requires_review' as const,
      screeningRules: { business: { verdict: 'review' as const, reasons: [published
        ? 'A current published Shariah designation was verified; SFM monitoring is separate from the provider or Shariah board certification.'
        : 'Fund-level structural and holdings review is incomplete.'] }, financial: [] }, sources, fundReview,
      screeningDisclaimer: 'A published fund Shariah designation is reported as source evidence. SFM does not replace the fund Shariah board or issue a fatwa.' } };
}
