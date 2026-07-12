import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import {
  calculateDebtSchedule,
  debtPaymentMonth,
  deriveFirstPaymentDate,
  type DebtSchedulePayment,
} from '@/lib/debts/calculateDebtSchedule';

export const runtime = 'nodejs';

type DebtGenerationResult = {
  debtId: string;
  status: 'created' | 'updated' | 'skipped' | 'error';
  reason?: string;
  expenseId?: string | null;
  paymentId?: string | null;
  paymentDate?: string;
  warning?: string | null;
};

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  creditor_name: string | null;
  original_amount: number | string | null;
  remaining_amount: number | string | null;
  calculated_remaining_amount?: number | string | null;
  total_paid_amount?: number | string | null;
  total_interest_paid?: number | string | null;
  total_principal_paid?: number | string | null;
  currency: string | null;
  start_date: string | null;
  first_payment_date?: string | null;
  monthly_payment: number | string | null;
  interest_rate: number | string | null;
  interest_type: 'none' | 'annual' | 'monthly' | string | null;
  payment_day: number | string | null;
  auto_add_to_expenses: boolean | null;
  status: string | null;
  notes: string | null;
};

type ExistingPaymentRow = {
  id: string;
  payment_date: string;
};

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function safeSupabaseRequest<T extends { data?: unknown; error?: unknown }>(request: PromiseLike<T>): Promise<T | { data: null; error: unknown }> {
  try {
    return await request;
  } catch (error) {
    return { data: null, error };
  }
}

function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
}

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message ?? '') : String(error ?? '');
}

function isMissingRelation(error: unknown) {
  return errorCode(error) === '42P01' || /relation .* does not exist/i.test(errorMessage(error));
}

function isMissingColumn(error: unknown) {
  return errorCode(error) === '42703' || /column .* does not exist/i.test(errorMessage(error));
}

function isUniqueViolation(error: unknown) {
  return errorCode(error) === '23505';
}

function rowId(data: unknown) {
  if (!data || typeof data !== 'object' || !('id' in data)) return null;
  const id = (data as { id?: unknown }).id;
  return typeof id === 'string' && id.trim() ? id : null;
}

