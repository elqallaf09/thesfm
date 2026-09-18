import 'server-only';
import type { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

type Admin = NonNullable<ReturnType<typeof createServerSupabaseAdmin>>;

/** Reject partial snapshots, including a PostgREST cap below the requested limit. */
export async function loadCompleteEconomicRows(admin: Admin, table: string, userId: string, columns = '*') {
  const { data, error, count } = await admin.from(table).select(columns, { count: 'exact' })
    .eq('user_id', userId).limit(2000).abortSignal(AbortSignal.timeout(8000));
  if (error) throw new Error(`ECONOMIC_INTELLIGENCE_SOURCE_FAILED:${table}:${error.code ?? 'unknown'}`);
  if (count === null || count !== (data?.length ?? 0)) throw new Error(`ECONOMIC_INTELLIGENCE_SOURCE_INCOMPLETE:${table}`);
  return (data ?? []) as unknown as Record<string, unknown>[];
}
