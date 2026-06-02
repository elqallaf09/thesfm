import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';

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

async function processDebt(db: any, debt: DebtRow, paymentDate: string) {
  const existingPayment = await db
    .from('debt_payments')
    .select('id')
    .eq('user_id', debt.user_id)
    .eq('debt_id', debt.id)
    .eq('payment_date', paymentDate)
    .maybeSingle();

  if (existingPayment.data?.id) {
    return { debtId: debt.id, status: 'skipped', reason: 'payment_exists' };
  }

  const existingExpense = await db
    .from('expense_items')
    .select('id')
    .eq('user_id', debt.user_id)
    .eq('debt_id', debt.id)
    .eq('source', 'debt')
    .eq('date', paymentDate)
    .maybeSingle();

  const payment = calculatePayment(debt);
  if (payment.amount <= 0) {
    return { debtId: debt.id, status: 'skipped', reason: 'monthly_payment_missing' };
  }

  let expenseId = existingExpense.data?.id ?? null;
  if (!expenseId && debt.auto_add_to_expenses !== false) {
    const expenseInsert = await db
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
      .maybeSingle();

    if (expenseInsert.error) {
      return { debtId: debt.id, status: 'error', reason: expenseInsert.error.message };
    }
    expenseId = expenseInsert.data?.id ?? null;
  }

  const paymentInsert = await db
    .from('debt_payments')
    .insert({
      user_id: debt.user_id,
      debt_id: debt.id,
      payment_date: paymentDate,
      amount: payment.amount,
      interest_amount: payment.interestAmount,
      principal_amount: payment.principalAmount,
      expense_id: expenseId,
    })
    .select('id')
    .maybeSingle();

  if (paymentInsert.error) {
    return { debtId: debt.id, status: 'error', reason: paymentInsert.error.message };
  }

  const update = await db
    .from('debts')
    .update({
      remaining_amount: payment.nextRemaining,
      status: payment.status,
    })
    .eq('id', debt.id)
    .eq('user_id', debt.user_id);

  if (update.error) {
    return { debtId: debt.id, status: 'error', reason: update.error.message };
  }

  return {
    debtId: debt.id,
    status: 'created',
    expenseId,
    paymentId: paymentInsert.data?.id ?? null,
    warning: payment.warning,
  };
}

async function handleGenerateMonthlyExpenses(request: NextRequest) {
  const admin = createServerSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Supabase service role is not configured.' }, { status: 503 });
  }

  const cronAuthorized = isCronAuthorized(request);
  const userId = cronAuthorized ? null : await getAuthorizedUserId(request);
  if (!cronAuthorized && !userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const baseDate = todayUtc();
  const paymentDate = isoDate(baseDate);

  let query = admin
    .from('debts')
    .select('*')
    .eq('status', 'active')
    .eq('auto_add_to_expenses', true);

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const dueDebts = (data ?? []).filter((debt: DebtRow) => isDueToday(debt, baseDate));
  const results = [];
  for (const debt of dueDebts) {
    results.push(await processDebt(admin, debt as DebtRow, paymentDate));
  }

  return NextResponse.json({
    success: true,
    scope: cronAuthorized ? 'all_users' : 'current_user',
    paymentDate,
    processed: results.filter(item => item.status === 'created').length,
    skipped: results.filter(item => item.status === 'skipped').length,
    errors: results.filter(item => item.status === 'error').length,
    results,
  });
}

export async function POST(request: NextRequest) {
  return handleGenerateMonthlyExpenses(request);
}

export async function GET(request: NextRequest) {
  return handleGenerateMonthlyExpenses(request);
}
