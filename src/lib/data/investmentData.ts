import { sumAmounts } from './financeData';

export const INVESTMENT_TABLE = 'investment_items';

export function totalInvestments(rows: any[] = []) {
  return sumAmounts(rows, ['current_value', 'amount', 'invested_amount', 'initial_value', 'purchase_price', 'value']);
}

export function investmentSymbol(row: any) {
  const direct = String(row?.symbol ?? row?.ticker ?? '').trim();
  if (direct) return direct.toUpperCase();
  try {
    const parsed = row?.notes ? JSON.parse(String(row.notes)) : null;
    const symbol = String(parsed?.symbol ?? parsed?.ticker ?? '').trim();
    return symbol ? symbol.toUpperCase() : '';
  } catch {
    return '';
  }
}

export function marketAnalysisUrl(symbol: string) {
  return symbol ? `/market-analysis?symbol=${encodeURIComponent(symbol)}` : '/market-analysis';
}
