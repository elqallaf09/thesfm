import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Tables the app reads on the main pages
const TABLES = [
  'profiles',
  'monthly_income_sources',
  'expense_items',
  'savings_items',
  'investment_items',
  'financial_goals',
  'notifications',
] as const;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missingEnv: string[] = [];
  if (!url) missingEnv.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) missingEnv.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missingEnv.length > 0) {
    return NextResponse.json(
      { ok: false, database: 'misconfigured', missingEnv, tables: {} },
      { status: 503 },
    );
  }

  // Fresh stateless client (never persists a session on the server)
  const client = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tables: Record<string, string> = {};
  let allReachable = true;

  await Promise.all(
    TABLES.map(async table => {
      // head + count probes reachability without returning rows.
      // A missing table errors ("relation does not exist"); RLS-blocked
      // but existing tables succeed with count 0.
      const { error } = await client.from(table).select('id', { count: 'exact', head: true });
      if (error) {
        tables[table] = `error: ${error.message}`;
        allReachable = false;
      } else {
        tables[table] = 'ok';
      }
    }),
  );

  return NextResponse.json(
    {
      ok: allReachable,
      database: allReachable ? 'connected' : 'degraded',
      missingEnv,
      tables,
    },
    { status: allReachable ? 200 : 503 },
  );
}
