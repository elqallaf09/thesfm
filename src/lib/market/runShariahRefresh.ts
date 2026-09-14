import type { ShariahRefreshSummary } from './shariahRefreshOutcome';

export type RefreshBatch = ShariahRefreshSummary & { runId: string; status?: string };
export type RefreshProgress = {
  scanned: number; updated: number; batches: number; runId: string | null;
  failed: Array<{ symbol: string; reason: string }>;
  hasMore: boolean; viewUnavailable: boolean;
};
export type RefreshCompletion = RefreshProgress & { stopped: boolean };
export class RefreshRequestError extends Error {
  constructor(public readonly code: string) { super(code); this.name = 'RefreshRequestError'; }
}
export const EMPTY_REFRESH_PROGRESS: RefreshProgress = {
  scanned: 0, updated: 0, batches: 0, runId: null, failed: [], hasMore: false, viewUnavailable: false,
};
function parseBatch(value: unknown): RefreshBatch | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<RefreshBatch>;
  if (typeof row.ok !== 'boolean' || typeof row.runId !== 'string' || !row.runId
    || !Number.isInteger(row.scanned) || !Number.isInteger(row.updated)
    || row.scanned! < 0 || row.updated! < 0 || row.updated! > row.scanned!
    || typeof row.hasMore !== 'boolean' || !Array.isArray(row.failed)
    || row.failed.some(item => !item || typeof item.symbol !== 'string' || typeof item.reason !== 'string')) return null;
  return row as RefreshBatch;
}
function pause(ms: number, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const aborted = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', aborted); resolve(); }, ms);
    signal.addEventListener('abort', aborted, { once: true });
  });
}

/** Serial, bounded browser requests. No detached work and no automatic replay of unknown writes. */
export async function runShariahRefresh(options: {
  signal: AbortSignal;
  onProgress: (progress: RefreshProgress) => void;
  reload: () => Promise<boolean | void>;
  shouldStop?: () => boolean;
  symbolId?: string;
  fetcher?: typeof fetch;
}): Promise<RefreshCompletion> {
  const fetcher = options.fetcher ?? fetch;
  const started = Date.now();
  let progress = { ...EMPTY_REFRESH_PROGRESS, failed: [] as RefreshProgress['failed'] };
  let nextRequestAt = started;
  const seenRuns = new Set<string>();
  for (let batch = 0; batch < 20; batch++) {
    options.signal.throwIfAborted();
    if (options.shouldStop?.() || Date.now() - started >= 120_000) return { ...progress, stopped: true };
    await pause(Math.max(0, nextRequestAt - Date.now()), options.signal);
    if (options.shouldStop?.() || Date.now() - started >= 120_000) return { ...progress, stopped: true };
    nextRequestAt = Date.now() + 5_500; // <= 12 authenticated requests per minute.
    const response = await fetcher('/api/market/shariah/refresh', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options.symbolId ? { limit: 1, symbolId: options.symbolId, force: true } : { limit: 3 }),
      signal: AbortSignal.any([options.signal, AbortSignal.timeout(35_000)]),
    });
    const value: unknown = await response.json().catch(() => null);
    if (response.status === 401 || response.status === 403) throw new RefreshRequestError('AUTH_REQUIRED');
    if (response.status === 429) throw new RefreshRequestError('RATE_LIMITED');
    const result = parseBatch(value);
    if (!result) throw new RefreshRequestError('REFRESH_RESPONSE_UNAVAILABLE');
    if (seenRuns.has(result.runId)) throw new RefreshRequestError('REPEATED_RUN');
    seenRuns.add(result.runId);
    progress = { ...progress, batches: progress.batches + 1, runId: result.runId,
      scanned: progress.scanned + result.scanned, updated: progress.updated + result.updated,
      failed: [...progress.failed, ...result.failed], hasMore: result.hasMore };
    options.onProgress(progress); // Show saved results BEFORE the separate catalog read.
    let viewUnavailable = false;
    try { viewUnavailable = await options.reload() === false; } catch { viewUnavailable = true; }
    progress = { ...progress, viewUnavailable };
    options.onProgress(progress);
    if (result.fatal) throw new RefreshRequestError('REFRESH_STORAGE_FAILED');
    // Explicit source failures are retained and retried by the server's due queue.
    // They do not erase the other saved results or block subsequent distinct rows.
    if ((!response.ok && !result.failed.length) || (!result.ok && !result.failed.length)) throw new RefreshRequestError('REFRESH_FAILED');
    if (options.symbolId || !result.hasMore || result.scanned === 0) return { ...progress, stopped: false };
  }
  return { ...progress, stopped: true };
}
