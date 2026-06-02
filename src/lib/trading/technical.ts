export type OhlcPoint = {
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type PivotPoints = {
  pivot: number;
  r1: number;
  s1: number;
  r2: number;
  s2: number;
};

export function calculatePivotPoints(point: OhlcPoint): PivotPoints {
  const pivot = (point.high + point.low + point.close) / 3;
  return {
    pivot,
    r1: (2 * pivot) - point.low,
    s1: (2 * pivot) - point.high,
    r2: pivot + (point.high - point.low),
    s2: pivot - (point.high - point.low),
  };
}

export function hasOhlcPoint(value: unknown): value is OhlcPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as Record<string, unknown>;
  return ['open', 'high', 'low', 'close'].every(key => Number.isFinite(Number(point[key])));
}

export function trendFromAverages(latestPrice: number, sma20?: number, sma50?: number) {
  if (!Number.isFinite(latestPrice) || !Number.isFinite(Number(sma20)) || !Number.isFinite(Number(sma50))) return 'sideways';
  if (latestPrice > Number(sma20) && Number(sma20) > Number(sma50)) return 'bullish';
  if (latestPrice < Number(sma20) && Number(sma20) < Number(sma50)) return 'bearish';
  return 'sideways';
}
