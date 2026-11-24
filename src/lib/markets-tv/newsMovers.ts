import type { TvLanguage } from './types';
import type { TvReceiverNewsChannel } from './newsReceiver';

export const NEWS_MOVER_KEYS = ['gainers', 'losers', 'mostTraded', 'leastTraded'] as const;
export type NewsMoverKey = typeof NEWS_MOVER_KEYS[number];
export type NewsMover = {
  symbol: string; name: string; exchange?: string | null; currency: string;
  price: number; changePercent: number | null; volume: number | null;
};
export type NewsMoverLists = Record<NewsMoverKey, NewsMover[]>;
export type NewsMovers = { channel: TvReceiverNewsChannel; lists: NewsMoverLists; updatedAt: string | null; source: string | null };
export const emptyNewsMovers = (): NewsMoverLists => ({ gainers: [], losers: [], mostTraded: [], leastTraded: [] });
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function moverRow(raw: unknown): NewsMover | null {
  const row = record(raw), price = number(row.price), volume = number(row.volume);
  if (typeof row.symbol !== 'string' || !row.symbol.trim() || typeof row.name !== 'string' || !row.name.trim()
    || typeof row.currency !== 'string' || !row.currency.trim() || price === null || price <= 0 || row.available === false
    || row.suspended === true || row.status === 'suspended') return null;
  return { symbol: row.symbol, name: row.name, exchange: typeof row.exchange === 'string' ? row.exchange : null,
    currency: row.currency, price, changePercent: number(row.changePercent), volume: volume !== null && volume >= 0 ? volume : null };
}
export function rankNewsMovers(input: readonly unknown[]): NewsMoverLists {
  const seen = new Set<string>();
  const rows = input.flatMap(raw => {
    const item = moverRow(raw);
    if (!item) return [];
    const key = [item.symbol, item.exchange, item.currency].join(':');
    if (seen.has(key)) return [];
    seen.add(key); return [item];
  });
  const rank = (field: 'changePercent' | 'volume', desc: boolean, test: (n: number) => boolean) =>
    rows.filter(row => row[field] !== null && test(row[field]!)).sort((a,b) => (desc ? b[field]! - a[field]! : a[field]! - b[field]!) || a.symbol.localeCompare(b.symbol)).slice(0,5);
  return { gainers: rank('changePercent', true, n=>n>0), losers: rank('changePercent', false, n=>n<0),
    mostTraded: rank('volume', true, n=>n>=0), leastTraded: rank('volume', false, n=>n>=0) };
}
export function newsMoversPath(channel: TvReceiverNewsChannel, tickerPath: string | null = null) {
  const params = new URLSearchParams({ channel });
  // Only event-related news uses the symbols already scoped by its headline feed.
  if (tickerPath && ['earningsNews','analystNews','mergersNews','unusualNews'].includes(channel)) {
    const symbols = new URL(tickerPath, 'https://tv.invalid').searchParams.get('symbols');
    if (symbols) params.set('symbols', symbols);
  }
  return '/api/tv/news-movers?' + params.toString();
}
export function parseNewsMovers(value: unknown, channel: TvReceiverNewsChannel): NewsMovers | null {
  const body = record(value), raw = record(body.lists);
  if (body.channel !== channel || !NEWS_MOVER_KEYS.every(k => Array.isArray(raw[k]))) return null;
  const lists = emptyNewsMovers();
  for (const key of NEWS_MOVER_KEYS) {
    const ranked = rankNewsMovers(raw[key] as unknown[]);
    lists[key] = ranked[key];
  }
  return { channel, lists, updatedAt: typeof body.updatedAt === 'string' && Number.isFinite(Date.parse(body.updatedAt)) ? body.updatedAt : null,
    source: typeof body.source === 'string' ? body.source : null };
}
const COPY = {
  gainers: ['أعلى 5 ارتفاعاً','Top 5 gainers','5 plus fortes hausses'],
  losers: ['أعلى 5 انخفاضاً','Top 5 losers','5 plus fortes baisses'],
  mostTraded: ['أكثر 5 تداولاً','5 most traded','5 volumes les plus élevés'],
  leastTraded: ['أقل 5 تداولاً','5 least traded','5 volumes les plus faibles'],
  partial: ['ضمن عينة البيانات المتاحة · التغطية غير مكتملة','Available sample only · incomplete coverage','Échantillon disponible · couverture incomplète'],
  unavailable: ['لا توجد بيانات مؤكدة','No verified data','Aucune donnée vérifiée'],
  loading: ['جاري تحديث الأسهم','Updating market movers','Actualisation des cours'],
  stocksVolume: ['حجم التداول','Trading volume','Volume de négociation'],
  cryptoVolume: ['حجم 24 ساعة بالدولار','24h volume in USD','Volume sur 24 h en USD'],
} as const;
export function newsMoverText(language: TvLanguage, key: keyof typeof COPY) {
  return COPY[key][language === 'ar' ? 0 : language === 'fr' ? 2 : 1];
}
export function moverValue(row: NewsMover, key: NewsMoverKey) {
  if (key === 'gainers' || key === 'losers') return row.changePercent === null ? '—' : (row.changePercent > 0 ? '+' : '') + row.changePercent.toFixed(2) + '%';
  return row.volume === null ? '—' : new Intl.NumberFormat('en-US', {notation:'compact',maximumFractionDigits:2}).format(row.volume);
}
