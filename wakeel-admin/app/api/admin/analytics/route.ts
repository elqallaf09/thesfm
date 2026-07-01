// app/api/admin/analytics/route.ts
// نقطة تحليلات محصورة بالأدمن فقط.

import { NextResponse } from "next/server";
import { getCurrentUserEmail, isAdmin } from "@/lib/admin";
import { getSiteAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";

export async function GET() {
  const email = await getCurrentUserEmail();
  if (!isAdmin(email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const analytics = await getSiteAnalytics();
  return NextResponse.json(analytics ?? {}, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
