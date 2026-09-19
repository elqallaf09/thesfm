import type { RecommendationPricePoint as TraderHistoryPoint } from './recommendationEngine';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === 'object' ? value as RecordValue : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const positive = (value: unknown) => { const n = number(value); return n !== null && n > 0 ? n : null; };

/** Parse daily bars without mistaking the chart-range baseline for yesterday's close. */
export function parseYahooChartSnapshot(payload: unknown) {
  const result = record(list(record(record(payload).chart).result)[0]);
  if (!Object.keys(result).length) return null;
  const meta = record(result.meta);
  const quote = record(list(record(result.indicators).quote)[0]);
  const history: TraderHistoryPoint[] = list(result.timestamp).flatMap((timestamp, index) => {
    const close = positive(list(quote.close)[index]);
    const time = positive(timestamp);
    if (close === null || time === null || !Number.isFinite(new Date(time * 1000).getTime())) return [];
    return [{ date: new Date(time * 1000).toISOString(), close, open: number(list(quote.open)[index]),
      high: number(list(quote.high)[index]), low: number(list(quote.low)[index]), volume: number(list(quote.volume)[index]) }];
  }).sort((a, b) => a.date!.localeCompare(b.date!));
  const closes = history.map(point => point.close);
  const marketTime = positive(meta.regularMarketTime);
  const offset = number(meta.gmtoffset) ?? 0;
  const sessionDay = (time: number) => Math.floor((time + offset) / 86_400);
  const prior = marketTime === null ? undefined : history.filter(point => {
    const time = Date.parse(point.date!) / 1000;
    return sessionDay(time) < sessionDay(marketTime) && marketTime - time < 7 * 86_400;
  }).at(-1);
  // chartPreviousClose is the start of range=1y; it is never a daily baseline.
  const previousClose = positive(meta.regularMarketPreviousClose) ?? positive(meta.previousClose) ?? prior?.close ?? null;
  return {
    symbol: text(meta.symbol), name: text(meta.longName) ?? text(meta.shortName),
    price: positive(meta.regularMarketPrice) ?? closes.at(-1) ?? null, previousClose,
    currency: text(meta.currency), exchange: text(meta.fullExchangeName ?? meta.exchangeName ?? meta.exchange ?? meta.quoteSourceName),
    exchangeCode: text(meta.exchange), market: text(meta.market), assetType: text(meta.quoteType ?? meta.instrumentType),
    marketCap: positive(meta.marketCap), volume: number(meta.regularMarketVolume), closes, history,
    marketTime: marketTime && Number.isFinite(new Date(marketTime * 1000).getTime()) ? new Date(marketTime * 1000).toISOString() : null,
  };
}
export type YahooChartResult = NonNullable<ReturnType<typeof parseYahooChartSnapshot>>;
