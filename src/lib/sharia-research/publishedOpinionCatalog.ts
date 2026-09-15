import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { loadDfmPublishedOpinions } from './dfmPublishedOpinions';
import { secureFetch } from './secureFetch';

// Visually checked against PDF page 18 (printed pp32–33), dated 2026-01-04.
// A changed document invalidates this annotation instead of inheriting an opinion.
const KFH_REPORT = 'https://www.kfh.com/en/reports/kuwait/Annual-Reports/Annual-Report-2025/document_en/KFH%20Annual%20Report%20En%202025%20(Draft-17)%20Web.pdf.pdf';
const KFH_SHA256 = '38cf027fcd29e7399b7d53fc9e902f450bea4dce08ec23bd6ec0756104a1d386';
export function verifiedKfhOpinion(hash: string, retrievedAt: string) {
  if (hash !== KFH_SHA256 || !Number.isFinite(Date.parse(retrievedAt)) || Date.parse(retrievedAt) < Date.parse('2026-01-04')) throw new Error('kfh_board_report_changed_or_invalid');
  return { source: 'KFH_BOARD', exchange: 'XKUW', symbol: 'KFH', name: 'Kuwait Finance House',
    opinion: 'compliant', original_wording: 'Board opinion on contracts and transactions presented for fiscal year 2025.',
    as_of: '2025-12-31', issued_at: '2026-01-04', source_url: KFH_REPORT + '#page=18', source_hash: hash,
    retrieved_at: retrievedAt, review_after: '2026-12-31', scope: 'issuer_operations_annual',
    publisher: 'KFH Fatwa & Sharia Supervisory Board', notes: 'Summary, not a verbatim quotation: source-checked annual operations opinion, not an SFM FTSE financial-ratio pass or an investment fatwa. Printed pages 32–33; PDF page 18.' };
}
type Outcome = { source: string; ok: boolean; saved: number; code?: string; asOf?: string };
export async function syncPublishedOpinions(admin: SupabaseClient, signal: AbortSignal, force = false) {
  // Independent sources progress concurrently: a slow exchange must not starve
  // the issuer-board document, and neither source may erase the other's history.
  const outcomes = await Promise.all(['DFM', 'KFH_BOARD'].map(async (source): Promise<Outcome> => {
    try {
      signal.throwIfAborted();
      if (!force) {
        const latest = await admin.from('shariah_published_opinions').select('retrieved_at').eq('source', source)
          .order('retrieved_at', { ascending: false }).limit(1).abortSignal(AbortSignal.timeout(3000)).maybeSingle();
        if (latest.error) throw new Error('publication_storage_unavailable');
        const stamp = Date.parse(latest.data?.retrieved_at ?? '');
        if (stamp <= Date.now() && Date.now() - stamp < 6 * 3600_000) return { source, ok: true, saved: 0 };
      }
      let items;
      if (source === 'DFM') {
        const opinions = await loadDfmPublishedOpinions(signal);
        items = opinions.map(item => ({ source: item.source, exchange: item.exchange, symbol: item.symbol, name: item.name,
          opinion: item.opinion, original_wording: item.originalWording, as_of: item.asOf, issued_at: null,
          source_url: item.sourceUrl, source_hash: item.sourceHash, retrieved_at: item.retrievedAt,
          review_after: new Date(Date.UTC(item.year, item.quarter * 3 + 3, 0)).toISOString().slice(0, 10),
          scope: 'exchange_quarterly_list', publisher: 'Dubai Financial Market', notes: 'A published exchange classification under its own methodology. Absence from the list is not a negative opinion.' }));
      } else {
        const document = await secureFetch(KFH_REPORT, { signal, maxBytes: 15 * 1024 * 1024, acceptedContentTypes: ['application/pdf'], cacheTtlMs: 6 * 3600_000 });
        if (document.finalUrl !== KFH_REPORT) throw new Error('kfh_board_source_redirected');
        items = [verifiedKfhOpinion(createHash('sha256').update(document.body).digest('hex'), document.retrievedAt)];
      }
      signal.throwIfAborted();
      if (!items.length) throw new Error('publication_list_empty');
      const stored = await admin.rpc('replace_shariah_publication_period', { p_source: source, p_items: items }).abortSignal(AbortSignal.timeout(4000));
      if (stored.error || stored.data !== items.length) throw new Error('publication_persistence_failed');
      return { source, ok: true, saved: stored.data, asOf: items[0].as_of };
    } catch (error) {
      return { source, ok: false, saved: 0, code: signal.aborted ? 'publication_refresh_timed_out'
        : error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : 'publication_source_unavailable' };
    }
  }));
  return { ok: outcomes.every(item => item.ok), sources: outcomes, saved: outcomes.reduce((sum, item) => sum + item.saved, 0) };
}
export async function readPublishedOpinions(admin: SupabaseClient) {
  const result = await admin.from('shariah_published_opinions')
    .select('source,exchange,symbol,name,opinion,original_wording,as_of,issued_at,source_url,retrieved_at,review_after,scope,publisher,notes')
    .order('as_of', { ascending: false }).order('symbol').limit(1000).abortSignal(AbortSignal.timeout(5000));
  if (result.error) throw new Error('PUBLICATION_READ_UNAVAILABLE');
  const newest = new Map<string, string>();
  for (const item of result.data ?? []) if (!newest.has(item.source)) newest.set(item.source, item.as_of);
  return (result.data ?? []).filter(item => item.as_of === newest.get(item.source)).map(item => ({ ...item,
    reviewDue: new Date().toISOString().slice(0, 10) > item.review_after,
    scopeLabel: item.scope === 'issuer_operations_annual' ? 'annual_operations_opinion' : 'quarterly_exchange_opinion' }));
}
