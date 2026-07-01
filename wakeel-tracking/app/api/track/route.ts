// app/api/track/route.ts
// نقطة استقبال أحداث التتبّع: زيارات الصفحات + استخدام الميزات.
// تكتب عبر service_role (يتجاوز RLS) — والمدخلات محدودة ومُعقّمة.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { type?: string; path?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const { type, path, name } = body || {};

  // معرّف جلسة للزوار غير المسجّلين (كوكي يدوم سنة)
  const jar = await cookies();
  let sid = jar.get("sfm_sid")?.value;
  const newSid = !sid;
  if (!sid) sid = randomUUID();

  // معرّف المستخدم لو مسجّل دخوله (اختياري)
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {}

  const admin = createAdminClient();
  try {
    if (type === "pageview" && path) {
      await admin.from("page_views").insert({
        user_id: userId,
        session_id: sid,
        path: String(path).slice(0, 512),
      });
    } else if (type === "feature" && name) {
      await admin.from("events").insert({
        user_id: userId,
        name: String(name).slice(0, 128),
        category: "feature",
      });
    } else {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  if (newSid) {
    res.cookies.set("sfm_sid", sid, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}
