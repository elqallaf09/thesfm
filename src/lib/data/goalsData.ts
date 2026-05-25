import { moneyAmount, safePercent } from './financeData';

export const GOALS_TABLE = 'financial_goals';

export function goalProgress(row: any) {
  const target = moneyAmount(row?.target_amount ?? row?.amount);
  const current = moneyAmount(row?.current_amount ?? row?.saved_amount);
  return {
    target,
    current,
    progressPercent: safePercent(current, target),
    isComplete: target > 0 && current >= target,
  };
}
