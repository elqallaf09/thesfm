import { normalizeMarketCurrencyCode } from '@/lib/market/marketCurrency';

export type InvestmentCurrencyRow = Record<string, unknown>;

function finiteNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function holdingCurrencyFromRow(row: InvestmentCurrencyRow) {
  return normalizeMarketCurrencyCode(row.currency)
    ?? (quoteCurrencyFromRow(row) ? null : normalizeMarketCurrencyCode(row.user_currency));
}

export function quoteCurrencyFromRow(row: InvestmentCurrencyRow) {
  return normalizeMarketCurrencyCode(row.price_currency)
    ?? normalizeMarketCurrencyCode(row.native_currency);
}

export function holdingValueFromRow(row: InvestmentCurrencyRow) {
  const holdingCurrency = holdingCurrencyFromRow(row);
  const quoteCurrency = quoteCurrencyFromRow(row);
  const reportingCurrency = normalizeMarketCurrencyCode(row.user_currency);
  const currentValue = finiteNumber(row.current_value, row.currentValue);
  if (currentValue !== null) return currentValue;
  if (reportingCurrency && reportingCurrency === holdingCurrency) {
    const converted = finiteNumber(row.converted_market_value);
    if (converted !== null) return converted;
  }
  if (holdingCurrency && (!quoteCurrency || quoteCurrency === holdingCurrency)) {
    const native = finiteNumber(row.current_market_value, row.native_market_value);
    if (native !== null) return native;
  }
  return finiteNumber(row.amount, row.purchase_total, row.total_invested, row.invested_amount);
}

export function investmentValueInCurrency(row: InvestmentCurrencyRow, targetCurrencyInput: unknown) {
  const targetCurrency = normalizeMarketCurrencyCode(targetCurrencyInput);
  const holdingCurrency = holdingCurrencyFromRow(row);
  const quoteCurrency = quoteCurrencyFromRow(row);
  const reportingCurrency = normalizeMarketCurrencyCode(row.user_currency);

  if (targetCurrency && reportingCurrency === targetCurrency) {
    const converted = finiteNumber(row.converted_market_value);
    const fxRate = finiteNumber(row.fx_rate_to_user_currency);
    const fxSource = String(row.fx_source ?? '').trim().toLowerCase();
    const hasVerifiedFx = fxRate !== null && fxRate > 0
      || Boolean(fxSource && !fxSource.includes('unavailable'));
    if (converted !== null && (quoteCurrency === targetCurrency || hasVerifiedFx)) {
      return { amount: converted, currency: targetCurrency, source: 'reporting' as const };
    }
  }
  if (targetCurrency && holdingCurrency === targetCurrency) {
    const holding = holdingValueFromRow(row);
    if (holding !== null) return { amount: holding, currency: targetCurrency, source: 'holding' as const };
  }
  if (targetCurrency && quoteCurrency === targetCurrency) {
    const quote = finiteNumber(row.native_market_value, row.current_market_value);
    if (quote !== null) return { amount: quote, currency: targetCurrency, source: 'quote' as const };
  }
  if (!targetCurrency && holdingCurrency) {
    const holding = holdingValueFromRow(row);
    if (holding !== null) return { amount: holding, currency: holdingCurrency, source: 'holding' as const };
  }
  return null;
}
