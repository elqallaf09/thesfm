import { holdingCurrencyFromRow, investmentValueInCurrency } from '@/lib/investments/currencyIntegrity';

export const INVESTMENT_TABLE = 'investment_items';

export function totalInvestments(rows: any[] = [], targetCurrency?: string | null) {
  const target = targetCurrency
    ?? rows.map(row => String(row?.user_currency ?? holdingCurrencyFromRow(row) ?? '').trim().toUpperCase()).find(Boolean)
    ?? null;
  if (!target) return 0;
  return rows.reduce((sum, row) => sum + (investmentValueInCurrency(row, target)?.amount ?? 0), 0);
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
  return symbol
    ? `/ai-analyst/analyze/${encodeURIComponent(symbol)}?assetType=STOCK&horizon=SWING`
    : '/ai-analyst/overview';
}
