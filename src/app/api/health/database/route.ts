import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_TABLES = {
  profiles: 'profiles',
  expenses: 'expense_items',
  income: 'monthly_income_sources',
  investments: 'investment_items',
  savings: 'savings_items',
  goals: 'financial_goals',
  projects: 'projects',
  campaigns: 'ad_campaigns',
  notifications: 'notifications',
};

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_SERVICE_ROLE_KEY;
  const missingEnv = [
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : '',
    !anonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : '',
    !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY or DATABASE_SERVICE_ROLE_KEY' : '',
  ].filter(Boolean);

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({
      ok: false,
      database: 'missing-env',
      missingEnv,
      tables: {},
    }, { status: 500 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const entries = await Promise.all(Object.entries(REQUIRED_TABLES).map(async ([key, table]) => {
    const { error } = await client.from(table).select('*', { count: 'exact', head: true });
    return [key, error ? `error: ${error.message}` : 'ok'] as const;
  }));
  const tables = Object.fromEntries(entries);
  const ok = missingEnv.length === 0 && Object.values(tables).every(status => status === 'ok');

  return NextResponse.json({
    ok,
    database: ok ? 'connected' : 'degraded',
    missingEnv,
    tables,
  }, { status: ok ? 200 : 500 });
}
