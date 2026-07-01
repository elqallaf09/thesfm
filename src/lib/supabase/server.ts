// lib/supabase/server.ts
// عميل Supabase للسيرفر (Route Handlers / Server Components) — أحدث طريقة بـ @supabase/ssr.
// لو عندك هذا الملف جاهز بمشروعك (غالباً موجود مادام حماية المسارات تشتغل) — استخدمه واتجاهل هذا.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies(); // ملاحظة: cookies() صارت async في Next الحديث

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // أو publishable key الجديد (sb_publishable_...)
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
