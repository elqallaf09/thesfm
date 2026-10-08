import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { buildMobileBusinessSummary, type MobileBusinessSummary } from '@/lib/mobile/businessSummary';
import type { FinancialRow } from '@/lib/dashboard/financialMetrics';

export const runtime = 'nodejs';

const TABLES = ['projects', 'business_customers', 'business_suppliers', 'business_employees', 'business_invoices', 'business_sales', 'business_operating_expenses'] as const;

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}

function response<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
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

type SummaryResponse = { ok: true; summary: MobileBusinessSummary } | { ok: false; code: string };

export async function GET(request: NextRequest): Promise<NextResponse<SummaryResponse>> {
  const token = bearerToken(request);
  if (!token) return response({ ok: false, code: 'UNAUTHORIZED' }, 401);

  const user = await getUserFromBearerToken(token);
  if (!user) return response({ ok: false, code: 'UNAUTHORIZED' }, 401);

  const client = configuredUserClient(token);
  if (!client) return response({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, 503);

  const [profileResult, projectsResult, customersResult, suppliersResult, employeesResult, invoicesResult, salesResult, operatingExpensesResult] = await Promise.all([
    client.from('profiles').select('default_currency, preferred_currency, currency').eq('id', user.id).maybeSingle(),
    client.from('projects').select('id').eq('user_id', user.id).limit(1_000),
    client.from('business_customers').select('id').eq('user_id', user.id).limit(1_000),
    client.from('business_suppliers').select('id').eq('user_id', user.id).limit(1_000),
    client.from('business_employees').select('status').eq('user_id', user.id).limit(1_000),
    client.from('business_invoices').select('amount, currency, status').eq('user_id', user.id).limit(1_000),
    client.from('business_sales').select('amount, currency, status, sale_date').eq('user_id', user.id).limit(1_000),
    client.from('business_operating_expenses').select('amount, currency, expense_date').eq('user_id', user.id).limit(1_000),
  ]);

  const tableResults = [projectsResult, customersResult, suppliersResult, employeesResult, invoicesResult, salesResult, operatingExpensesResult];
  if (profileResult.error || tableResults.some(result => result.error)) {
    return response({ ok: false, code: 'SUMMARY_UNAVAILABLE' }, 503);
  }

  const rows = Object.fromEntries(TABLES.map((table, index) => [table, (tableResults[index]?.data ?? []) as FinancialRow[]])) as Record<typeof TABLES[number], FinancialRow[]>;
  const summary = buildMobileBusinessSummary({
    profile: (profileResult.data ?? null) as FinancialRow | null,
    projects: rows.projects,
    customers: rows.business_customers,
    suppliers: rows.business_suppliers,
    employees: rows.business_employees,
    invoices: rows.business_invoices,
    sales: rows.business_sales,
    operatingExpenses: rows.business_operating_expenses,
  });

  return response({ ok: true, summary });
}
