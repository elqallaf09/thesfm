import type { SupabaseClient } from '@supabase/supabase-js';
import { enrichShariahScreeningData } from './shariahFundamentals';
import { analyzeShariaEvidence } from '@/lib/sharia-research/shariaAnalyzer';
import { catalogPatchForResearch } from '@/lib/sharia-research/catalogSync';
import { SFM_FTSE_POINT_IN_TIME } from '@/lib/sharia-research/methodologies';
import type { FinancialValue, SecurityIdentity, SourceDocument } from '@/lib/sharia-research/types';
import type { ShariahClassification, ShariahScreeningData } from './shariah-screening';

export const SFM_SHARIAH_THRESHOLDS = {
  debtToAssets: 0.33333, cashAndInterestBearingToAssets: 0.33333,
  receivablesAndCashToAssets: 0.5, nonPermissibleIncomeToRevenue: 0.05, interestIncomeToRevenue: 0.05,
} as const;

export function cleanRefreshLimit(value: unknown) {
  if (value === null || value === undefined || value === '') return 50;
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? Math.min(100, Math.floor(number)) : 50;
}

/** Backward-compatible entry point; unsourced legacy ratios cannot become evidence. */
export function classifySfmShariahStock(row: { symbol: string; name?: string | null; exchange?: string | null; country?: string | null }, data: ShariahScreeningData): ShariahClassification {
  const security: SecurityIdentity = data.security as SecurityIdentity ?? {
    canonicalId: `${row.exchange ?? 'UNKNOWN'}:${row.symbol}`, ticker: row.symbol, providerSymbol: row.symbol,
    name: row.name || row.symbol, exchange: row.exchange || 'UNKNOWN', country: row.country, aliases: [], previousNames: [], identitySources: [],
  };
  const result = analyzeShariaEvidence({ security, methodology: SFM_FTSE_POINT_IN_TIME,
    documents: Array.isArray(data.documents) ? data.documents as SourceDocument[] : [],
    financialValues: Array.isArray(data.financialValues) ? data.financialValues as FinancialValue[] : [],
  });
  const patch = catalogPatchForResearch(result);
  return { shariahStatus: patch.shariah_status as ShariahClassification['shariahStatus'], shariahReason: patch.shariah_reason,
    shariahSource: patch.shariah_source, shariahLastReviewedAt: patch.shariah_last_reviewed_at,
    shariahReviewedBy: patch.shariah_reviewed_by, shariahScreeningData: patch.shariah_screening_data,
    shariahManualOverride: false, shariahMethod: 'automatic_screening' };
}

export async function refreshSfmShariahClassifications(admin: SupabaseClient, options: { limit?: number; force?: boolean; symbolId?: string } = {}) {
  const started = Date.now();
  const limit = cleanRefreshLimit(options.limit);
  const signal = AbortSignal.timeout(45_000);
  const report = { ok: true, scanned: 0, updated: 0, compliant: 0, nonCompliant: 0, needsReview: 0, unclassified: 0,
    skippedManual: 0, skippedConcurrent: 0, hasMore: false, failed: [] as Array<{ symbol: string; reason: string }>,
    model: 'SFM evidence v2', methodology: SFM_FTSE_POINT_IN_TIME.name, runId: '' };
  const run = await admin.from('shariah_refresh_runs').insert({}).select('id').single();
  if (run.error || !run.data) throw new Error('REFRESH_MIGRATION_OR_DATABASE_UNAVAILABLE');
  report.runId = run.data.id;
  try {
    while (report.scanned < limit && Date.now() - started < 35_000) {
      const claim = await admin.rpc('claim_shariah_refresh_batch', { p_run_id: report.runId, p_limit: Math.min(3, limit - report.scanned), p_force: options.force === true, p_symbol_id: options.symbolId ?? null });
      if (claim.error) throw new Error('REFRESH_CLAIM_FAILED');
      const rows = claim.data as Array<{ id: string; symbol: string; provider_symbol: string; name: string; exchange: string; country: string; updated_at: string }>;
      if (!rows?.length) break;
      await Promise.all(rows.map(async row => {
        report.scanned++;
        let patch: ReturnType<typeof catalogPatchForResearch> | null = null;
        let error: string | null = null;
        try {
          const fresh = await enrichShariahScreeningData({ symbol: row.symbol, providerSymbol: row.provider_symbol,
            name: row.name, exchange: row.exchange, country: row.country, signal });
          if (!fresh.documents.length) throw new Error(fresh.errors[0] ?? 'official_evidence_unavailable');
          const result = analyzeShariaEvidence({ security: fresh.security, documents: fresh.documents,
            financialValues: fresh.financialValues, methodology: SFM_FTSE_POINT_IN_TIME });
          patch = catalogPatchForResearch(result);
        } catch (failure) { error = failure instanceof Error && /^[a-z_]+$/.test(failure.message) ? failure.message : 'screening_failed_or_timed_out'; }
        const saved = await admin.rpc('finish_shariah_refresh', { p_run_id: report.runId, p_symbol_id: row.id,
          p_expected_updated_at: row.updated_at, p_patch: patch, p_error: error });
        if (saved.error) error = 'refresh_persistence_failed';
        if (error) { report.failed.push({ symbol: row.symbol, reason: error }); return; }
        if (saved.data !== 1 || !patch) { report.skippedConcurrent++; return; }
        report.updated++;
        if (patch.shariah_status === 'compliant') report.compliant++;
        else if (patch.shariah_status === 'non_compliant') report.nonCompliant++;
        else report.needsReview++;
      }));
    }
    report.hasMore = report.scanned >= limit || Date.now() - started >= 35_000;
  } catch { report.failed.push({ symbol: 'refresh', reason: 'refresh_database_or_claim_failed' }); }
  report.ok = report.failed.length === 0;
  const finished = await admin.from('shariah_refresh_runs').update({ finished_at: new Date().toISOString(),
    status: report.ok ? report.hasMore ? 'partial' : 'completed' : 'failed', result: report }).eq('id', report.runId);
  if (finished.error) { report.ok = false; report.failed.push({ symbol: 'refresh', reason: 'refresh_run_log_write_failed' }); }
  return report;
}
