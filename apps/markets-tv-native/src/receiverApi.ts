import { ORIGIN, parseQuote, type Quote } from './api';
import { receiverNewsPath, receiverNewsPayload, type TvReceiverNewsChannel } from '../../../src/lib/markets-tv/newsReceiver';

export const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const text = (v: unknown) => typeof v === 'string' && v.trim() ? v : null;
const numeric = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
export const validToken = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
export class TvRequestError extends Error {
  constructor(readonly status: number, readonly retryAfterMs = 0) { super(`TV_HTTP_${status}`); }
}
const cooldown = new Map<string, number>();
export async function request(path: string, signal: AbortSignal, token?: string, method = 'GET', body?: unknown): Promise<unknown> {
  // Keep credentials on the fixed first-party origin; never follow redirects with a device token.
  if (!path.startsWith('/api/') || path.startsWith('//')) throw new Error('INVALID_PATH');
  const key = `${method}:${path.split('?')[0]}`;
  const wait = (cooldown.get(key) || 0) - Date.now();
  if (wait > 0) throw new TvRequestError(429, wait);
  const response = await fetch(ORIGIN + path, { method, signal, redirect: 'error', cache: 'no-store',
    headers: { accept: 'application/json', origin: 'null', ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(token ? { 'x-sfm-tv-token': token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) {
    const header = response.headers.get('retry-after');
    const parsed = header ? Number.isFinite(Number(header)) ? Number(header) * 1000 : Date.parse(header) - Date.now() : 0;
    const delay = Math.max(response.status === 429 ? 60_000 : 0, Number.isFinite(parsed) ? parsed : 0);
    if (delay) cooldown.set(key, Date.now() + delay);
    throw new TvRequestError(response.status, delay);
  }
  return response.json();
}
export type Pair = { code: string; secret: string; expiresAt: string };
export function parsePair(value: unknown, now = Date.now()): Pair {
  const row = record(value), expiry = Date.parse(String(row.expiresAt));
  if (typeof row.code !== 'string' || !/^[A-F0-9]{12}$/.test(row.code.replaceAll('-', '')) || !validToken(row.secret)
    || !Number.isFinite(expiry) || expiry <= now || expiry > now + 660_000) throw new Error('INVALID_PAIR');
  return { code: row.code, secret: row.secret, expiresAt: String(row.expiresAt) };
}
export type Market = { id: string; group: string; labelAr: string; labelEn: string; labelFr: string; count: number };
export async function readCatalog(signal: AbortSignal): Promise<Market[]> {
  const body = record(await request('/api/tv/catalog', signal));
  if (!Array.isArray(body.markets)) throw new Error('INVALID_CATALOG');
  return body.markets.flatMap(value => {
    const row = record(value);
    return text(row.id) && text(row.group) && text(row.labelEn) ? [{ id: String(row.id), group: String(row.group), labelAr: text(row.labelAr) || String(row.labelEn), labelEn: String(row.labelEn), labelFr: text(row.labelFr) || String(row.labelEn), count: numeric(row.count) || 0 }] : [];
  });
}
export type Directory = { quotes: Quote[]; pages: number; generatedAt: string | null };
export const NATIVE_QUOTES_PER_PAGE = 3;
export function directoryLocation(markets: Market[], cursor: number) {
  const counts = markets.map(m => Math.max(1, Math.ceil(m.count / NATIVE_QUOTES_PER_PAGE)));
  const total = counts.reduce((sum, count) => sum + count, 0);
  let page = ((cursor % Math.max(1, total)) + Math.max(1, total)) % Math.max(1, total), index = 0, start = 0;
  while (index < counts.length - 1 && page >= counts[index]) { page -= counts[index]; start += counts[index]; index++; }
  return { market: markets[index], page, start, pages: counts[index] || 1, total: Math.max(1, total) };
}
export async function readDirectory(market: Market, page: number, signal: AbortSignal): Promise<Directory> {
  const query = `group=${encodeURIComponent(market.group)}&market=${encodeURIComponent(market.id)}&page=${page}&pageSize=${NATIVE_QUOTES_PER_PAGE}`;
  const body = record(await request(`/api/tv/snapshot?${query}`, signal));
  if (body.group !== market.group || body.market !== market.id || !Array.isArray(body.quotes)) throw new Error('INVALID_DIRECTORY');
  return { quotes: body.quotes.slice(0, NATIVE_QUOTES_PER_PAGE).flatMap(value => { const q = parseQuote(value); return q ? [q] : []; }),
    pages: Math.max(1, Math.ceil((numeric(body.directoryTotal) || 0) / NATIVE_QUOTES_PER_PAGE)), generatedAt: text(body.generatedAt) };
}
export async function readNews(channel: TvReceiverNewsChannel, language: 'ar' | 'en' | 'fr', signal: AbortSignal) {
  const data = receiverNewsPayload(await request(receiverNewsPath(channel, language), signal), channel);
  if (data.invalid) throw new Error('INVALID_NEWS');
  return data;
}
export type Position = { id: string; name: string; symbol: string | null; amount: number | null; currency: string | null; valuedAt: string | null; freshness: string };
export type Portfolio = { currency: string; totalValue: number | null; valueCoverage: number; total: number; generatedAt: string; positions: Position[] };
export function parsePortfolio(value: unknown): Portfolio {
  const row = record(value);
  if (!Array.isArray(row.positions) || !/^[A-Z]{3}$/.test(String(row.currency)) || !Number.isFinite(Date.parse(String(row.generatedAt)))) throw new Error('INVALID_PORTFOLIO');
  const positions = row.positions.map(value => {
    const item = record(value), valuation = record(item.value);
    if (!text(item.id) || !text(item.name)) throw new Error('INVALID_POSITION');
    return { id: String(item.id), name: String(item.name), symbol: text(item.symbol), amount: numeric(valuation.amount), currency: text(valuation.currency),
      valuedAt: text(item.valuedAt), freshness: ['recorded', 'stale', 'missing'].includes(String(item.freshness)) ? String(item.freshness) : 'missing' };
  });
  return { currency: String(row.currency), totalValue: numeric(row.totalValue), valueCoverage: numeric(row.valueCoverage) || 0,
    total: numeric(row.total) ?? positions.length, generatedAt: String(row.generatedAt), positions };
}
