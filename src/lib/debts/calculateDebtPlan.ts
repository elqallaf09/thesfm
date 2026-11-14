export type DebtPlanInput = { balance: string; rate: string; monthly: string };

export type DebtPlanEstimate =
  | { status: 'invalid' | 'unpayable' }
  | {
    status: 'ready';
    balance: number;
    monthly: number;
    months: number;
    finalPayment: number;
    totalPaid: number;
    totalInterest: number;
  };

function requiredNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function paymentCount(exactMonths: number) {
  const nearestMonth = Math.round(exactMonths);
  const tolerance = 8 * Number.EPSILON * Math.max(1, exactMonths);
  return Math.max(1, Math.abs(exactMonths - nearestMonth) <= tolerance
    ? nearestMonth
    : Math.ceil(exactMonths));
}

/** Fixed monthly payments, with interest charged before each payment. */
export function calculateDebtPlan(input: DebtPlanInput): DebtPlanEstimate {
  const balance = requiredNumber(input.balance);
  const annualRate = requiredNumber(input.rate);
  const monthly = requiredNumber(input.monthly);
  if (balance === null || balance <= 0 || annualRate === null || monthly === null || monthly <= 0) {
    return { status: 'invalid' };
  }

  const rate = annualRate / 100 / 12;
  const firstInterest = balance * rate;
  if (monthly <= firstInterest) return { status: 'unpayable' };

  let months: number;
  let finalPayment: number;
  let totalPaid: number;
  if (rate === 0 || firstInterest === 0) {
    months = paymentCount(balance / monthly);
    finalPayment = Math.min(monthly, balance - (months - 1) * monthly);
    totalPaid = balance;
  } else if (monthly >= balance + firstInterest) {
    months = 1;
    finalPayment = balance + firstInterest;
    totalPaid = finalPayment;
  } else {
    // log1p/expm1 retain precision for rates too small for 1 + rate.
    const logRate = Math.log1p(rate);
    const exactMonths = -Math.log1p(-firstInterest / monthly) / logRate;
    months = paymentCount(exactMonths);

    // Only the balance due on the last date is paid, not another full installment.
    // Express it using the remaining fractional term to avoid cancellation in
    // balance * (1 + rate)^n - payment * ((1 + rate)^n - 1) / rate.
    const finalFraction = Math.min(1, Math.max(0, exactMonths - (months - 1)));
    const paymentRatio = (-Math.expm1(-finalFraction * logRate) / rate) * (1 + rate);
    finalPayment = Math.min(monthly, monthly * paymentRatio);
    totalPaid = Math.max(balance, (months - 1) * monthly + finalPayment);
  }

  // Do not let the UI's currency formatter turn an overflowing estimate into 0.
  if (!Number.isSafeInteger(months) || !Number.isFinite(finalPayment) || finalPayment <= 0
    || !Number.isFinite(totalPaid)) {
    return { status: 'invalid' };
  }
  return { status: 'ready', balance, monthly, months, finalPayment, totalPaid, totalInterest: totalPaid - balance };
}
