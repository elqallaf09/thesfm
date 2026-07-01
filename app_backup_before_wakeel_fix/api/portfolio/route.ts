// app/api/portfolio/route.ts
// يرجّع المحفظة الحقيقية للمستخدم + حساب الزكاة. بيانات حساسة → لازم تكون محميّة بالمصادقة.

import { NextRequest, NextResponse } from "next/server";
import { computeZakat, type FinancialProfile } from "@/lib/wakeel";

export const runtime = "nodejs";

// --- 1) المصادقة: استبدلها بنظامك الفعلي ---
async function getUserId(req: NextRequest): Promise<string | null> {
  // أمثلة حسب ما تستخدم:
  //   NextAuth:   const session = await auth(); return session?.user?.id ?? null;
  //   Supabase:   const { data } = await supabase.auth.getUser(); return data.user?.id ?? null;
  //   Clerk:      const { userId } = auth(); return userId ?? null;
  return req.headers.get("x-user-id"); // placeholder مؤقت
}

// --- 2) جلب البيانات من قاعدة بياناتك ومطابقتها مع الشكل المطلوب ---
async function loadProfileFromDB(userId: string): Promise<FinancialProfile> {
  // TODO: استعلم عن جداول THE SFM لهذا المستخدم، واجمع:
  //   - الحسابات النقدية   -> cash
  //   - الأسهم/الاستثمارات -> investments (مجموع قيمها السوقية)
  //   - الذهب              -> gold
  //   - الذمم المدينة       -> receivables
  //   - الالتزامات          -> liabilities
  //   - النصاب: ثابت أو محسوب من سعر الذهب الحي (nisabFromGoldPricePerGram)
  return {
    currency: "د.إ",
    cash: 50000,
    investments: 220000,
    gold: 30000,
    receivables: 10000,
    liabilities: 20000,
    nisab: 24000,
  };
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await loadProfileFromDB(userId);
  return NextResponse.json(computeZakat(profile), {
    headers: { "Cache-Control": "private, no-store" }, // لا تُخزَّن في أي كاش
  });
}
