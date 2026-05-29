import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DeleteTarget = {
  table: string;
  column: 'id' | 'user_id';
  optional?: boolean;
};

const DELETE_TARGETS: DeleteTarget[] = [
  { table: 'monthly_income_sources', column: 'user_id', optional: true },
  { table: 'expense_items', column: 'user_id', optional: true },
  { table: 'savings_items', column: 'user_id', optional: true },
  { table: 'investment_items', column: 'user_id', optional: true },
  { table: 'financial_goals', column: 'user_id', optional: true },
  { table: 'user_decisions', column: 'user_id', optional: true },
  { table: 'notifications', column: 'user_id', optional: true },
  { table: 'reports', column: 'user_id', optional: true },
  { table: 'generated_reports', column: 'user_id', optional: true },
  { table: 'project_documents', column: 'user_id', optional: true },
  { table: 'project_pitch_decks', column: 'user_id', optional: true },
  { table: 'project_strategic_documents', column: 'user_id', optional: true },
  { table: 'charity_documents', column: 'user_id', optional: true },
  { table: 'charity_reminders', column: 'user_id', optional: true },
  { table: 'zakat_calculations', column: 'user_id', optional: true },
  { table: 'charity_projects', column: 'user_id', optional: true },
  { table: 'projects', column: 'user_id', optional: true },
  { table: 'profiles', column: 'id' },
];

function json(body: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  });
}

function isMissingOptionalTableError(error: { code?: string; message?: string; details?: string } | null) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return (
    text.includes('pgrst205') ||
    text.includes('42p01') ||
    text.includes('42703') ||
    text.includes('could not find the table') ||
    text.includes('does not exist') ||
    text.includes('schema cache')
  );
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('[DeleteAccount] Failed', {
      userId: null,
      code: 'missing_environment',
      message: 'Missing Supabase URL, anon key, or service role key.',
      details: null,
    });
    return json({ success: false, error: 'delete_unavailable' }, { status: 503 });
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ success: false, error: 'unauthorized' }, { status: 401 });

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user;

  if (userError || !user?.id) {
    console.error('[DeleteAccount] Failed', {
      userId: null,
      code: userError?.code ?? 'unauthorized',
      message: userError?.message ?? 'Authenticated user was not found.',
      details: null,
    });
    return json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    for (const target of DELETE_TARGETS) {
      const { error } = await admin
        .from(target.table)
        .delete()
        .eq(target.column, user.id);

      if (!error) continue;
      if (target.optional && isMissingOptionalTableError(error)) continue;

      throw {
        code: error.code,
        message: `Failed to delete from ${target.table}: ${error.message}`,
        details: error.details,
      };
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      throw {
        code: deleteUserError.code,
        message: deleteUserError.message,
        details: deleteUserError.status,
      };
    }

    return json({ success: true });
  } catch (error: any) {
    console.error('[DeleteAccount] Failed', {
      userId: user.id,
      code: error?.code ?? 'delete_failed',
      message: error?.message ?? 'Account deletion failed.',
      details: error?.details ?? null,
    });
    return json({ success: false, error: 'delete_failed' }, { status: 500 });
  }
}
