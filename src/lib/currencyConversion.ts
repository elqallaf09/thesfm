export type FxRateMap = Record<string, number>;

export const APPROX_USD_VALUE_BY_CURRENCY: Record<string, number> = {
  KWD: 3.25,
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  SAR: 0.2667,
  AED: 0.2723,
  QAR: 0.2747,
  BHD: 2.65,
  OMR: 2.6,
  JOD: 1.41,
  CAD: 0.73,
  AUD: 0.66,
  CHF: 1.12,
  JPY: 0.0064,
  CNY: 0.138,
  INR: 0.012,
  TRY: 0.031,
  EGP: 0.021,
  SGD: 0.74,
  HKD: 0.128,
  MYR: 0.212,
  IDR: 0.000061,
  THB: 0.027,
  PHP: 0.017,
  PKR: 0.0036,
  ZAR: 0.055,
  BRL: 0.19,
  MXN: 0.054,
  KRW: 0.00072,
};

export function normalizeMoneyCurrencyCode(value: unknown, fallback = 'KWD') {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

export function fxKey(from: string, to: string) {
  return `${from}:${to}`;
}

export function approximateFxRate(from: string, to: string) {
  if (from === to) return 1;
  const fromUsd = APPROX_USD_VALUE_BY_CURRENCY[from];
  const toUsd = APPROX_USD_VALUE_BY_CURRENCY[to];
  return fromUsd && toUsd ? fromUsd / toUsd : null;
}

export function convertCurrencyAmount(amount: number, from: string, to: string, fxRates: FxRateMap = {}) {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;
  const liveRate = fxRates[fxKey(from, to)];
  const rate = Number.isFinite(liveRate) && liveRate > 0 ? liveRate : approximateFxRate(from, to);
  return rate ? amount * rate : null;
}
