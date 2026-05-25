import { sumAmounts } from './financeData';

export const ZAKAT_ASSETS_TABLE = 'zakat_assets';
export const ZAKAT_CALCULATIONS_TABLE = 'zakat_calculations';

export function totalSavedZakatDue(rows: any[] = []) {
  return sumAmounts(rows, ['zakat_due']);
}

export function zakatImportCandidates(savingsRows: any[] = [], investmentRows: any[] = []) {
  return {
    savingsTotal: sumAmounts(savingsRows, ['amount', 'current_value']),
    investmentTotal: sumAmounts(investmentRows, ['current_value', 'amount']),
  };
}
