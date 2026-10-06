import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { buildMobileFinanceSummary, type MobileFinanceSummary } from '@/lib/mobile/financeSummary';
import type { FinancialRow } from '@/lib/dashboard/financialMetrics';

export const runtime = 'nodejs';

const TABLES = ['monthly_income_sources', 'expense_items', 'savings_items', 'investment_items', 'debts'] as const;

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}

function response<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function configuredUserClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

type SummaryResponse = { ok: true; summary: MobileFinanceSummary } | { ok: false; code: string };

export async function GET(request: NextRequest): Promise<NextResponse<SummaryResponse>> {
  const token = bearerToken(request);
  if (!token) return response({ ok: false, code: 'UNAUTHORIZED' }, 401);

  const user = await getUserFromBearerToken(token);
  if (!user) return response({ ok: false, code: 'UNAUTHORIZED' }, 401);

  const client = configuredUserClient(token);
  if (!client) return response({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, 503);

  const [profileResult, ...tableResults] = await Promise.all([
    client.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    ...TABLES.map(table => client.from(table).select('*').eq('user_id', user.id).limit(1_000)),
  ]);

  if (profileResult.error || tableResults.some(result => result.error)) {
    return response({ ok: false, code: 'SUMMARY_UNAVAILABLE' }, 503);
  }

  const rows = Object.fromEntries(TABLES.map((table, index) => [table, (tableResults[index].data ?? []) as FinancialRow[]])) as Record<typeof TABLES[number], FinancialRow[]>;
  const summary = buildMobileFinanceSummary({
    profile: (profileResult.data ?? null) as FinancialRow | null,
    income: rows.monthly_income_sources,
    expenses: rows.expense_items,
    savings: rows.savings_items,
    investments: rows.investment_items,
    debts: rows.debts,
  });

  return response({ ok: true, summary });
}
