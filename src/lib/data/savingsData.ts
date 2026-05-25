import { sumAmounts } from './financeData';

export const SAVINGS_TABLE = 'savings_items';

export function totalSavings(rows: any[] = []) {
  return sumAmounts(rows, ['amount', 'current_value']);
}
