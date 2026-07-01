// lib/supabase/admin.ts
// عميل بصلاحية service_role لقراءة بيانات كل المستخدمين (تجميع التحليلات).
// ⚠ يُستخدم في السيرفر فقط. لا تضع SUPABASE_SERVICE_ROLE_KEY في أي متغيّر NEXT_PUBLIC.

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
