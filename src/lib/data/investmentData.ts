import { sumAmounts } from './financeData';

export const INVESTMENT_TABLE = 'investment_items';

export function totalInvestments(rows: any[] = []) {
  return sumAmounts(rows, ['converted_market_value', 'current_value', 'amount', 'current_market_value', 'native_market_value', 'invested_amount', 'initial_value', 'purchase_price', 'value']);
}

export function investmentSymbol(row: any) {
  const direct = String(row?.providerSymbol ?? row?.provider_symbol ?? row?.symbol ?? row?.ticker ?? '').trim();
  if (direct) return direct.toUpperCase();
  try {
    const parsed = row?.notes ? JSON.parse(String(row.notes)) : null;
    const symbol = String(parsed?.providerSymbol ?? parsed?.provider_symbol ?? parsed?.symbol ?? parsed?.ticker ?? '').trim();
    return symbol ? symbol.toUpperCase() : '';
  } catch {
    return '';
  }
}

export function marketAnalysisUrl(symbol: string) {
  return symbol ? `/market-analysis?symbol=${encodeURIComponent(symbol)}` : '/market-analysis';
}