function noDueDebtsResponse(scope: 'all_users' | 'current_user', paymentDate: string, code = 'NO_DUE_DEBTS') {
  return NextResponse.json({
    ok: true,
    success: true,
    scope,
    paymentDate,
    processed: 0,
    skipped: 0,
    errors: 0,
    message: 'NO_DUE_DEBTS',
    code,
    results: [],
  });
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonth(monthIso: string) {
  const [year, month] = monthIso.split('-').map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = bearerToken(request);
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  return token === secret || headerSecret === secret;
}

async function getAuthorizedUserId(request: NextRequest) {
  const token = bearerToken(request);
  if (!token || token === process.env.CRON_SECRET?.trim()) return null;
  const user = await getUserFromBearerToken(token);
  return user?.id ?? null;
}

function firstPaymentDateForDebt(debt: DebtRow) {
  return debt.first_payment_date || deriveFirstPaymentDate(String(debt.start_date ?? ''), debt.payment_day);
}

function buildSchedule(debt: DebtRow, paymentDate: string) {
  return calculateDebtSchedule({
    originalAmount: numeric(debt.original_amount),
    startDate: String(debt.start_date ?? ''),
    firstPaymentDate: firstPaymentDateForDebt(debt),
    monthlyPayment: numeric(debt.monthly_payment),
    interestRate: numeric(debt.interest_rate),
    interestType: debt.interest_type || 'annual',
    paymentDay: debt.payment_day,
    today: paymentDate,
  });
}

async function findExistingPaymentMonths(db: any, debt: DebtRow, firstPaymentDate: string, paymentDate: string) {
  const existingPayments = await safeSupabaseRequest(db
    .from('debt_payments')
    .select('id,payment_date')
    .eq('user_id', debt.user_id)
    .eq('debt_id', debt.id)
    .gte('payment_date', firstPaymentDate)
    .lte('payment_date', paymentDate));

  if (existingPayments.error) {
    return {
      ok: false as const,
      error: existingPayments.error,
      months: new Set<string>(),
    };
  }

  const rows = (existingPayments.data ?? []) as ExistingPaymentRow[];
  return {
    ok: true as const,
    error: null,
    months: new Set(rows.map(row => debtPaymentMonth(row.payment_date)).filter(Boolean)),
  };
}

async function findExistingExpenseId(db: any, debt: DebtRow, payment: DebtSchedulePayment) {
  const monthStart = payment.paymentMonth;
  const nextMonth = addMonth(monthStart);
  const existingExpense = await safeSupabaseRequest(db
    .from('expense_items')
    .select('id')
    .eq('user_id', debt.user_id)
    .eq('debt_id', debt.id)
    .eq('source', 'debt')
    .gte('date', monthStart)
    .lt('date', nextMonth)
    .maybeSingle());

  if (existingExpense.error) {
    return {
      ok: false as const,
      error: existingExpense.error,
      expenseId: null,
    };
  }

  return {
    ok: true as const,
    error: null,
    expenseId: rowId(existingExpense.data),
  };
}

async function createExpenseIfNeeded(db: any, debt: DebtRow, payment: DebtSchedulePayment) {
  if (debt.auto_add_to_expenses === false) return null;

  const existing = await findExistingExpenseId(db, debt, payment);
  if (!existing.ok) {
    if (isMissingRelation(existing.error) || isMissingColumn(existing.error)) return null;
    throw existing.error;
  }
  if (existing.expenseId) return existing.expenseId;

  const expenseInsert = await safeSupabaseRequest(db
    .from('expense_items')
    .insert({
      user_id: debt.user_id,
      name: `دفعة شهرية للدين: ${debt.name}`,
      amount: payment.amount,
      currency: debt.currency || 'KWD',
      category: 'debt',
      date: payment.paymentDate,
      notes: debt.notes,
      source: 'debt',
      debt_id: debt.id,
      enhanced: {
        source: 'debt',
        debt_id: debt.id,
        payment_month: payment.paymentMonth,
        creditor_name: debt.creditor_name,
        generated_at: new Date().toISOString(),
      },
    })
    .select('id')
    .maybeSingle());

  if (expenseInsert.error) {
    if (isUniqueViolation(expenseInsert.error)) {
      const retry = await findExistingExpenseId(db, debt, payment);
      if (retry.ok) return retry.expenseId;
    }
    throw expenseInsert.error;
  }

  return rowId(expenseInsert.data);
}

async function createMissingPayment(db: any, debt: DebtRow, payment: DebtSchedulePayment): Promise<DebtGenerationResult> {
  try {
    const expenseId = await createExpenseIfNeeded(db, debt, payment);
    const paymentInsert = await safeSupabaseRequest(db
      .from('debt_payments')
      .insert({
        user_id: debt.user_id,
        debt_id: debt.id,
        payment_date: payment.paymentDate,
        amount: payment.amount,
        interest_amount: payment.interestAmount,
        principal_amount: payment.principalAmount,
        currency: debt.currency || 'KWD',
        expense_id: expenseId,
      })
      .select('id')
      .maybeSingle());

    if (paymentInsert.error) {
      if (isUniqueViolation(paymentInsert.error)) {
        return {
          debtId: debt.id,
          status: 'skipped',
          reason: 'payment_exists',
          paymentDate: payment.paymentDate,
          warning: payment.warning,
        };
      }
      return {
        debtId: debt.id,
        status: 'error',
        reason: errorMessage(paymentInsert.error),
        paymentDate: payment.paymentDate,
      };
    }

    return {
      debtId: debt.id,
      status: 'created',
      expenseId,
      paymentId: rowId(paymentInsert.data),
      paymentDate: payment.paymentDate,
      warning: payment.warning,
    };
  } catch (error) {
    return {
      debtId: debt.id,
      status: 'error',
      reason: errorMessage(error),
      paymentDate: payment.paymentDate,
    };
  }
}

async function updateDebtSummary(db: any, debt: DebtRow, paymentDate: string): Promise<DebtGenerationResult | null> {
  const firstPaymentDate = firstPaymentDateForDebt(debt);
  if (!firstPaymentDate) {
    return { debtId: debt.id, status: 'error', reason: 'invalid_first_payment_date' };
  }

  const schedule = buildSchedule(debt, paymentDate);
  const update = await safeSupabaseRequest(db
    .from('debts')
    .update({
      first_payment_date: firstPaymentDate,
      remaining_amount: schedule.remainingAmount,
      calculated_remaining_amount: schedule.remainingAmount,
      total_paid_amount: schedule.totalPaidAmount,
      total_interest_paid: schedule.totalInterestPaid,
      total_principal_paid: schedule.totalPrincipalPaid,
      last_calculated_at: new Date().toISOString(),
      status: schedule.isPaid ? 'paid' : debt.status || 'active',
    })
    .eq('id', debt.id)
    .eq('user_id', debt.user_id));

  if (!update.error) return { debtId: debt.id, status: 'updated', warning: schedule.warning };

  if (!isMissingColumn(update.error)) {
    return { debtId: debt.id, status: 'error', reason: errorMessage(update.error) };
  }

  const fallback = await safeSupabaseRequest(db
    .from('debts')
    .update({
      remaining_amount: schedule.remainingAmount,
      status: schedule.isPaid ? 'paid' : debt.status || 'active',
    })
    .eq('id', debt.id)
    .eq('user_id', debt.user_id));

  if (fallback.error) return { debtId: debt.id, status: 'error', reason: errorMessage(fallback.error) };
  return { debtId: debt.id, status: 'updated', warning: schedule.warning };
}

async function processDebt(db: any, debt: DebtRow, paymentDate: string): Promise<DebtGenerationResult[]> {
  const firstPaymentDate = firstPaymentDateForDebt(debt);
  if (!firstPaymentDate) {
    return [{ debtId: debt.id, status: 'error', reason: 'invalid_first_payment_date' }];
  }

  const monthlyPayment = numeric(debt.monthly_payment);
  if (monthlyPayment <= 0) {
    return [{ debtId: debt.id, status: 'skipped', reason: 'monthly_payment_missing' }];
  }

  const existing = await findExistingPaymentMonths(db, debt, firstPaymentDate, paymentDate);
  if (!existing.ok) {
    return [{
      debtId: debt.id,
      status: isMissingRelation(existing.error) ? 'skipped' : 'error',
      reason: isMissingRelation(existing.error) ? 'debt_payments_table_missing' : errorMessage(existing.error),
    }];
  }

  const schedule = buildSchedule(debt, paymentDate);
  const missingPayments = schedule.duePayments.filter(payment => !existing.months.has(payment.paymentMonth));
  const results: DebtGenerationResult[] = [];

  for (const payment of missingPayments) {
    results.push(await createMissingPayment(db, debt, payment));
  }

  const summaryResult = await updateDebtSummary(db, debt, paymentDate);
  if (summaryResult && summaryResult.status === 'error') results.push(summaryResult);

  if (results.length === 0 && schedule.duePayments.length === 0) {
    results.push({ debtId: debt.id, status: 'skipped', reason: 'no_due_payments' });
  }

  return results;
}

async function handleGenerateMonthlyExpenses(request: NextRequest) {
  const admin = createServerSupabaseAdmin();
  if (!admin) {
    console.warn('[debts] monthly payment generation skipped: service role is not configured');
    return NextResponse.json({
      ok: false,
      success: false,
      ignored: true,
      code: 'SUPABASE_SERVICE_ROLE_NOT_CONFIGURED',
      processed: 0,
    });
  }

  const cronAuthorized = isCronAuthorized(request);
  const userId = cronAuthorized ? null : await getAuthorizedUserId(request);
  if (!cronAuthorized && !userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const baseDate = todayUtc();
  const paymentDate = isoDate(baseDate);
  const scope = cronAuthorized ? 'all_users' : 'current_user';

  let query = admin
    .from('debts')
    .select('*')
    .eq('status', 'active');

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await safeSupabaseRequest(query);
  if (error) {
    if (isMissingRelation(error)) {
      console.warn('[debts] monthly payment generation skipped: debt tables are not available yet', {
        code: errorCode(error),
        message: errorMessage(error),
      });
      return noDueDebtsResponse(scope, paymentDate, 'DEBT_TABLES_NOT_READY');
    }

    console.error('[debts] monthly payment generation failed', {
      code: errorCode(error),
      message: errorMessage(error),
    });
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'DEBT_PAYMENT_GENERATION_FAILED',
      processed: 0,
    });
  }

  const debts = (data ?? []) as DebtRow[];
  if (debts.length === 0) return noDueDebtsResponse(scope, paymentDate);

  const results: DebtGenerationResult[] = [];
  for (const debt of debts) {
    results.push(...await processDebt(admin, debt, paymentDate));
  }

  const createdCount = results.filter(item => item.status === 'created').length;
  const updatedCount = results.filter(item => item.status === 'updated').length;
  const skippedCount = results.filter(item => item.status === 'skipped').length;
  const errorCount = results.filter(item => item.status === 'error').length;

  if (createdCount === 0 && errorCount === 0) {
    return NextResponse.json({
      ok: true,
      success: true,
      scope,
      paymentDate,
      processed: 0,
      updated: updatedCount,
      skipped: skippedCount,
      errors: 0,
      message: 'NO_DUE_DEBTS',
      code: 'NO_DUE_DEBTS',
      results,
    });
  }

  if (errorCount > 0) {
    console.error('[debts] monthly payment generation completed with errors', {
      paymentDate,
      errors: errorCount,
      results,
    });
  }

  return NextResponse.json({
    ok: errorCount === 0,
    success: errorCount === 0,
    code: errorCount > 0 ? 'DEBT_PAYMENT_GENERATION_FAILED' : undefined,
    scope,
    paymentDate,
    processed: createdCount,
    updated: updatedCount,
    skipped: skippedCount,
    errors: errorCount,
    results: results.map(item => ({
      debtId: item.debtId,
      status: item.status,
      reason: item.status === 'error' ? 'processing_failed' : item.reason,
      expenseId: item.expenseId,
      paymentId: item.paymentId,
      paymentDate: item.paymentDate,
      warning: item.warning,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    return await handleGenerateMonthlyExpenses(request);
  } catch (error) {
    console.error('[debts] monthly payment generation route failed safely', {
      name: error instanceof Error ? error.name : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      ok: false,
      success: false,
      ignored: true,
      code: 'DEBT_PAYMENT_GENERATION_FAILED',
      processed: 0,
      skipped: 0,
      errors: 1,
      message: 'BACKGROUND_TASK_FAILED',
      results: [],
    });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
