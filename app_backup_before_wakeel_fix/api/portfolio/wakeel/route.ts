// app/api/wakeel/route.ts
// عقل الوكيل: يستقبل المحادثة، يحقن محفظة المستخدم، وينادي Claude مع البحث المباشر.
// مفتاح Anthropic يبقى في السيرفر فقط (ENV) ولا يصل للعميل أبداً.
import Wakeel from "@/components/Wakeel";

export default function Page() {
  return <Wakeel />;
}
import { NextRequest, NextResponse } from "next/server";
import { computeZakat, buildSystemPrompt, type FinancialProfile } from "@/lib/wakeel";

export const runtime = "nodejs";
export const maxDuration = 30; // البحث المباشر قد يحتاج وقت أطول

type Msg = { role: "user" | "assistant"; content: string };

// نفس دالتي المصادقة والجلب المستخدمتين في راوت المحفظة (وحّدهما في lib لو حبيت)
async function getUserId(req: NextRequest): Promise<string | null> {
  return req.headers.get("x-user-id"); // TODO: استبدل بنظام المصادقة الفعلي
}
async function loadProfileFromDB(userId: string): Promise<FinancialProfile> {
  // TODO: نفس استعلام راوت المحفظة
  return { currency: "د.إ", cash: 50000, investments: 220000, gold: 30000, receivables: 10000, liabilities: 20000, nisab: 24000 };
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { messages, name = "وكيل" } = (await req.json()) as { messages: Msg[]; name?: string };
  if (!Array.isArray(messages) || messages.length === 0)
    return NextResponse.json({ error: "messages required" }, { status: 400 });

  const summary = computeZakat(await loadProfileFromDB(userId));
  const system = buildSystemPrompt(name, summary);

  const callClaude = async (useTools: boolean): Promise<string> => {
    const body: Record<string, unknown> = {
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: messages.slice(-12),
    };
    // أداة البحث المباشر من Anthropic (سيرفر-سايد، تنفذها أنثروبيك وترجع النص جاهز)
    if (useTools) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];

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
    try { text = await callClaude(true); }           // جرّب مع البحث المباشر
    catch { text = await callClaude(false); }         // وإلا ارجع بدون أدوات (تدرّج آمن)
    return NextResponse.json({ text: text || "…" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "failed" }, { status: 500 });
  }
}
