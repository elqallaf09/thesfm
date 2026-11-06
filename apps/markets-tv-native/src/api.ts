export type Language = 'ar' | 'en' | 'fr';
export type Scene = 'overview' | 'gulf' | 'world' | 'assets';
export type Quote = {
  symbol: string; name: string; nameAr: string; price: number | null; currency: string | null;
  source: string | null; observedAt: string | null; changePercent: number | null;
  status: string; issue?: string; changeBasis?: string; delayType?: string;
};
export type Snapshot = { scene: Scene; summary: Quote[]; quotes: Quote[]; retryAt: string | null };
export const SCENES: Scene[] = ['overview', 'gulf', 'world', 'assets'];
export const ORIGIN = 'https://www.the-sfm.com';
const groups: Record<Scene, string> = { overview: 'global', gulf: 'gulf', world: 'world', assets: 'commodities' };
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown) => typeof v === 'string' && v.trim() ? v : null;
const numeric = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
export const snapshotPath = (scene: Scene) => `/api/tv/snapshot?group=${groups[scene]}&scene=${scene}&pageSize=10`;
function parseQuote(input: unknown): Quote | null {
  const row = object(input), symbol = text(row.symbol);
  if (!symbol) return null;
  const price = numeric(row.price), source = text(row.source), observedAt = text(row.observedAt);
  const valid = price !== null && price > 0 && source !== null && observedAt !== null && Number.isFinite(Date.parse(observedAt));
  return { symbol, name: text(row.name) || symbol, nameAr: text(row.nameAr) || text(row.name) || symbol,
    price: valid ? price : null, source: valid ? source : null, observedAt: valid ? observedAt : null,
    currency: text(row.currency), changePercent: valid ? numeric(row.changePercent) : null,
    status: valid ? text(row.status) || 'unknown_delay' : 'unavailable', issue: text(row.issue) || undefined,
    changeBasis: text(row.changeBasis) || undefined, delayType: text(row.delayType) || undefined };
}
export function parseSnapshot(input: unknown, scene: Scene): Snapshot {
  const row = object(input);
  if (row.scene !== scene || !Array.isArray(row.quotes) || !Array.isArray(row.summary)) throw new Error('INVALID_SNAPSHOT');
  const quotes = (values: unknown[]) => values.slice(0, 16).flatMap(v => { const q = parseQuote(v); return q ? [q] : []; });
  return { scene, summary: quotes(row.summary), quotes: quotes(row.quotes), retryAt: text(row.retryAt) };
}
export async function readSnapshot(scene: Scene, signal: AbortSignal): Promise<Snapshot> {
  const response = await fetch(ORIGIN + snapshotPath(scene), { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return parseSnapshot(await response.json(), scene);
}
export function hasPrice(quote: Quote, now = Date.now()) {
  const observed = Date.parse(quote.observedAt || '');
  return quote.price !== null && Number.isFinite(quote.price) && quote.price > 0 && Boolean(quote.source)
    && Number.isFinite(observed) && observed <= now + 60_000 && now - observed <= 7 * 86_400_000;
}
export function currentStatus(quote: Quote, now = Date.now()) {
  if (!hasPrice(quote, now)) return 'unavailable';
  if (quote.issue || quote.status === 'stale') return 'stale';
  if (['closed', 'reference'].includes(quote.status) || quote.delayType === 'eod') return quote.status === 'reference' ? 'reference' : 'closed';
  return now - Date.parse(quote.observedAt!) > (quote.status === 'available' ? 15 : 45) * 60_000 ? 'stale' : quote.status;
}
export function sampleMetrics(quotes: Quote[], now = Date.now()) {
  const unique = [...new Map(quotes.map(q => [q.symbol, q])).values()];
  const available = unique.filter(q => hasPrice(q, now));
  const comparable = available.filter(q => !q.issue && ['available', 'delayed', 'closed'].includes(currentStatus(q, now))
    && q.changeBasis === 'session' && q.changePercent !== null);
  return { total: unique.length, available: available.length, comparable: comparable.length,
    rising: comparable.filter(q => q.changePercent! > 0).length, falling: comparable.filter(q => q.changePercent! < 0).length,
    average: comparable.length ? comparable.reduce((sum, q) => sum + q.changePercent!, 0) / comparable.length : null };
}
