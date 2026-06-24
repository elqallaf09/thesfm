export type DebtAmortizationPayment = {
  amount: number | string | null;
  interestAmount?: number | string | null;
  interest_amount?: number | string | null;
  principalAmount?: number | string | null;
  principal_amount?: number | string | null;
  paymentDate?: string | null;
  payment_date?: string | null;
};

export type DebtAmortizationInput = {
  originalPrincipal: number | string | null;
  remainingBalance: number | string | null;
  annualInterestRate: number | string | null;
  monthlyPayment: number | string | null;
  nextPaymentDate: string | null | undefined;
  interestType?: 'none' | 'annual' | 'monthly' | string | null;
  paymentHistory?: DebtAmortizationPayment[];
  totalPaidAmount?: number | string | null;
  totalInterestPaid?: number | string | null;
  totalPrincipalPaid?: number | string | null;
  maxPayments?: number;
};

export type DebtAmortizationResult = {
  totalPaid: number;
  principalPaid: number;
  interestPaid: number;
  repaymentProgressPercent: number;
  remainingPayments: number | null;
  expectedPayoffDate: string | null;
  finalPaymentAmount: number | null;
  totalRemainingInterest: number;
  isPaymentSufficient: boolean;
  monthlyInterestAmount: number;
  warning: 'monthly_payment_below_interest' | null;
};

const EPSILON = 0.000001;

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 1000000) / 1000000;
}

function normalizeInterestType(value: DebtAmortizationInput['interestType']) {
  return value === 'none' || value === 'monthly' || value === 'annual' ? value : 'annual';
}

export function debtMonthlyInterestRate(interestRate: number | string | null, interestType: DebtAmortizationInput['interestType'] = 'annual') {
  const rate = Math.max(0, numeric(interestRate));
  const type = normalizeInterestType(interestType);
  if (type === 'none') return 0;
  if (type === 'monthly') return rate / 100;
  return rate / 100 / 12;
}

