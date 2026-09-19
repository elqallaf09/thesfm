import 'server-only';

export type SourceRow = Record<string, unknown>;
export const sourceText = (value: unknown): string => typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
export function sourceNumber(value: unknown): number {
  const raw = sourceText(value).replace(/,/g, '');
  return raw ? Number(raw) : NaN;
}
export const sourceFalse = (value: unknown): boolean => value === false || value === 'false';
export const literal = (value: string): string => `'${value.replace(/'/g, "''")}'`;
export const recentCutoff = (now: Date): string => new Date(now.getTime() - 366 * 86_400_000).toISOString().slice(0, 10);
export function recentSale(value: unknown, now: Date): string | null {
  const date = sourceText(value).slice(0, 10);
  const parsed = new Date(date);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    && date >= recentCutoff(now) && date <= now.toISOString().slice(0, 10) ? date : null;
}
export function comparableArea(sourceM2: number, subjectM2: number): boolean {
  return Number.isFinite(sourceM2) && sourceM2 > 0 && sourceM2 >= subjectM2 * 0.5 && sourceM2 <= subjectM2 * 2;
}

/** Fixed provider endpoints only; bound bytes, rows, duration and redirects. */
export async function transactionRows(endpoint: string, query: Record<string, string>, fetcher = fetch): Promise<SourceRow[]> {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetcher(url, { headers: { Accept: 'application/json' }, redirect: 'error', cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('SOURCE_UNAVAILABLE');
    if (Number(response.headers.get('content-length')) > 2_000_000) throw new Error('SOURCE_RESPONSE_TOO_LARGE');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('SOURCE_SCHEMA_INVALID');
    const decoder = new TextDecoder(); let body = ''; let bytes = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 2_000_000) { await reader.cancel(); throw new Error('SOURCE_RESPONSE_TOO_LARGE'); }
        body += decoder.decode(part.value, { stream: true });
      }
    } finally { reader.releaseLock(); }
    body += decoder.decode();
    const rows: unknown = JSON.parse(body);
    if (!Array.isArray(rows) || rows.length > Number(query.$limit ?? 500)) throw new Error('SOURCE_SCHEMA_INVALID');
    return rows.filter((row): row is SourceRow => Boolean(row && typeof row === 'object' && !Array.isArray(row)));
  } finally { clearTimeout(timer); }
}
