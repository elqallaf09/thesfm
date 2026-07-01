// app/api/wakeel/route.ts
// Ø¹Ù‚Ù„ Ø§Ù„ÙˆÙƒÙŠÙ„: ÙŠØ³ØªÙ‚Ø¨Ù„ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©ØŒ ÙŠØ­Ù‚Ù† Ù…Ø­ÙØ¸Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ØŒ ÙˆÙŠÙ†Ø§Ø¯ÙŠ Claude Ù…Ø¹ Ø§Ù„Ø¨Ø­Ø« Ø§Ù„Ù…Ø¨Ø§Ø´Ø±.
// Ù…ÙØªØ§Ø­ Anthropic ÙŠØ¨Ù‚Ù‰ ÙÙŠ Ø§Ù„Ø³ÙŠØ±ÙØ± ÙÙ‚Ø· (ENV) ÙˆÙ„Ø§ ÙŠØµÙ„ Ù„Ù„Ø¹Ù…ÙŠÙ„ Ø£Ø¨Ø¯Ø§Ù‹.

import { NextRequest, NextResponse } from "next/server";
import { computeZakat, buildSystemPrompt, type FinancialProfile } from "@/lib/wakeel";

export const runtime = "nodejs";
export const maxDuration = 30; // Ø§Ù„Ø¨Ø­Ø« Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ù‚Ø¯ ÙŠØ­ØªØ§Ø¬ ÙˆÙ‚Øª Ø£Ø·ÙˆÙ„

type Msg = { role: "user" | "assistant"; content: string };

// Ù†ÙØ³ Ø¯Ø§Ù„ØªÙŠ Ø§Ù„Ù…ØµØ§Ø¯Ù‚Ø© ÙˆØ§Ù„Ø¬Ù„Ø¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ØªÙŠÙ† ÙÙŠ Ø±Ø§ÙˆØª Ø§Ù„Ù…Ø­ÙØ¸Ø© (ÙˆØ­Ù‘Ø¯Ù‡Ù…Ø§ ÙÙŠ lib Ù„Ùˆ Ø­Ø¨ÙŠØª)
async function getUserId(): Promise<string | null> {
  return "test-user";
}
async function loadProfileFromDB(userId: string): Promise<FinancialProfile> {
  // TODO: Ù†ÙØ³ Ø§Ø³ØªØ¹Ù„Ø§Ù… Ø±Ø§ÙˆØª Ø§Ù„Ù…Ø­ÙØ¸Ø©
  return { currency: "Ø¯.Ø¥", cash: 50000, investments: 220000, gold: 30000, receivables: 10000, liabilities: 20000, nisab: 24000 };
}

export async function POST(req: NextRequest) {
  const userId = "test-user";
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { messages, name = "ÙˆÙƒÙŠÙ„" } = (await req.json()) as { messages: Msg[]; name?: string };
  if (!Array.isArray(messages) || messages.length === 0)
    return NextResponse.json({ error: "messages required" }, { status: 400 });

  const summary = computeZakat(await loadProfileFromDB(userId));
  const system = buildSystemPrompt(name, summary);

  const callClaude = async (useTools: boolean): Promise<string> => {
    const body: Record<string, unknown> = {
      model: "claude-3-5-haiku-latest",
      max_tokens: 1000,
      system,
      messages: messages.slice(-12),
    };
    // Ø£Ø¯Ø§Ø© Ø§Ù„Ø¨Ø­Ø« Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ù…Ù† Anthropic (Ø³ÙŠØ±ÙØ±-Ø³Ø§ÙŠØ¯ØŒ ØªÙ†ÙØ°Ù‡Ø§ Ø£Ù†Ø«Ø±ÙˆØ¨ÙŠÙƒ ÙˆØªØ±Ø¬Ø¹ Ø§Ù„Ù†Øµ Ø¬Ø§Ù‡Ø²)
    if (useTools) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];

      if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is missing" },
      { status: 500 }
    );
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json","x-api-key": process.env.ANTHROPIC_API_KEY as string,
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
    try { text = await callClaude(true); }           // Ø¬Ø±Ù‘Ø¨ Ù…Ø¹ Ø§Ù„Ø¨Ø­Ø« Ø§Ù„Ù…Ø¨Ø§Ø´Ø±
    catch { text = await callClaude(false); }         // ÙˆØ¥Ù„Ø§ Ø§Ø±Ø¬Ø¹ Ø¨Ø¯ÙˆÙ† Ø£Ø¯ÙˆØ§Øª (ØªØ¯Ø±Ù‘Ø¬ Ø¢Ù…Ù†)
    return NextResponse.json({ text: text || "â€¦" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "failed" }, { status: 500 });
  }
}



