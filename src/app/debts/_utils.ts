// Utility constants and functions for debts/page
import { TEXT } from './_text';
import type { Lang, DebtRow, DebtForm, DebtStatus, InterestType } from './_types';
import { calculateDebtSchedule, debtPaymentMonth, deriveFirstPaymentDate } from '@/lib/debts/calculateDebtSchedule';
import {
  addMonthsToDebtDate,
  calculateDebtAmortization,
  debtMonthlyInterestRate,
  type DebtAmortizationPayment,
} from '@/lib/debts/calculateDebtAmortization';
import { normalizeDigits } from '@/lib/locale';
export { debtPaymentMonth, deriveFirstPaymentDate };

export const SUPPORTED_CURRENCIES = ['KWD', 'USD', 'SAR', 'AED', 'QAR', 'BHD', 'OMR', 'EUR', 'GBP'];
export const DEFAULT_START_DATE = new Date().toISOString().slice(0, 10);

export const DEFAULT_FORM: DebtForm = {
  name: '',
  creditorName: '',
  originalAmount: '',
  remainingAmount: '',
  currency: 'KWD',
  startDate: DEFAULT_START_DATE,
  firstPaymentDate: deriveFirstPaymentDate(DEFAULT_START_DATE, '1'),
  monthlyPayment: '',
  interestRate: '0',
  interestType: 'annual',
  paymentDay: '1',
  notes: '',
  autoAddToExpenses: true,
  status: 'active',
};

export function createDefaultForm(currency = 'KWD'): DebtForm {
  const startDate = new Date().toISOString().slice(0, 10);
  return {
    ...DEFAULT_FORM,
    currency,
    startDate,
    firstPaymentDate: deriveFirstPaymentDate(startDate, DEFAULT_FORM.paymentDay),
  };
}


export function tr(lang: string | undefined, key: keyof typeof TEXT) {
  const safeLang: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  return TEXT[key][safeLang];
}

export function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function remainingForDebt(debt: DebtRow) {
  return toNumber(debt.calculated_remaining_amount ?? debt.remaining_amount);
}

export function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function cleanNumericInput(value: string) {
  const cleaned = normalizeDigits(value).replace(/[^\d.]/g, '');
  const [whole, ...fractionParts] = cleaned.split('.');
  return fractionParts.length ? `${whole}.${fractionParts.join('')}` : whole;
}

export function formatDateToYYYYMMDD(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : trimmed;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export function mapInterestTypeToDb(value: unknown): InterestType {
  if (value === 'none' || value === 'monthly' || value === 'annual') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized.includes('بدون') || normalized.includes('none') || normalized.includes('sans')) return 'none';
  if (normalized.includes('شهري') || normalized.includes('monthly') || normalized.includes('mensuel')) return 'monthly';
  if (normalized.includes('سنوي') || normalized.includes('annual') || normalized.includes('annuel')) return 'annual';
  return 'annual';
}

export function mapDebtStatusToDb(value: unknown): DebtStatus {
  if (value === 'paid' || value === 'paused' || value === 'active') return value;
  return 'active';
}

export function clampPaymentDay(value: unknown) {
  return Math.min(31, Math.max(1, Math.round(toNumber(value, 1))));
}

