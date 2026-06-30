export type KhumsStatus = 'not_due' | 'incomplete' | 'complete' | 'overpaid';

export type KhumsCalculationInput = {
  totalIncome: number;
  totalExpenses: number;
  imamSharePercent?: number;
  sayyidSharePercent?: number;
  paidAmount?: number;
};

export type KhumsCalculation = {
  totalIncome: number;
  totalExpenses: number;
  surplus: number;
  khumsDue: number;
  imamShare: number;
  sayyidShare: number;
  remainingAfterKhums: number;
  paidAmount: number;
  remainingBalance: number;
  status: KhumsStatus;
};

function moneyNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
}

function sharePercent(value: number | null | undefined) {
  return Math.min(1, moneyNumber(value));
}

export function calculateKhums({
  totalIncome,
  totalExpenses,
  imamSharePercent = 0.5,
  sayyidSharePercent = 0.5,
  paidAmount = 0,
}: KhumsCalculationInput): KhumsCalculation {
  const safeIncome = moneyNumber(totalIncome);
  const safeExpenses = moneyNumber(totalExpenses);
  const surplus = Math.max(safeIncome - safeExpenses, 0);
  const khumsDue = surplus * 0.2;
  const paid = moneyNumber(paidAmount);
  const imamPercent = sharePercent(imamSharePercent);
  const sayyidPercent = sharePercent(sayyidSharePercent);
  const remainingBalance = Math.max(khumsDue - paid, 0);
  const status: KhumsStatus = khumsDue <= 0
    ? 'not_due'
    : paid > khumsDue
      ? 'overpaid'
      : remainingBalance <= 0.000001
        ? 'complete'
        : 'incomplete';

  return {
    totalIncome: safeIncome,
    totalExpenses: safeExpenses,
    surplus,
    khumsDue,
    imamShare: khumsDue * imamPercent,
    sayyidShare: khumsDue * sayyidPercent,
    remainingAfterKhums: Math.max(surplus - khumsDue, 0),
    paidAmount: paid,
    remainingBalance,
    status,
  };
}
