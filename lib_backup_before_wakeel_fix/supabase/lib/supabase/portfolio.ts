// lib/supabase/portfolio.ts
// طبقة الوصول للبيانات: تحقق المستخدم + جلب ملفه المالي من Supabase.
// تُستخدم من راوت /api/portfolio و /api/wakeel (تجنّب التكرار).

import { createClient } from "@/lib/supabase/server";
import type { FinancialProfile } from "@/lib/wakeel";

// يرجّع معرّف المستخدم المسجّل دخوله، أو null لو غير مصادَق.
export async function getAuthedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(); // يتحقق من التوكن مع سيرفر Supabase (آمن)
  return user?.id ?? null;
}

// يجلب الملف المالي للمستخدم. عدّل أسماء الجداول/الأعمدة لتطابق قاعدة بياناتك.
export async function loadProfile(userId: string): Promise<FinancialProfile> {
  const supabase = await createClient();

  // 1) الحقول المفردة من جدول الملف المالي (صف واحد لكل مستخدم)
  const { data: p } = await supabase
    .from("financial_profiles")
    .select("currency, cash, gold, receivables, liabilities, nisab")
    .eq("user_id", userId)
    .maybeSingle();

  // 2) الاستثمارات = مجموع القيمة السوقية للحيازات
  const { data: holdings } = await supabase
    .from("holdings")
    .select("market_value")
    .eq("user_id", userId);

  const investments = (holdings ?? []).reduce(
    (sum, h) => sum + Number(h.market_value ?? 0),
    0
  );

  // دفاعي: قيم افتراضية لو الصف ناقص أو غير موجود بعد
  return {
    currency: p?.currency ?? "د.إ",
    cash: Number(p?.cash ?? 0),
    investments,
    gold: Number(p?.gold ?? 0),
    receivables: Number(p?.receivables ?? 0),
    liabilities: Number(p?.liabilities ?? 0),
    nisab: Number(p?.nisab ?? 24000), // أو احسبه من سعر الذهب الحي
  };
}
