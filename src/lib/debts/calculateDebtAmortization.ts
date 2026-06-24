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
  interestRatePeriod?: 'none' | 'annual' | 'monthly' | string | null;
  contractualMaturityDate?: string | null;
  extraMonthlyPayment?: number | string | null;
  paymentHistory?: DebtAmortizationPayment[];
  totalPaidAmount?: number | string | null;
  totalInterestPaid?: number | string | null;
  totalPrincipalPaid?: number | string | null;
  maxPayments?: number;
};

export type DebtAmortizationScheduleItem = {
  paymentNumber: number;
  paymentDate: string | null;
  paymentAmount: number;
  interestAmount: number;
  principalAmount: number;
  remainingAfter: number;
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
  remainingInterest: number;
  totalProjectedCost: number;
  isPaymentSufficient: boolean;
  monthlyInterestAmount: number;
  principalReductionNextPayment: number;
  contractualDateMismatch: boolean;
  schedule: DebtAmortizationScheduleItem[];
  warning: 'monthly_payment_below_interest' | 'projection_exceeded' | null;
  validationError: 'monthly_payment_below_interest' | 'projection_exceeded' | null;
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
  const extraMonthlyPayment = Math.max(0, numeric(input.extraMonthlyPayment));
  const scheduledMonthlyPayment = monthlyPayment + extraMonthlyPayment;
  const monthlyRate = debtMonthlyInterestRate(
    input.annualInterestRate,
    input.interestRatePeriod ?? input.interestType,
  );
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
  const principalReductionNextPayment = roundMoney(Math.max(
    0,
    Math.min(scheduledMonthlyPayment, remainingBalance + monthlyInterestAmount) - monthlyInterestAmount,
  ));

  const baseResult = {
    totalPaid,
    principalPaid,
    interestPaid,
    repaymentProgressPercent: roundMoney(repaymentProgressPercent),
    monthlyInterestAmount,
    principalReductionNextPayment,
    contractualDateMismatch: false,
    schedule: [] as DebtAmortizationScheduleItem[],
  };

  if (remainingBalance <= EPSILON) {
    return {
      ...baseResult,
      remainingPayments: 0,
      expectedPayoffDate: null,
      finalPaymentAmount: 0,
      totalRemainingInterest: 0,
      remainingInterest: 0,
      totalProjectedCost: 0,
      isPaymentSufficient: true,
      warning: null,
      validationError: null,
    };
  }

  if (scheduledMonthlyPayment <= 0 || (monthlyRate > 0 && scheduledMonthlyPayment <= remainingBalance * monthlyRate + EPSILON)) {
    return {
      ...baseResult,
      remainingPayments: null,
      expectedPayoffDate: null,
      finalPaymentAmount: null,
      totalRemainingInterest: 0,
      remainingInterest: 0,
      totalProjectedCost: remainingBalance,
      isPaymentSufficient: false,
      warning: 'monthly_payment_below_interest',
      validationError: 'monthly_payment_below_interest',
    };
  }

  let remainingPaymentsExact: number;
  if (monthlyRate <= 0) {
    remainingPaymentsExact = remainingBalance / scheduledMonthlyPayment;
  } else {
    const ratio = 1 - (monthlyRate * remainingBalance) / scheduledMonthlyPayment;
    remainingPaymentsExact = ratio > 0
      ? -Math.log(ratio) / Math.log(1 + monthlyRate)
      : Number.POSITIVE_INFINITY;
  }

  const remainingPayments = Number.isFinite(remainingPaymentsExact)
    ? Math.ceil(Math.max(0, remainingPaymentsExact))
    : null;

  if (remainingPayments === null) {
    return {
      ...baseResult,
      remainingPayments: null,
      expectedPayoffDate: null,
      finalPaymentAmount: null,
      totalRemainingInterest: 0,
      remainingInterest: 0,
      totalProjectedCost: remainingBalance,
      isPaymentSufficient: false,
      warning: 'monthly_payment_below_interest',
      validationError: 'monthly_payment_below_interest',
    };
  }

  let balance = remainingBalance;
  let finalPaymentAmount = 0;
  let totalRemainingInterest = 0;
  const schedule: DebtAmortizationScheduleItem[] = [];
  const maxPayments = Math.min(Math.max(remainingPayments + 2, Math.round(numeric(input.maxPayments, 2400))), 2400);

  for (let index = 0; index < maxPayments && balance > EPSILON; index += 1) {
    const interest = Math.max(0, balance * monthlyRate);
    const payment = Math.min(scheduledMonthlyPayment, balance + interest);
    const interestAmount = Math.min(interest, payment);
    const principalAmount = Math.max(0, payment - interestAmount);
    totalRemainingInterest += interestAmount;
    balance = Math.max(0, balance - principalAmount);
    finalPaymentAmount = payment;
    schedule.push({
      paymentNumber: index + 1,
      paymentDate: addMonthsToDebtDate(input.nextPaymentDate, index),
      paymentAmount: roundMoney(payment),
      interestAmount: roundMoney(interestAmount),
      principalAmount: roundMoney(principalAmount),
      remainingAfter: roundMoney(balance),
    });
  }

  if (balance > EPSILON) {
    return {
      ...baseResult,
      remainingPayments: null,
      expectedPayoffDate: null,
      finalPaymentAmount: null,
      totalRemainingInterest: roundMoney(totalRemainingInterest),
      remainingInterest: roundMoney(totalRemainingInterest),
      totalProjectedCost: roundMoney(remainingBalance + totalRemainingInterest),
      isPaymentSufficient: false,
      schedule,
      warning: 'projection_exceeded',
      validationError: 'projection_exceeded',
    };
  }

  const expectedPayoffDate = remainingPayments > 0
    ? addMonthsToDebtDate(input.nextPaymentDate, remainingPayments - 1)
    : null;
  const contractualDateMismatch = Boolean(
    input.contractualMaturityDate
    && expectedPayoffDate
    && input.contractualMaturityDate !== expectedPayoffDate,
  );

  return {
    ...baseResult,
    remainingPayments,
    expectedPayoffDate,
    finalPaymentAmount: roundMoney(finalPaymentAmount),
    totalRemainingInterest: roundMoney(totalRemainingInterest),
    remainingInterest: roundMoney(totalRemainingInterest),
    totalProjectedCost: roundMoney(remainingBalance + totalRemainingInterest),
    isPaymentSufficient: true,
    contractualDateMismatch,
    schedule,
    warning: null,
    validationError: null,
  };
}
