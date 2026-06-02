import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';

type DebtGenerationResult = {
  debtId: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
  expenseId?: string | null;
  paymentId?: string | null;
  warning?: string | null;
};

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  creditor_name: string | null;
  remaining_amount: number | string | null;
  currency: string | null;
  monthly_payment: number | string | null;
  interest_rate: number | string | null;
  interest_type: 'none' | 'annual' | 'monthly' | string | null;
  payment_day: number | string | null;
  auto_add_to_expenses: boolean | null;
  status: string | null;
  notes: string | null;
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

function dueDateForMonth(day: number, base = todayUtc()) {
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(Math.max(day, 1), lastDay)));
}

function isDueToday(debt: DebtRow, base = todayUtc()) {
  const due = dueDateForMonth(numeric(debt.payment_day, 1), base);
  return isoDate(due) === isoDate(base);
}

function calculatePayment(debt: DebtRow) {
  const remaining = numeric(debt.remaining_amount);
  const monthlyPayment = numeric(debt.monthly_payment);
  const rate = numeric(debt.interest_rate);
  const type = debt.interest_type || 'annual';
  const monthlyRate = type === 'none' ? 0 : type === 'monthly' ? rate / 100 : rate / 100 / 12;
  const interestAmount = Math.max(0, remaining * monthlyRate);
  const principalAmount = monthlyPayment - interestAmount;
  const nextRemaining = Math.max(0, remaining - principalAmount);
  return {
    amount: monthlyPayment,
    interestAmount,
    principalAmount,
    nextRemaining,
    status: nextRemaining <= 0 ? 'paid' : debt.status || 'active',
    warning: principalAmount < 0 ? 'monthly_payment_below_interest' : null,
  };
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
  const querySecret = request.nextUrl.searchParams.get('secret')?.trim();
  return token === secret || headerSecret === secret || querySecret === secret;
}

async function getAuthorizedUserId(request: NextRequest) {
  const token = bearerToken(request);
  if (!token || token === process.env.CRON_SECRET?.trim()) return null;
  const user = await getUserFromBearerToken(token);
  return user?.id ?? null;
}

async function processDebt(db: any, debt: DebtRow, paymentDate: string): Promise<DebtGenerationResult> {
  const existingPayment = await safeSupabaseRequest(db
    .from('debt_payments')
    .select('id')
    .eq('user_id', debt.user_id)
    .eq('debt_id', debt.id)
    .eq('payment_date', paymentDate)
    .maybeSingle());

  if (existingPayment.error) {
    return {
      debtId: debt.id,
      status: isMissingRelation(existingPayment.error) ? 'skipped' : 'error',
      reason: isMissingRelation(existingPayment.error) ? 'debt_payments_table_missing' : errorMessage(existingPayment.error),
    };
  }

  const existingPaymentId = rowId(existingPayment.data);
  if (existingPaymentId) {
    return { debtId: debt.id, status: 'skipped', reason: 'payment_exists' };
  }

  const existingExpense = await safeSupabaseRequest(db
    .from('expense_items')
    .select('id')
    .eq('user_id', debt.user_id)
    .eq('debt_id', debt.id)
    .eq('source', 'debt')
    .eq('date', paymentDate)
    .maybeSingle());

  if (existingExpense.error) {
    return {
      debtId: debt.id,
      status: isMissingRelation(existingExpense.error) ? 'skipped' : 'error',
      reason: isMissingRelation(existingExpense.error) ? 'expense_items_table_missing' : errorMessage(existingExpense.error),
    };
  }

  const payment = calculatePayment(debt);
  if (payment.amount <= 0) {
    return { debtId: debt.id, status: 'skipped', reason: 'monthly_payment_missing' };
  }

  let expenseId = rowId(existingExpense.data);
  if (!expenseId && debt.auto_add_to_expenses !== false) {
    const expenseInsert = await safeSupabaseRequest(db
      .from('expense_items')
      .insert({
        user_id: debt.user_id,
        name: `دفعة شهرية: ${debt.name}`,
        amount: payment.amount,
        currency: debt.currency || 'KWD',
        category: 'debt',
        date: paymentDate,
        notes: debt.notes,
        source: 'debt',
        debt_id: debt.id,
        enhanced: {
          source: 'debt',
          debt_id: debt.id,
          creditor_name: debt.creditor_name,
          generated_at: new Date().toISOString(),
        },
      })
      .select('id')
      .maybeSingle());

    if (expenseInsert.error) {
      return { debtId: debt.id, status: 'error', reason: errorMessage(expenseInsert.error) };
    }
    expenseId = rowId(expenseInsert.data);
  }

  const paymentInsert = await safeSupabaseRequest(db
    .from('debt_payments')
    .insert({
      user_id: debt.user_id,
      debt_id: debt.id,
      payment_date: paymentDate,
      amount: payment.amount,
      interest_amount: payment.interestAmount,
      principal_amount: payment.principalAmount,
      currency: debt.currency || 'KWD',
      expense_id: expenseId,
    })
    .select('id')
    .maybeSingle());

  if (paymentInsert.error) {
    return { debtId: debt.id, status: 'error', reason: errorMessage(paymentInsert.error) };
  }

  const update = await safeSupabaseRequest(db
    .from('debts')
    .update({
      remaining_amount: payment.nextRemaining,
      status: payment.status,
    })
    .eq('id', debt.id)
    .eq('user_id', debt.user_id));

  if (update.error) {
    return { debtId: debt.id, status: 'error', reason: errorMessage(update.error) };
  }

  return {
    debtId: debt.id,
    status: 'created',
    expenseId,
    paymentId: rowId(paymentInsert.data),
    warning: payment.warning,
  };
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
    .eq('status', 'active')
    .eq('auto_add_to_expenses', true);

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

  const dueDebts = (data ?? []).filter((debt: DebtRow) => isDueToday(debt, baseDate));
  if (dueDebts.length === 0) {
    return noDueDebtsResponse(scope, paymentDate);
  }

  const results: DebtGenerationResult[] = [];
  for (const debt of dueDebts) {
    results.push(await processDebt(admin, debt as DebtRow, paymentDate));
  }
  const createdCount = results.filter(item => item.status === 'created').length;
  const skippedCount = results.filter(item => item.status === 'skipped').length;
  const errorCount = results.filter(item => item.status === 'error').length;
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
    skipped: skippedCount,
    errors: errorCount,
    results: results.map(item => ({
      debtId: item.debtId,
      status: item.status,
      reason: item.status === 'error' ? 'processing_failed' : item.reason,
      expenseId: item.expenseId,
      paymentId: item.paymentId,
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