export function addOneDebtMonth(monthIso: string) {
  const [year, month] = monthIso.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return '';
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

export function debtFirstPaymentDate(debt: DebtRow) {
  return debt.first_payment_date || deriveFirstPaymentDate(debt.start_date, debt.payment_day);
}

export function debtSchedule(debt: DebtRow) {
  return calculateDebtSchedule({
    originalAmount: toNumber(debt.original_amount),
    startDate: debt.start_date,
    firstPaymentDate: debtFirstPaymentDate(debt),
    monthlyPayment: toNumber(debt.monthly_payment),
    interestRate: toNumber(debt.interest_rate),
    interestType: debt.interest_type || 'annual',
    paymentDay: debt.payment_day,
  });
}

export function formatDate(value: string | null | undefined, lang: Lang) {
  if (!value) return TEXT.unavailable[lang];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function monthlyInterestAmount(debt: DebtRow) {
  const remaining = remainingForDebt(debt);
  const monthlyRate = debtMonthlyInterestRate(debt.interest_rate, debt.interest_type || 'annual');
  return remaining * monthlyRate;
}

export function debtEffectiveMonthlyRate(debt: DebtRow) {
  return debtMonthlyInterestRate(debt.interest_rate, debt.interest_type || 'annual');
}

export function isDebtActiveForCalculations(debt: DebtRow) {
  return debt.status === 'active' && remainingForDebt(debt) > 0.005;
}

export function calculateDebtPayment(debt: DebtRow, overrideAmount?: number) {
  const remaining = remainingForDebt(debt);
  const requestedAmount = Math.max(0, overrideAmount ?? toNumber(debt.monthly_payment));
  const interestDue = Math.max(0, monthlyInterestAmount(debt));
  const amount = Math.min(requestedAmount, remaining + interestDue);
  const interestAmount = Math.min(interestDue, amount);
  const principalAmount = Math.max(0, amount - interestAmount);
  const nextRemaining = Math.max(0, remaining - principalAmount);
  return {
    amount,
    interestAmount,
    principalAmount,
    nextRemaining,
    warning: interestDue > 0 && requestedAmount <= interestDue,
  };
}

export function payoffProgress(debt: DebtRow) {
  return Math.min(100, Math.max(0, debtAmortization(debt).repaymentProgressPercent));
}

export function debtAmortization(
  debt: DebtRow,
  options: {
    nextPaymentDate?: string | null;
    paymentHistory?: DebtAmortizationPayment[];
  } = {},
) {
  return calculateDebtAmortization({
    originalPrincipal: debt.original_amount,
    remainingBalance: remainingForDebt(debt),
    annualInterestRate: debt.interest_rate,
    interestRatePeriod: debt.interest_type || 'annual',
    monthlyPayment: debt.monthly_payment,
    nextPaymentDate: options.nextPaymentDate ?? debtSchedule(debt).nextPaymentDate ?? debtFirstPaymentDate(debt),
    paymentHistory: options.paymentHistory,
    totalPaidAmount: debt.total_paid_amount,
    totalInterestPaid: debt.total_interest_paid,
    totalPrincipalPaid: debt.total_principal_paid,
  });
}

export function estimatePayoffMonths(debt: DebtRow) {
  return debtAmortization(debt).remainingPayments;
}

export function estimatePayoffDateFromNextPayment(nextPaymentDate: string | null | undefined, remainingPaymentsCount: number | null) {
  if (remainingPaymentsCount === null || remainingPaymentsCount <= 0) return null;
  return addMonthsToDebtDate(nextPaymentDate, Math.ceil(remainingPaymentsCount) - 1);
}

export function estimatePayoffDate(debt: DebtRow): string | null {
  return debtAmortization(debt).expectedPayoffDate;
}

export type StrategyEntry = { debt: DebtRow; payoffMonth: number; interestPaid: number };
export type StrategyResult = {
  order: StrategyEntry[];
  totalMonths: number;
  totalInterest: number;
  blockedDebts: DebtRow[];
} | null;

export function simulatePayoffStrategy(
  debts: DebtRow[],
  extraMonthly: number,
  method: 'snowball' | 'avalanche',
): StrategyResult {
  const active = debts.filter(d => isDebtActiveForCalculations(d) && toNumber(d.monthly_payment) > 0);
  const blockedDebts = active.filter(debt => calculateDebtPayment(debt).warning);
  const eligible = active.filter(debt => !calculateDebtPayment(debt).warning);
  if (active.length === 0) return null;
  if (eligible.length === 0) {
    return { order: [], totalMonths: 0, totalInterest: 0, blockedDebts };
  }

  const sorted = [...eligible].sort((a, b) =>
    method === 'snowball'
      ? remainingForDebt(a) - remainingForDebt(b)
      : debtEffectiveMonthlyRate(b) - debtEffectiveMonthlyRate(a),
  );

  type State = {
    debt: DebtRow;
    remaining: number;
    interestPaid: number;
    payoffMonth: number | null;
    minPayment: number;
    done: boolean;
  };

  const states: State[] = sorted.map(d => ({
    debt: d,
    remaining: remainingForDebt(d),
    interestPaid: 0,
    payoffMonth: null,
    minPayment: toNumber(d.monthly_payment),
    done: false,
  }));

  let extraPool = Math.max(0, extraMonthly);
  const MAX_MONTHS = 2400;

  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    if (states.every(s => s.done)) break;

    // First undone debt in priority order gets the extra payment
    let extraApplied = false;
    for (const state of states) {
      if (state.done) continue;

      const monthlyRate = debtEffectiveMonthlyRate(state.debt);
      const interestCharge = state.remaining * monthlyRate;

      let payment = state.minPayment;
      if (!extraApplied) {
        payment += extraPool;
        extraApplied = true;
      }

      const totalOwed = state.remaining + interestCharge;
      payment = Math.min(payment, totalOwed);

      const interestPortion = Math.min(interestCharge, Math.max(0, payment));
      const principal = Math.max(0, payment - interestPortion);
      if (principal <= 0.000001 && payment > 0) {
        state.payoffMonth = MAX_MONTHS;
        continue;
      }
      state.interestPaid += interestPortion;
      state.remaining = Math.max(0, state.remaining - principal);

      if (state.remaining <= 0.005) {
        state.remaining = 0;
        state.done = true;
        state.payoffMonth = month;
        extraPool += state.minPayment;
      }
    }
  }

  const order: StrategyEntry[] = states.map(s => ({
    debt: s.debt,
    payoffMonth: s.payoffMonth ?? MAX_MONTHS,
    interestPaid: s.interestPaid,
  }));

  const totalMonths = Math.max(...order.map(o => o.payoffMonth));
  const totalInterest = order.reduce((sum, o) => sum + o.interestPaid, 0);
  return { order, totalMonths, totalInterest, blockedDebts };
}

export function payloadFromForm(form: DebtForm, userId: string) {
  const startDate = formatDateToYYYYMMDD(form.startDate);
  if (!startDate) throw new Error('INVALID_DATE');
  const firstPaymentDate = formatDateToYYYYMMDD(form.firstPaymentDate) || deriveFirstPaymentDate(startDate, form.paymentDay);
  if (!firstPaymentDate) throw new Error('INVALID_FIRST_PAYMENT_DATE');
  if (firstPaymentDate < startDate) throw new Error('INVALID_FIRST_PAYMENT_DATE');

  return {
    user_id: userId,
    name: form.name.trim(),
    creditor_name: form.creditorName.trim(),
    original_amount: toNumber(form.originalAmount),
    remaining_amount: toNumber(form.remainingAmount),
    currency: form.currency.trim() || 'KWD',
    start_date: startDate,
    first_payment_date: firstPaymentDate,
    monthly_payment: toNumber(form.monthlyPayment),
    interest_rate: toNumber(form.interestRate, 0),
    interest_type: mapInterestTypeToDb(form.interestType),
    payment_day: clampPaymentDay(form.paymentDay),
    notes: form.notes.trim() || null,
    auto_add_to_expenses: Boolean(form.autoAddToExpenses),
    status: form.id ? mapDebtStatusToDb(form.status) : 'active',
  };
}

export function validateDebtForm(form: DebtForm): Array<keyof typeof TEXT> {
  const errors: Array<keyof typeof TEXT> = [];
  const originalAmount = optionalNumber(form.originalAmount);
  const remainingAmount = optionalNumber(form.remainingAmount);
  const monthlyPayment = optionalNumber(form.monthlyPayment);
  const interestRate = optionalNumber(form.interestRate || '0');
  const paymentDay = optionalNumber(form.paymentDay);

  if (!form.name.trim()) errors.push('validationName');
  if (!form.creditorName.trim()) errors.push('validationCreditor');
  if (originalAmount === null || originalAmount <= 0) errors.push('validationOriginalAmount');
  if (remainingAmount === null || remainingAmount < 0) errors.push('validationRemainingAmount');
  if (!form.currency.trim()) errors.push('validationCurrency');
  const startDate = formatDateToYYYYMMDD(form.startDate);
  const firstPaymentDate = formatDateToYYYYMMDD(form.firstPaymentDate);
  if (!startDate) errors.push('validationStartDate');
  if (!firstPaymentDate || (startDate && firstPaymentDate < startDate)) errors.push('validationFirstPaymentDate');
  if (monthlyPayment === null || monthlyPayment <= 0) errors.push('validationMonthlyPayment');
  if (interestRate === null || interestRate < 0 || interestRate > 100) errors.push('validationInterestRate');
  if (paymentDay === null || !Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) errors.push('validationPaymentDay');

  return errors;
}

export function debtSaveErrorMessage(error: unknown, t: (key: keyof typeof TEXT) => string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return t('networkSaveError');
  const details = [
    error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message ?? '') : '',
    error && typeof error === 'object' && 'details' in error ? String((error as { details?: unknown }).details ?? '') : '',
    error && typeof error === 'object' && 'hint' in error ? String((error as { hint?: unknown }).hint ?? '') : '',
    error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '',
  ].join(' ').toLowerCase();
  if (details.includes('failed to fetch') || details.includes('network') || details.includes('timeout')) {
    return t('networkSaveError');
  }
  if (details.includes('invalid_date')) {
    return t('validationStartDate');
  }
  if (details.includes('invalid_first_payment_date')) {
    return t('validationFirstPaymentDate');
  }
  if (details.includes('row-level security') || details.includes('rls') || details.includes('42501') || details.includes('permission')) {
    return t('rlsSaveError');
  }
  return t('databaseSaveError');
}

export function safeDebtSaveErrorDetails(error: unknown) {
  if (!error || typeof error !== 'object') {
    return {
      message: error instanceof Error ? error.message : String(error ?? ''),
      code: undefined,
      details: undefined,
      hint: undefined,
    };
  }

  const record = error as {
    message?: unknown;
    code?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  return {
    message: typeof record.message === 'string' ? record.message : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    details: typeof record.details === 'string' ? record.details : undefined,
    hint: typeof record.hint === 'string' ? record.hint : undefined,
  };
}

