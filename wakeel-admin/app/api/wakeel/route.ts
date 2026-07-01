// app/api/wakeel/route.ts
// عقل الوكيل: محفظة المستخدم + (للأدمن) تحليلات الموقع + Claude مع بحث مباشر.

import { NextRequest, NextResponse } from "next/server";
import { computeZakat, buildSystemPrompt } from "@/lib/wakeel";
import { getAuthedUserId, loadProfile } from "@/lib/supabase/portfolio";
import { getCurrentUserEmail, isAdmin } from "@/lib/admin";
import { getSiteAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 30;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const userId = await getAuthedUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { messages, name = "وكيل" } = (await req.json()) as {
    messages: Msg[];
    name?: string;
  };
  if (!Array.isArray(messages) || messages.length === 0)
    return NextResponse.json({ error: "messages required" }, { status: 400 });

  const summary = computeZakat(await loadProfile(userId));

  // تحليلات الموقع فقط لو المستخدم أدمن
  const email = await getCurrentUserEmail();
  const analytics = isAdmin(email) ? await getSiteAnalytics() : null;

  const system = buildSystemPrompt(name, summary, analytics);

  const callClaude = async (useTools: boolean): Promise<string> => {
    const body: Record<string, unknown> = {
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: messages.slice(-12),
    };
    if (useTools)
      body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error.message || "anthropic_error");
    return (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();
  };

  try {
    let text = "";
    try {
      text = await callClaude(true);
    } catch {
      text = await callClaude(false);
    }
    return NextResponse.json({ text: text || "…" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "failed" }, { status: 500 });
  }
}
