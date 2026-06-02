export type DebtInterestType = 'none' | 'annual' | 'monthly';

export type DebtSchedulePayment = {
  paymentDate: string;
  paymentMonth: string;
  amount: number;
  interestAmount: number;
  principalAmount: number;
  remainingAfter: number;
  warning: 'monthly_payment_below_interest' | null;
};

export type DebtScheduleInput = {
  originalAmount: number;
  startDate: string;
  firstPaymentDate?: string | null;
  monthlyPayment: number;
  interestRate?: number | null;
  interestType?: DebtInterestType | string | null;
  paymentDay?: number | string | null;
  today?: string | Date;
  maxPayments?: number;
};

export type DebtScheduleResult = {
  duePayments: DebtSchedulePayment[];
  duePaymentsCount: number;
  totalPaidAmount: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  remainingAmount: number;
  nextPaymentDate: string | null;
  lastDuePaymentDate: string | null;
  isPaid: boolean;
  warning: 'monthly_payment_below_interest' | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampDay(value: unknown) {
  return Math.min(31, Math.max(1, Math.round(numberOrZero(value) || 1)));
}

function parseDate(value: string | Date | null | undefined) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return date;
}

export function isoDebtDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function debtPaymentMonth(value: string | Date) {
  const date = parseDate(value);
  if (!date) return '';
  return isoDebtDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function dateForMonth(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, Math.min(clampDay(day), lastDayOfMonth(year, month))));
}

function addMonthsClamped(start: Date, offset: number, paymentDay: number) {
  return dateForMonth(start.getUTCFullYear(), start.getUTCMonth() + offset, paymentDay);
}

export function deriveFirstPaymentDate(startDate: string, paymentDay: number | string | null | undefined) {
  const start = parseDate(startDate);
  if (!start) return '';

  const day = clampDay(paymentDay ?? start.getUTCDate());
  let candidate = dateForMonth(start.getUTCFullYear(), start.getUTCMonth(), day);
  if (candidate.getTime() < start.getTime()) {
    candidate = dateForMonth(start.getUTCFullYear(), start.getUTCMonth() + 1, day);
  }
  return isoDebtDate(candidate);
}

function normalizeInterestType(value: DebtScheduleInput['interestType']): DebtInterestType {
  return value === 'none' || value === 'monthly' || value === 'annual' ? value : 'annual';
}

function monthlyInterestRate(interestRate: number, interestType: DebtInterestType) {
  if (interestType === 'none') return 0;
  if (interestType === 'monthly') return Math.max(0, interestRate) / 100;
  return Math.max(0, interestRate) / 100 / 12;
}

function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 1000000) / 1000000;
}

export function calculateDebtSchedule(input: DebtScheduleInput): DebtScheduleResult {
  const originalAmount = Math.max(0, numberOrZero(input.originalAmount));
  const monthlyPayment = Math.max(0, numberOrZero(input.monthlyPayment));
  const interestRate = Math.max(0, numberOrZero(input.interestRate));
  const interestType = normalizeInterestType(input.interestType);
  const startDate = parseDate(input.startDate);
  const today = parseDate(input.today ?? new Date()) ?? new Date(Date.now() - (Date.now() % DAY_MS));
  const firstPaymentDate = parseDate(input.firstPaymentDate || deriveFirstPaymentDate(input.startDate, input.paymentDay));
  const paymentDay = clampDay(input.paymentDay ?? firstPaymentDate?.getUTCDate() ?? startDate?.getUTCDate() ?? 1);
  const maxPayments = Math.min(Math.max(1, Math.round(numberOrZero(input.maxPayments) || 1200)), 1200);

  if (!startDate || !firstPaymentDate || originalAmount <= 0 || monthlyPayment <= 0) {
    return {
      duePayments: [],
      duePaymentsCount: 0,
      totalPaidAmount: 0,
      totalInterestPaid: 0,
      totalPrincipalPaid: 0,
      remainingAmount: originalAmount,
      nextPaymentDate: firstPaymentDate ? isoDebtDate(firstPaymentDate) : null,
      lastDuePaymentDate: null,
      isPaid: false,
      warning: null,
    };
  }

  if (firstPaymentDate.getTime() > today.getTime()) {
    return {
      duePayments: [],
      duePaymentsCount: 0,
      totalPaidAmount: 0,
      totalInterestPaid: 0,
      totalPrincipalPaid: 0,
      remainingAmount: originalAmount,
      nextPaymentDate: isoDebtDate(firstPaymentDate),
      lastDuePaymentDate: null,
      isPaid: false,
      warning: null,
    };
  }

  const payments: DebtSchedulePayment[] = [];
  const rate = monthlyInterestRate(interestRate, interestType);
  let remaining = originalAmount;
  let warning: DebtScheduleResult['warning'] = null;
  let nextPayment: Date | null = firstPaymentDate;

  for (let index = 0; index < maxPayments && nextPayment.getTime() <= today.getTime() && remaining > 0; index += 1) {
    const rawInterest = Math.max(0, remaining * rate);
    const scheduledAmount = Math.min(monthlyPayment, remaining + rawInterest);
    const belowInterest = rawInterest > 0 && monthlyPayment <= rawInterest;
    const interestAmount = belowInterest ? Math.min(scheduledAmount, rawInterest) : Math.min(rawInterest, scheduledAmount);
    const principalAmount = Math.max(0, scheduledAmount - interestAmount);
    remaining = Math.max(0, remaining - principalAmount);
    if (belowInterest) warning = 'monthly_payment_below_interest';

    payments.push({
      paymentDate: isoDebtDate(nextPayment),
      paymentMonth: debtPaymentMonth(nextPayment),
      amount: roundMoney(scheduledAmount),
      interestAmount: roundMoney(interestAmount),
      principalAmount: roundMoney(principalAmount),
      remainingAfter: roundMoney(remaining),
      warning: belowInterest ? 'monthly_payment_below_interest' : null,
    });

    nextPayment = addMonthsClamped(firstPaymentDate, index + 1, paymentDay);
  }

  const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalInterestPaid = payments.reduce((sum, payment) => sum + payment.interestAmount, 0);
  const totalPrincipalPaid = payments.reduce((sum, payment) => sum + payment.principalAmount, 0);

  return {
    duePayments: payments,
    duePaymentsCount: payments.length,
    totalPaidAmount: roundMoney(totalPaidAmount),
    totalInterestPaid: roundMoney(totalInterestPaid),
    totalPrincipalPaid: roundMoney(totalPrincipalPaid),
    remainingAmount: roundMoney(remaining),
    nextPaymentDate: remaining <= 0 ? null : isoDebtDate(nextPayment),
    lastDuePaymentDate: payments.at(-1)?.paymentDate ?? null,
    isPaid: remaining <= 0,
    warning,
  };
}
