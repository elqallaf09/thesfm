import type { Investment } from '@/types/investment';

export function portfolioNumber(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
export function portfolioCurrency(value: unknown): string | null {
  const result = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(result) ? result : null;
}
/** TV holdings retain their recorded denomination; USDT is never a USD alias. */
export function recordedHoldingCurrency(value: unknown): string | null {
  const result = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return result === 'USDT' ? result : portfolioCurrency(value);
}
function holdingMoney(amount: unknown, currency: unknown) {
  const number = portfolioNumber(amount), code = recordedHoldingCurrency(currency);
  return number !== null && number >= 0 && code ? { amount: number, currency: code } : null;
}
/** Prefer the holding's own recorded value without changing the website's
 * reporting-currency preference or deriving an inverse saved FX conversion. */
export function recordedHoldingValue(investment: Investment) {
  const holding = investment.displayValueStatus === 'valid'
    ? holdingMoney(investment.currentValue, investment.currency) : null;
  const nativeCurrency = investment.nativeCurrency || investment.priceCurrency || investment.currency;
  return holding
    ?? holdingMoney(investment.currentMarketValue, nativeCurrency)
    ?? holdingMoney(investment.nativeMarketValue, nativeCurrency)
    ?? (!/(stale|unavailable|failed)/i.test(investment.fxSource || '')
      ? holdingMoney(investment.convertedMarketValue, investment.userCurrency) : null);
}
function recordedValues(investment: Investment) {
  const values: { amount: number; currency: string }[] = [];
  const add = (amount: unknown, currency: unknown) => {
    const number = portfolioNumber(amount), code = portfolioCurrency(currency);
    if (number !== null && number >= 0 && code) values.push({ amount: number, currency: code });
  };
  if (!/(stale|unavailable|failed)/i.test(investment.fxSource || '')) add(investment.convertedMarketValue, investment.userCurrency);
  if (investment.displayValueStatus === 'valid') add(investment.currentValue, investment.currency);
  add(investment.currentMarketValue, investment.nativeCurrency || investment.priceCurrency || investment.currency);
  return values;
}
export function recordedValue(investment: Investment) { return recordedValues(investment)[0] ?? null; }
export function recordedBaseValue(investment: Investment, baseCurrency: string) {
  return recordedValues(investment).find(value => value.currency === baseCurrency.toUpperCase())?.amount ?? null;
}
export function recordedBaseCost(investment: Investment, baseCurrency: string) {
  const amount = portfolioNumber(investment.purchaseTotal);
  return amount !== null && amount >= 0 && portfolioCurrency(investment.currency) === baseCurrency.toUpperCase() ? amount : null;
}
export function valuationTimestamp(investment: Investment) {
  const value = investment.valuationLastUpdatedAt || investment.lastPriceUpdatedAt;
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}
export function freshness(investment: Investment, now = Date.now()) {
  const value = valuationTimestamp(investment);
  return !value ? 'missing' as const : now - Date.parse(value) > 7 * 86400000 ? 'stale' as const : 'recorded' as const;
}
