import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { identifySecurity } from './identifySecurity';
import { getMethodology } from './methodologies';
import { researchSecurity } from './orchestrator';
import type {
  NormalizedQuery,
  ResearchJobStatus,
  ResearchProgressStep,
  SecurityCandidate,
  SecurityIdentity,
  ShariaScreeningResult,
  SourceDocument,
} from './types';

type DbClient = SupabaseClient<any, 'public', any>;

export class ResearchJobCancelledError extends Error {
  constructor() {
    super('RESEARCH_JOB_CANCELLED');
    this.name = 'ResearchJobCancelledError';
  }
}

function compactHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function researchIdempotencyKey(input: {
  userId: string;
  normalizedQuery: string;
  canonicalId?: string | null;
  methodologyId: string;
  methodologyVersion: string;
  forceRefresh?: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const window = input.forceRefresh
    ? now.toISOString().slice(0, 19)
    : now.toISOString().slice(0, 13);
  return compactHash([input.userId, input.normalizedQuery, input.canonicalId ?? '', input.methodologyId, input.methodologyVersion, window].join('|'));
}

export function securityRowToIdentity(row: Record<string, any>): SecurityIdentity {
  return {
    id: String(row.id),
    canonicalId: String(row.canonical_id),
    name: String(row.company_name),
    nameAr: row.company_name_ar,
    ticker: String(row.ticker),
    providerSymbol: String(row.provider_symbol),
    exchange: String(row.exchange),
    exchangeMic: row.exchange_mic,
    isin: row.isin,
    cik: row.cik,
    lei: row.lei,
    country: row.country,
    sector: row.sector,
    industry: row.industry,
    currency: row.currency,
    logoUrl: row.logo_url,
    website: row.website,
    lastVerifiedAt: row.last_verified_at,
    aliases: Array.isArray(row.aliases) ? row.aliases.map(String) : [],
    previousNames: Array.isArray(row.previous_names) ? row.previous_names.map(String) : [],
    identitySources: Array.isArray(row.identity_sources) ? row.identity_sources : [],
  };
}

export async function persistSecurityIdentity(admin: DbClient, security: SecurityIdentity) {
  const payload = {
    canonical_id: security.canonicalId,
    company_name: security.name,
    company_name_ar: security.nameAr ?? null,
    ticker: security.ticker,
    provider_symbol: security.providerSymbol,
    exchange: security.exchange,
    exchange_mic: security.exchangeMic ?? null,
    isin: security.isin ?? null,
    cik: security.cik ?? null,
    lei: security.lei ?? null,
    country: security.country ?? null,
    sector: security.sector ?? null,
    industry: security.industry ?? null,
    currency: security.currency ?? null,
    logo_url: security.logoUrl ?? null,
    website: security.website ?? null,
    aliases: security.aliases,
    previous_names: security.previousNames,
    identity_sources: security.identitySources,
    last_verified_at: new Date().toISOString(),
  };
  const saved = await admin
    .from('sharia_security_identities')
    .upsert(payload, { onConflict: 'canonical_id' })
    .select('*')
    .single();
  if (saved.error || !saved.data) throw new Error(`SECURITY_IDENTITY_SAVE_FAILED:${saved.error?.message ?? 'unknown'}`);
  return securityRowToIdentity(saved.data);
}

export async function findRecentCachedResult(admin: DbClient, userId: string, securityId: string, methodologyId: string, methodologyVersion: string) {
  const response = await admin
    .from('sharia_screening_results')
    .select('id,result_payload,research_timestamp,cache_state,invalidated_at')
    .eq('user_id', userId)
    .eq('security_id', securityId)
    .eq('methodology_id', methodologyId)
    .eq('methodology_version', methodologyVersion)
    .is('invalidated_at', null)
    .order('research_timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (response.error || !response.data) return null;
  const age = Date.now() - new Date(response.data.research_timestamp).getTime();
  if (!Number.isFinite(age) || age > 24 * 60 * 60 * 1000 || response.data.cache_state === 'outdated') return null;
  return {
    id: String(response.data.id),
    result: { ...(response.data.result_payload as ShariaScreeningResult), cacheState: 'recently_cached' as const },
    researchTimestamp: String(response.data.research_timestamp),
  };
}

export async function createResearchJob(admin: DbClient, input: {
  userId: string;
  query: NormalizedQuery;
  security?: SecurityIdentity | null;
  candidates?: SecurityCandidate[];
  status?: ResearchJobStatus;
  methodologyId?: string | null;
  forceRefresh?: boolean;
}) {
  const methodology = getMethodology(input.methodologyId);
  const idempotencyKey = researchIdempotencyKey({
    userId: input.userId,
    normalizedQuery: input.query.normalized,
    canonicalId: input.security?.canonicalId,
    methodologyId: methodology.id,
    methodologyVersion: methodology.version,
    forceRefresh: input.forceRefresh,
  });
  const existing = await admin
    .from('sharia_research_jobs')
    .select('*')
    .eq('user_id', input.userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (!existing.error && existing.data) return existing.data;

  const status = input.status ?? 'queued';
  const inserted = await admin.from('sharia_research_jobs').insert({
    user_id: input.userId,
    security_id: input.security?.id ?? null,
    methodology_id: methodology.id,
    methodology_version: methodology.version,
    original_query: input.query.original,
    normalized_query: input.query,
    status,
    current_step: status === 'awaiting_selection' ? 'awaiting_security_selection' : 'identifying_security',
    progress: status === 'awaiting_selection' ? 10 : 5,
    candidates: input.candidates ?? [],
    idempotency_key: idempotencyKey,
    request_payload: {
      forceRefresh: Boolean(input.forceRefresh),
      market: input.query.exchangeHint ?? null,
    },
  }).select('*').single();
  if (inserted.error || !inserted.data) throw new Error(`RESEARCH_JOB_CREATE_FAILED:${inserted.error?.message ?? 'unknown'}`);
  return inserted.data;
}

async function updateProgress(admin: DbClient, jobId: string, userId: string, step: ResearchProgressStep, progress: number) {
  const cancellation = await admin
    .from('sharia_research_jobs')
    .select('cancellation_requested_at,status,expires_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();
  if (cancellation.data?.cancellation_requested_at || cancellation.data?.status === 'cancelled') throw new ResearchJobCancelledError();
  if (cancellation.data?.expires_at && new Date(cancellation.data.expires_at).getTime() <= Date.now()) throw new Error('RESEARCH_JOB_EXPIRED');
  await admin.from('sharia_research_jobs').update({ current_step: step, progress }).eq('id', jobId).eq('user_id', userId);
}

function sourceRow(document: SourceDocument, jobId: string, securityId: string) {
  return {
    id: document.id,
    job_id: jobId,
    security_id: securityId,
    adapter_id: document.adapterId,
    source_title: document.sourceTitle,
    publisher: document.publisher,
    domain: document.domain,
    source_url: document.sourceUrl,
    canonical_url: document.canonicalUrl,
    grouped_urls: document.groupedUrls ?? [document.sourceUrl],
    publication_date: document.publicationDate,
    filing_date: document.filingDate,
    retrieval_date: document.retrievalDate,
    source_type: document.sourceType,
    source_tier: document.tier,
    reliability: document.reliability,
    extracted_text: document.extractedText,
    evidence_snippets: document.evidenceSnippets,
    reporting_period: document.reportingPeriod,
    content_hash: document.contentHash,
    mime_type: document.mimeType,
    extraction_status: document.extractionStatus,
    error_info: document.error,
    supports: document.supports,
  };
}

async function persistDocuments(admin: DbClient, documents: SourceDocument[], jobId: string, securityId: string) {
  const idMap = new Map<string, string>();
  for (const document of documents) {
    const existing = await admin
      .from('sharia_source_documents')
      .select('id')
      .eq('security_id', securityId)
      .eq('content_hash', document.contentHash)
      .eq('source_type', document.sourceType)
      .maybeSingle();
    if (!existing.error && existing.data?.id) {
      idMap.set(document.id, String(existing.data.id));
      continue;
    }
    const inserted = await admin.from('sharia_source_documents').insert(sourceRow(document, jobId, securityId)).select('id').single();
    if (inserted.error || !inserted.data) throw new Error(`SOURCE_DOCUMENT_SAVE_FAILED:${inserted.error?.message ?? 'unknown'}`);
    idMap.set(document.id, String(inserted.data.id));
  }
  return idMap;
}

async function invalidateOlderResults(admin: DbClient, securityId: string, methodologyId: string, reportingPeriod: string | null) {
  if (!reportingPeriod) return;
  await admin
    .from('sharia_screening_results')
    .update({ invalidated_at: new Date().toISOString(), cache_state: 'outdated' })
    .eq('security_id', securityId)
    .eq('methodology_id', methodologyId)
    .lt('reporting_period', reportingPeriod)
    .is('invalidated_at', null);
}

async function persistResearchResult(admin: DbClient, input: {
  userId: string;
  jobId: string;
  security: SecurityIdentity;
  result: ShariaScreeningResult;
  financialValues: Awaited<ReturnType<typeof researchSecurity>>['financialValues'];
}) {
  const documentIdMap = await persistDocuments(admin, [...input.result.documents, ...input.result.relatedNews], input.jobId, input.security.id!);
  await invalidateOlderResults(admin, input.security.id!, input.result.methodology.id, input.result.reportingPeriod);
  const resultId = input.result.id || randomUUID();
  const resultPayload = {
    ...input.result,
    id: resultId,
    security: input.security,
    documents: input.result.documents.map(document => ({ ...document, id: documentIdMap.get(document.id) ?? document.id, extractedText: '' })),
    relatedNews: input.result.relatedNews.map(document => ({ ...document, id: documentIdMap.get(document.id) ?? document.id, extractedText: '' })),
    evidence: input.result.evidence.map(item => ({ ...item, documentId: documentIdMap.get(item.documentId) ?? item.documentId })),
  };
  const saved = await admin.from('sharia_screening_results').insert({
    id: resultId,
    user_id: input.userId,
    job_id: input.jobId,
    security_id: input.security.id,
    methodology_id: input.result.methodology.id,
    methodology_version: input.result.methodology.version,
    classification: input.result.classification,
    confidence: input.result.confidence,
    reporting_period: input.result.reportingPeriod,
    last_financial_report_date: input.result.lastFinancialReportDate,
    source_count: input.result.sourceCount,
    source_quality_breakdown: input.result.sourceQualityBreakdown,
    business_screen: input.result.businessScreen,
    financial_ratio_result: input.result.financialRatios,
    failed_checks: input.result.failedChecks,
    unavailable_checks: input.result.unavailableChecks,
    conflicts: input.result.conflicts,
    reasons: input.result.reasons,
    warnings: input.result.warnings,
    result_payload: resultPayload,
    research_timestamp: input.result.retrievedAt,
    cache_state: 'live',
  }).select('id').single();
  if (saved.error) throw new Error(`SCREENING_RESULT_SAVE_FAILED:${saved.error.message}`);

  if (input.result.evidence.length > 0) {
    const evidenceRows = input.result.evidence.map(item => ({
      id: item.id,
      result_id: resultId,
      document_id: documentIdMap.get(item.documentId) ?? item.documentId,
      category: item.category,
      conclusion: item.conclusion,
      excerpt: item.excerpt,
      source_url: item.sourceUrl,
      source_title: item.sourceTitle,
      publisher: item.publisher,
      publication_date: item.publicationDate,
      retrieval_date: item.retrievalDate,
      source_tier: item.tier,
      reliability: item.reliability,
      reporting_period: item.reportingPeriod,
    }));
    const evidenceSave = await admin.from('sharia_evidence_items').insert(evidenceRows);
    if (evidenceSave.error) throw new Error(`EVIDENCE_SAVE_FAILED:${evidenceSave.error.message}`);
  }
  if (input.financialValues.length > 0) {
    const valueRows = input.financialValues.map(value => ({
      id: value.id,
      result_id: resultId,
      document_id: documentIdMap.get(value.documentId) ?? value.documentId,
      reporting_period: value.reportingPeriod,
      period_end: value.periodEnd,
      filed_at: value.filedAt,
      currency: value.currency,
      value: value.value,
      unit: value.unit,
      original_field: value.originalField,
      normalized_field: value.normalizedField,
      normalization_formula: value.normalizationFormula,
      accession_number: value.accessionNumber,
      form: value.form,
    }));
    const valuesSave = await admin.from('sharia_financial_values').insert(valueRows);
    if (valuesSave.error) throw new Error(`FINANCIAL_VALUES_SAVE_FAILED:${valuesSave.error.message}`);
  }
  return { resultId, resultPayload };
}

export async function processResearchJob(admin: DbClient, jobId: string, userId: string) {
  const current = await admin.from('sharia_research_jobs').select('*').eq('id', jobId).eq('user_id', userId).single();
  if (current.error || !current.data) throw new Error('RESEARCH_JOB_NOT_FOUND');
  const job = current.data;
  if (['completed', 'cancelled', 'expired', 'awaiting_selection'].includes(job.status)) return job;
  if (new Date(job.expires_at).getTime() <= Date.now()) {
    await admin.from('sharia_research_jobs').update({ status: 'expired', error_code: 'JOB_EXPIRED' }).eq('id', jobId).eq('user_id', userId);
    return { ...job, status: 'expired' };
  }

  if (job.status === 'running') {
    const updatedAt = new Date(job.updated_at).getTime();
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt < 2 * 60 * 1000) return job;
    await admin.from('sharia_research_jobs').update({
      status: 'queued',
      retry_count: Math.min(Number(job.retry_count ?? 0) + 1, Number(job.max_retries ?? 2)),
      error_code: 'STALE_WORKER_RECLAIMED',
      error_message: 'A stale worker lease was reclaimed after progress stopped for two minutes.',
    }).eq('id', jobId).eq('user_id', userId).eq('status', 'running');
  }

  const claimed = await admin.from('sharia_research_jobs').update({
    status: 'running',
    started_at: job.started_at ?? new Date().toISOString(),
    current_step: 'searching_official_sources',
    progress: Math.max(Number(job.progress), 12),
  }).eq('id', jobId).eq('user_id', userId).eq('status', 'queued').select('*').maybeSingle();
  if (claimed.error || !claimed.data) return job;

  try {
    const securityRow = await admin.from('sharia_security_identities').select('*').eq('id', claimed.data.security_id).single();
    if (securityRow.error || !securityRow.data) throw new Error('SECURITY_IDENTITY_NOT_FOUND');
    const security = securityRowToIdentity(securityRow.data);
    const researched = await researchSecurity({
      security,
      query: claimed.data.normalized_query as NormalizedQuery,
      methodologyId: claimed.data.methodology_id,
      manualUrls: Array.isArray(claimed.data.manual_urls) ? claimed.data.manual_urls.map(String) : [],
      onProgress: (step, progress) => updateProgress(admin, jobId, userId, step, progress),
    });
    const updatedSecurity = await persistSecurityIdentity(admin, researched.result.security);
    researched.result.security = updatedSecurity;
    const persisted = await persistResearchResult(admin, {
      userId,
      jobId,
      security: updatedSecurity,
      result: researched.result,
      financialValues: researched.financialValues,
    });
    await admin.from('sharia_research_jobs').update({
      status: 'completed',
      progress: 100,
      current_step: 'preparing_result',
      result_id: persisted.resultId,
      partial_errors: researched.adapterResults.flatMap(result => result.errors),
      completed_at: new Date().toISOString(),
    }).eq('id', jobId).eq('user_id', userId);
    await admin.from('sharia_search_history').insert({
      user_id: userId,
      job_id: jobId,
      result_id: persisted.resultId,
      original_query: claimed.data.original_query,
      normalized_query: (claimed.data.normalized_query as NormalizedQuery).normalized,
      security_id: updatedSecurity.id,
      methodology_id: researched.result.methodology.id,
      outcome: researched.result.classification,
    });
    return { ...claimed.data, status: 'completed', result_id: persisted.resultId, progress: 100 };
  } catch (error) {
    const cancelled = error instanceof ResearchJobCancelledError;
    const expired = error instanceof Error && error.message === 'RESEARCH_JOB_EXPIRED';
    const retryCount = Number(job.retry_count ?? 0);
    const canRetry = !cancelled && !expired && retryCount < Number(job.max_retries ?? 2);
    await admin.from('sharia_research_jobs').update({
      status: cancelled ? 'cancelled' : expired ? 'expired' : canRetry ? 'queued' : 'failed',
      retry_count: canRetry ? retryCount + 1 : retryCount,
      error_code: cancelled ? 'JOB_CANCELLED' : expired ? 'JOB_EXPIRED' : 'RESEARCH_PROCESSING_FAILED',
      error_message: error instanceof Error ? error.message.slice(0, 2_000) : String(error).slice(0, 2_000),
    }).eq('id', jobId).eq('user_id', userId);
    if (!canRetry && !cancelled && !expired) throw error;
    return { ...job, status: canRetry ? 'queued' : cancelled ? 'cancelled' : 'expired' };
  }
}

export async function resolveAndCreateJob(admin: DbClient, input: {
  userId: string;
  query: string;
  market?: string | null;
  methodologyId?: string | null;
  selectedCanonicalId?: string | null;
  forceRefresh?: boolean;
}) {
  const resolution = await identifySecurity(input.query, undefined, input.market);
  const methodology = getMethodology(input.methodologyId);
  if (resolution.status === 'not_found') {
    await admin.from('sharia_search_history').insert({
      user_id: input.userId,
      original_query: resolution.query.original,
      normalized_query: resolution.query.normalized,
      methodology_id: methodology.id,
      outcome: `not_found:${resolution.reason}`,
    });
    return { kind: 'not_found' as const, resolution };
  }
  if (resolution.status === 'ambiguous' && !input.selectedCanonicalId) {
    const job = await createResearchJob(admin, {
      userId: input.userId,
      query: resolution.query,
      candidates: resolution.candidates,
      status: 'awaiting_selection',
      methodologyId: input.methodologyId,
      forceRefresh: input.forceRefresh,
    });
    await admin.from('sharia_search_history').insert({
      user_id: input.userId,
      job_id: job.id,
      original_query: resolution.query.original,
      normalized_query: resolution.query.normalized,
      methodology_id: methodology.id,
      outcome: 'awaiting_selection',
    });
    return { kind: 'ambiguous' as const, resolution, job };
  }
  const selected = input.selectedCanonicalId
    ? resolution.candidates.find(candidate => candidate.canonicalId === input.selectedCanonicalId)
    : resolution.status === 'resolved' ? { ...resolution.security, score: 999, matchedOn: ['resolved'] } : null;
  if (!selected) return { kind: 'invalid_selection' as const, resolution };
  const { score: _score, matchedOn: _matchedOn, ...identity } = selected;
  const security = await persistSecurityIdentity(admin, identity);
  if (!input.forceRefresh) {
    const cached = await findRecentCachedResult(admin, input.userId, security.id!, methodology.id, methodology.version);
    if (cached) {
      await admin.from('sharia_search_history').insert({
        user_id: input.userId,
        result_id: cached.id,
        original_query: resolution.query.original,
        normalized_query: resolution.query.normalized,
        security_id: security.id,
        methodology_id: methodology.id,
        outcome: `cached:${cached.result.classification}`,
      });
      return { kind: 'cached' as const, resolution, security, cached };
    }
  }
  const job = await createResearchJob(admin, {
    userId: input.userId,
    query: resolution.query,
    security,
    candidates: resolution.candidates,
    methodologyId: methodology.id,
    forceRefresh: input.forceRefresh,
  });
  return { kind: 'job' as const, resolution, security, job };
}
