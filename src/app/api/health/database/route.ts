import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const dynamic = 'force-dynamic';

const TABLE_CHECKS = {
  profiles: 'profiles',
  expenses: 'expense_items',
  expense_items: 'expense_items',
  income: 'monthly_income_sources',
  investments: 'investment_items',
  savings: 'savings_items',
  goals: 'financial_goals',
  projects: 'projects',
  campaigns: 'ad_campaigns',
  notifications: 'notifications',
} as const;

type DiagnosticStatus = 'ok' | 'missing' | 'error' | 'not_checked';

function diagnosticStatus(message?: string): DiagnosticStatus {
  if (!message) return 'ok';
  const lower = message.toLowerCase();
  if (lower.includes('could not find') || lower.includes('does not exist') || lower.includes('relation') || lower.includes('column')) {
    return 'missing';
  }
  return 'error';
}

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function publicHealthBody(ok: boolean, configured: boolean, checkedAt: string) {
  return {
    ok,
    status: ok ? 'success' : configured ? 'error' : 'misconfigured',
    database: ok ? 'available' : 'unavailable',
    checkedAt,
  };
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, {
    max: 30,
    windowMs: 60_000,
    prefix: 'database-health',
  });
  if (limited) return limited;

  const checkedAt = new Date().toISOString();
  const detailsRequested = ['1', 'true'].includes(new URL(request.url).searchParams.get('details') ?? '');
  let adminClient: SupabaseClient | null = null;
  if (detailsRequested) {
    const auth = await requireAdminApiAccess(request, 'admin_dashboard').catch(() => null);
    if (!auth) return response({ ok: false, code: 'ADMIN_AUTH_CHECK_FAILED' }, 503);
    if (!auth.ok) return response({ ok: false, code: auth.code }, auth.status);
    adminClient = auth.admin;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured = Boolean(supabaseUrl && anonKey);
  const notChecked = Object.fromEntries(Object.keys(TABLE_CHECKS).map(key => [key, 'not_checked'])) as Record<string, DiagnosticStatus>;

  if (!supabaseUrl || !anonKey) {
    if (!detailsRequested) return response(publicHealthBody(false, false, checkedAt), 503);
    return response({
      ok: false,
      status: 'misconfigured',
      database: 'unavailable',
      configuration: {
        urlConfigured: Boolean(supabaseUrl),
        anonKeyConfigured: Boolean(anonKey),
      },
      tables: notChecked,
      columns: { 'expense_items.enhanced': 'not_checked' },
      checkedAt,
    }, 503);
  }

  try {
    const supabase = adminClient ?? createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const tableEntries = await Promise.all(
      Object.entries(TABLE_CHECKS).map(async ([key, table]) => {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        return [key, diagnosticStatus(error?.message)] as const;
      }),
    );
    const tables = Object.fromEntries(tableEntries) as Record<string, DiagnosticStatus>;

    const { error: enhancedError } = await supabase
      .from('expense_items')
      .select('enhanced', { count: 'exact', head: true });
    const columns: Record<string, DiagnosticStatus> = {
      'expense_items.enhanced': diagnosticStatus(enhancedError?.message),
    };

    const ok = Object.values(tables).every(status => status === 'ok')
      && Object.values(columns).every(status => status === 'ok');
    if (!detailsRequested) return response(publicHealthBody(ok, configured, checkedAt), ok ? 200 : 503);

    return response({
      ok,
      status: ok ? 'success' : 'error',
      database: ok ? 'available' : 'unavailable',
      configuration: { urlConfigured: true, anonKeyConfigured: true },
      tables,
      columns,
      checkedAt,
    }, ok ? 200 : 503);
  } catch {
    if (!detailsRequested) return response(publicHealthBody(false, true, checkedAt), 503);
    return response({
      ok: false,
      status: 'error',
      database: 'unavailable',
      code: 'DATABASE_HEALTH_CHECK_FAILED',
      checkedAt,
    }, 503);
  }
}
