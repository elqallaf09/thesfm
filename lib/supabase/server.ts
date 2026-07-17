// lib/supabase/server.ts
// عميل Supabase للسيرفر (Route Handlers / Server Components) — أحدث طريقة بـ @supabase/ssr.
// لو عندك هذا الملف جاهز بمشروعك (غالباً موجود مادام حماية المسارات تشتغل) — استخدمه واتجاهل هذا.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig, SUPABASE_PUBLIC_CONFIG_ERROR } from '@/integrations/supabase/environment';

export async function createClient() {
  const cookieStore = await cookies(); // ملاحظة: cookies() صارت async في Next الحديث
  const config = getSupabasePublicConfig();
  if (!config) throw new Error(SUPABASE_PUBLIC_CONFIG_ERROR);

  return createServerClient(
    config.url,
    config.key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // يُستدعى من Server Component — تجاهل الكتابة، الـ middleware يحدّث الجلسة
          }
        },
      },
    }
  );
}
