import 'server-only';
import { createHash } from 'node:crypto';
import { authorizeRiskRequest, type RiskServiceFailure } from './service.server';
import { loadHistoryPositionContext } from './history.server';
import { inspectHistoryCandidate, type HistoryImportPreview } from './historyEvidence';

export const MAX_HISTORY_IMPORT_BYTES = 2 * 1024 * 1024;
type PreviewResult = { ok: true; preview: HistoryImportPreview & { sha256: string } } | RiskServiceFailure;

/** Bounded streaming read; Content-Length alone is not a memory bound. */
async function readCandidate(request: Request): Promise<{ text: string; value: unknown }> {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('content-type') ?? '')) throw new Error('HISTORY_IMPORT_FORMAT');
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_HISTORY_IMPORT_BYTES)) throw new Error('HISTORY_IMPORT_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('HISTORY_IMPORT_FORMAT');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0; let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_HISTORY_IMPORT_BYTES) throw new Error('HISTORY_IMPORT_TOO_LARGE');
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return { text, value: JSON.parse(text) as unknown };
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** No INSERT, UPDATE, source approval, or stored raw account files. */
export async function previewHistoryImport(request: Request): Promise<PreviewResult> {
  const access = await authorizeRiskRequest(request);
  if (!access.ok) return access;
  let parsed: { text: string; value: unknown };
  try { parsed = await readCandidate(request); }
  catch (error) {
    const tooLarge = error instanceof Error && error.message === 'HISTORY_IMPORT_TOO_LARGE';
    return { ok: false, code: tooLarge ? 'HISTORY_IMPORT_TOO_LARGE' : 'HISTORY_IMPORT_FORMAT', status: tooLarge ? 413 : 400 };
  }
  try {
    const context = await loadHistoryPositionContext(access.userId);
    if (!context.ok) return context;
    const result = inspectHistoryCandidate({
      candidate: parsed.value, expectedPositions: context.expectedPositions,
      expectedCurrency: context.currency, now: Date.now(),
    });
    if (!result.ok) return { ...result, status: 422 };
    return { ok: true, preview: {
      ...result.preview, sha256: createHash('sha256').update(parsed.text, 'utf8').digest('hex'),
    } };
  } catch { return { ok: false, code: 'HISTORY_DATA_UNAVAILABLE', status: 503 }; }
}
