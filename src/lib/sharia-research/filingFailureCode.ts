/** Stable diagnostics only; upstream messages may contain private transport data. */
export function filingFailureCode(error: unknown, signal?: AbortSignal): string {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : '';
  if (signal?.aborted || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))) return 'official_provider_timed_out';
  if (status === 429) return 'official_provider_rate_limited';
  if (status === 403) return 'official_provider_access_denied';
  if (code === 'DNS_RESOLUTION_FAILED') return 'official_provider_dns_failed';
  const regional: Record<string, string> = {
    regional_document_no_financial_rows: 'official_regional_statement_layout_unsupported',
    regional_document_issuer_mismatch: 'official_regional_issuer_mismatch',
    regional_document_identity_changed: 'official_regional_origin_changed',
    regional_financial_document_not_discovered: 'official_regional_document_not_discovered',
    pdf_size_limit: 'official_document_size_limit',
    pdf_page_limit: 'official_document_page_limit',
    pdf_text_limit: 'official_document_text_limit',
    pdf_conflicting_statement_values: 'official_document_conflicting_values',
  };
  if (Object.hasOwn(regional, message)) return regional[message];
  return /^(official_|sec_)[a-z_]+$/.test(message) ? message : 'official_provider_fetch_failed';
}
