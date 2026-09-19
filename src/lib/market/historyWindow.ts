const DAY = 86_400_000;
export function historyNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
export function historyWindow<T extends { time: string; close: number }>(points: T[], period: string, now = Date.now()): T[] {
  const unique = new Map<number, T>();
  for (const point of points) {
    const stamp = Date.parse(point.time);
    if (Number.isFinite(stamp) && stamp <= now && Number.isFinite(point.close) && point.close > 0) unique.set(stamp, point);
  }
  const sorted = [...unique.entries()].sort(([a], [b]) => a - b);
  if (period === 'max') return sorted.map(([, point]) => point);
  const latest = sorted.at(-1)?.[0];
  if (latest === undefined) return [];
  // Daily charts show the latest actual session over market holidays, with dates retained.
  if (period === '1d') return now - latest <= 7 * DAY
    ? sorted.filter(([stamp]) => new Date(stamp).toISOString().slice(0, 10) === new Date(latest).toISOString().slice(0, 10)).map(([, point]) => point) : [];
  const start = new Date(now);
  if (period === '1mo' || period === '6mo' || period === '1y') {
    const day = start.getUTCDate();
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - (period === '1mo' ? 1 : period === '6mo' ? 6 : 12));
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    start.setUTCDate(Math.min(day, lastDay));
  }
  else if (period === '5d') start.setUTCDate(start.getUTCDate() - 7);
  else return sorted.map(([, point]) => point);
  start.setUTCHours(0, 0, 0, 0);
  return sorted.filter(([stamp]) => stamp >= start.getTime()).map(([, point]) => point);
}

export function providerCandleInterval(interval: string, provider: 'finnhub' | 'twelve'): string {
  const minute = interval.match(/^(\d+)(?:m|min)$/i);
  if (minute) return provider === 'finnhub' ? minute[1] : `${minute[1]}min`;
  if (/^(d|1d|1day)$/i.test(interval)) return provider === 'finnhub' ? 'D' : '1day';
  if (/^(1mo|1month)$/i.test(interval)) return provider === 'finnhub' ? 'M' : '1month';
  return interval;
}
