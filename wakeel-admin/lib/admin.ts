// lib/admin.ts
// بوابة الأدمن: تحديد من يحق له رؤية تحليلات الموقع.

import { createClient } from "@/lib/supabase/server";

// إيميلات الأدمن — من ENV أو الافتراضي. يُقبل أكثر من إيميل مفصولة بفواصل.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "elqallaf09@gmail.com")
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// إيميل المستخدم الحالي (مُتحقَّق من سيرفر Supabase)، أو null.
export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() ?? null;

  // ── للتجربة بدون تسجيل دخول، علّق ما فوق واستخدم:
  // return "elqallaf09@gmail.com";
}

export function isAdmin(email: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
