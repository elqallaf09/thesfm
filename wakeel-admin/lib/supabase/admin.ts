// lib/supabase/admin.ts
// عميل بصلاحية service_role لقراءة بيانات كل المستخدمين (تجميع التحليلات).
// ⚠ يُستخدم في السيرفر فقط. لا تضع SUPABASE_SERVICE_ROLE_KEY في أي متغيّر NEXT_PUBLIC.

import { createClient } from "@supabase/supabase-js";
import { getSupabasePrivilegedConfig, SUPABASE_PRIVILEGED_CONFIG_ERROR } from '../../../src/lib/server/supabaseEnvironment';

export function createAdminClient() {
  const config = getSupabasePrivilegedConfig();
  if (!config) throw new Error(SUPABASE_PRIVILEGED_CONFIG_ERROR);
  return createClient(
    config.url,
    config.secretKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
