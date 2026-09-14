import type { SupabaseClient } from '@supabase/supabase-js';
import { EVIDENCE_VERSION } from './evidenceValidation';
import { SFM_FTSE_POINT_IN_TIME } from './methodologies';
import type { ShariaScreeningResult } from './types';

function publicUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search; }
  catch { return false; }
}

export function catalogPatchForResearch(result: ShariaScreeningResult) {
  if (result.evidenceVersion !== EVIDENCE_VERSION || result.methodology.id !== SFM_FTSE_POINT_IN_TIME.id
    || result.methodology.version !== SFM_FTSE_POINT_IN_TIME.version) throw new Error('RESEARCH_VERSION_NOT_PUBLISHABLE');
  const status = result.classification === 'compliant' || result.classification === 'non_compliant' ? result.classification : 'needs_review';
  // Global catalog never contains user IDs, private research IDs, manually supplied
  // URLs, news or full report text. Only the public evidence actually used by rules.
  const safeDocuments = result.documents.filter(document => document.tier === 1 && document.reliability === 'official'
    && document.adapterId !== 'manual-url-source' && !['manual_url', 'news', 'rss', 'methodology'].includes(document.sourceType)
    && publicUrl(document.sourceUrl));
  const safeIds = new Set(safeDocuments.map(document => document.id));
  const financial = result.financialRatios.map(ratio => ({
    key: ratio.ruleId, label: ratio.name, labelAr: ratio.nameAr, labelFr: ratio.nameFr,
    value: ratio.value, numerator: ratio.numerator, denominator: ratio.denominator,
    threshold: ratio.threshold, operator: ratio.operator ?? '<=', verdict: ratio.status, formula: ratio.formula,
    reportingPeriod: ratio.reportingPeriod, currency: ratio.currency, warning: ratio.warning,
    inputs: ratio.inputs.filter(value => safeIds.has(value.documentId)).map(value => ({ field: value.normalizedField,
      originalField: value.originalField, value: value.value, currency: value.currency, periodStart: value.periodStart,
      periodEnd: value.periodEnd, filedAt: value.filedAt, sourceUrl: value.sourceUrl, validation: value.validation })),
  }));
  // A decisive report must not lose its supporting inputs when sanitizing.
  if (status === 'compliant' && financial.some((ratio, index) => ratio.inputs.length !== result.financialRatios[index].inputs.length)) {
    throw new Error('NON_PUBLIC_DECISIVE_EVIDENCE');
  }
  if (status === 'non_compliant') {
    const publicFinancialFailure = financial.some((ratio, index) => ratio.verdict === 'fail'
      && ratio.inputs.length > 0 && ratio.inputs.length === result.financialRatios[index].inputs.length);
    const publicBusinessFailure = result.businessScreen.status === 'fail'
      && result.businessScreen.detectedActivities.some(activity => activity.materialityKnown
        && activity.evidence.some(item => safeIds.has(item.documentId)));
    if (!publicFinancialFailure && !publicBusinessFailure) throw new Error('NON_PUBLIC_DECISIVE_EVIDENCE');
  }
  return {
    shariah_status: status,
    shariah_reason: result.classification === 'non_compliant' ? result.failedChecks.join('; ')
      : result.classification === 'compliant' ? 'All required current, source-verified checks passed the independent SFM screen.'
        : [...result.unavailableChecks, ...result.businessScreen.reasons].join('; ').slice(0, 2_000),
    shariah_source: result.methodology.name,
    shariah_last_reviewed_at: result.retrievedAt,
    shariah_reviewed_by: 'automatic:sfm-evidence-v2',
    shariah_screening_data: {
      evidenceVersion: EVIDENCE_VERSION, screeningMethodology: result.methodology.name,
      methodologyId: result.methodology.id, methodologyVersion: result.methodology.version,
      financialPeriod: result.lastFinancialReportDate, fetchedAt: result.retrievedAt,
      missingFinancialFields: result.missingFinancialFields ?? [], classification: result.classification,
      screeningRules: { business: { verdict: result.businessScreen.status, reasons: result.businessScreen.reasons }, financial },
      sources: safeDocuments.map(document => ({ title: document.sourceTitle, url: document.sourceUrl,
        reportingPeriod: document.reportingPeriod, retrievedAt: document.retrievalDate, type: document.sourceType })),
      screeningDisclaimer: 'Independent source-based point-in-time screen, not a fatwa, certified opinion or official index rating.',
    },
  };
}

function exchangeKey(exchange: string | null | undefined) {
  const text = String(exchange ?? '').trim().toUpperCase();
  if (['NASDAQ', 'XNAS', 'NASDAQ GLOBAL SELECT', 'NASDAQ GLOBAL SELECT MARKET'].includes(text)) return 'XNAS';
  if (['NYSE', 'XNYS', 'NEW YORK STOCK EXCHANGE'].includes(text)) return 'XNYS';
  if (['NYSE ARCA', 'NYSEARCA', 'ARCX', 'ARCA'].includes(text)) return 'ARCX';
  return text;
}

export async function syncResearchResultToCatalog(admin: SupabaseClient, result: ShariaScreeningResult) {
  if (result.methodology.id !== SFM_FTSE_POINT_IN_TIME.id) return { updated: 0, reason: 'different_methodology' };
  const patch = catalogPatchForResearch(result);
  const symbols = [...new Set([result.security.ticker, result.security.providerSymbol])];
  const rows = await admin.from('market_symbols').select('id,symbol,exchange,updated_at,shariah_manual_override,shariah_last_reviewed_at')
    .in('symbol', symbols).eq('is_active', true).eq('asset_type', 'stock');
  if (rows.error) throw new Error('CATALOG_SYNC_LOOKUP_FAILED');
  let updated = 0;
  for (const row of rows.data ?? []) {
    if (row.shariah_manual_override || exchangeKey(row.exchange) !== exchangeKey(result.security.exchange)
      || (row.shariah_last_reviewed_at && Date.parse(row.shariah_last_reviewed_at) > Date.parse(result.retrievedAt))) continue;
    const saved = await admin.from('market_symbols').update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', row.id).eq('shariah_manual_override', false).eq('updated_at', row.updated_at).select('id');
    if (saved.error) throw new Error('CATALOG_SYNC_WRITE_FAILED');
    updated += saved.data?.length ?? 0;
  }
  return { updated, reason: updated ? null : 'no_matching_unlocked_catalog_security' };
}