function parseIsoDate(value: string | null | undefined) {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function addMonthsToDebtDate(dateIso: string | null | undefined, monthsToAdd: number) {
  const parsed = parseIsoDate(dateIso);
  if (!parsed || !Number.isFinite(monthsToAdd)) return null;
  const targetMonthIndex = parsed.month + Math.max(0, Math.round(monthsToAdd));
  const targetYear = parsed.year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const day = Math.min(parsed.day, lastDayOfMonth(targetYear, normalizedMonth));
  return new Date(Date.UTC(targetYear, normalizedMonth, day)).toISOString().slice(0, 10);
}

function paymentInterest(payment: DebtAmortizationPayment) {
  return numeric(payment.interestAmount ?? payment.interest_amount);
}

function paymentPrincipal(payment: DebtAmortizationPayment) {
  return numeric(payment.principalAmount ?? payment.principal_amount);
}

function paymentAmount(payment: DebtAmortizationPayment) {
  return numeric(payment.amount);
}

export function calculateDebtAmortization(input: DebtAmortizationInput): DebtAmortizationResult {
  const originalPrincipal = Math.max(0, numeric(input.originalPrincipal));
  const remainingBalance = Math.max(0, numeric(input.remainingBalance));
  const monthlyPayment = Math.max(0, numeric(input.monthlyPayment));
  const monthlyRate = debtMonthlyInterestRate(input.annualInterestRate, input.interestType);
  const paymentHistory = input.paymentHistory ?? [];
  const historyPaid = paymentHistory.reduce((sum, payment) => sum + paymentAmount(payment), 0);
  const historyInterest = paymentHistory.reduce((sum, payment) => sum + paymentInterest(payment), 0);
  const historyPrincipal = paymentHistory.reduce((sum, payment) => sum + paymentPrincipal(payment), 0);
  const hasPaymentHistory = paymentHistory.length > 0;
  const hasInterestLedger = paymentHistory.some(payment =>
    payment.interestAmount !== undefined || payment.interest_amount !== undefined);
  const hasPrincipalLedger = paymentHistory.some(payment =>
    payment.principalAmount !== undefined || payment.principal_amount !== undefined);

  const principalPaidFromBalance = Math.max(0, originalPrincipal - remainingBalance);
  const principalPaid = roundMoney(hasPaymentHistory && hasPrincipalLedger
    ? historyPrincipal
    : Math.max(numeric(input.totalPrincipalPaid), principalPaidFromBalance));
  const totalPaid = roundMoney(hasPaymentHistory
    ? historyPaid
    : Math.max(numeric(input.totalPaidAmount), principalPaid + numeric(input.totalInterestPaid)));
  const interestPaid = roundMoney(hasPaymentHistory && hasInterestLedger
    ? historyInterest
    : Math.max(numeric(input.totalInterestPaid), totalPaid - principalPaid, 0));
  const repaymentProgressPercent = originalPrincipal > 0 ? (principalPaid / originalPrincipal) * 100 : 0;
  const monthlyInterestAmount = roundMoney(remainingBalance * monthlyRate);

  if (remainingBalance <= EPSILON) {
    return {
      totalPaid,
      principalPaid,
      interestPaid,
      repaymentProgressPercent: roundMoney(repaymentProgressPercent),
      remainingPayments: 0,
      expectedPayoffDate: null,
      finalPaymentAmount: 0,
      totalRemainingInterest: 0,
      isPaymentSufficient: true,
      monthlyInterestAmount,
      warning: null,
    };
  }

  if (monthlyPayment <= 0 || (monthlyRate > 0 && monthlyPayment <= remainingBalance * monthlyRate)) {
    return {
      totalPaid,
      principalPaid,
      interestPaid,
      repaymentProgressPercent: roundMoney(repaymentProgressPercent),
      remainingPayments: null,
      expectedPayoffDate: null,
      finalPaymentAmount: null,
      totalRemainingInterest: 0,
      isPaymentSufficient: false,
      monthlyInterestAmount,
      warning: 'monthly_payment_below_interest',
    };
  }

  let remainingPaymentsExact: number;
  if (monthlyRate <= 0) {
    remainingPaymentsExact = remainingBalance / monthlyPayment;
  } else {
    const ratio = 1 - (monthlyRate * remainingBalance) / monthlyPayment;
    remainingPaymentsExact = ratio > 0
      ? -Math.log(ratio) / Math.log(1 + monthlyRate)
      : Number.POSITIVE_INFINITY;
  }

  const remainingPayments = Number.isFinite(remainingPaymentsExact)
    ? Math.ceil(Math.max(0, remainingPaymentsExact))
    : null;

  if (remainingPayments === null) {
    return {
      totalPaid,
      principalPaid,
      interestPaid,
      repaymentProgressPercent: roundMoney(repaymentProgressPercent),
      remainingPayments: null,
      expectedPayoffDate: null,
      finalPaymentAmount: null,
      totalRemainingInterest: 0,
      isPaymentSufficient: false,
      monthlyInterestAmount,
      warning: 'monthly_payment_below_interest',
    };
  }

  let balance = remainingBalance;
  let finalPaymentAmount = 0;
  let totalRemainingInterest = 0;
  const maxPayments = Math.min(Math.max(remainingPayments + 2, Math.round(numeric(input.maxPayments, 1200))), 1200);

  for (let index = 0; index < maxPayments && balance > EPSILON; index += 1) {
    const interest = Math.max(0, balance * monthlyRate);
    const payment = Math.min(monthlyPayment, balance + interest);
    const interestAmount = Math.min(interest, payment);
    const principalAmount = Math.max(0, payment - interestAmount);
    totalRemainingInterest += interestAmount;
    balance = Math.max(0, balance - principalAmount);
    finalPaymentAmount = payment;
  }

  const expectedPayoffDate = remainingPayments > 0
    ? addMonthsToDebtDate(input.nextPaymentDate, remainingPayments - 1)
    : null;

  return {
    totalPaid,
    principalPaid,
    interestPaid,
    repaymentProgressPercent: roundMoney(repaymentProgressPercent),
    remainingPayments,
    expectedPayoffDate,
    finalPaymentAmount: roundMoney(finalPaymentAmount),
    totalRemainingInterest: roundMoney(totalRemainingInterest),
    isPaymentSufficient: true,
    monthlyInterestAmount,
    warning: null,
  };
}
