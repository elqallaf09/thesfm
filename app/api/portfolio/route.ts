// app/api/portfolio/route.ts
// ÙŠØ±Ø¬Ù‘Ø¹ Ø§Ù„Ù…Ø­ÙØ¸Ø© Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠØ© Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… + Ø­Ø³Ø§Ø¨ Ø§Ù„Ø²ÙƒØ§Ø©. Ø¨ÙŠØ§Ù†Ø§Øª Ø­Ø³Ø§Ø³Ø© â†’ Ù„Ø§Ø²Ù… ØªÙƒÙˆÙ† Ù…Ø­Ù…ÙŠÙ‘Ø© Ø¨Ø§Ù„Ù…ØµØ§Ø¯Ù‚Ø©.

import { NextRequest, NextResponse } from "next/server";
import { computeZakat, type FinancialProfile } from "@/lib/wakeel";

export const runtime = "nodejs";

// --- 1) Ø§Ù„Ù…ØµØ§Ø¯Ù‚Ø©: Ø§Ø³ØªØ¨Ø¯Ù„Ù‡Ø§ Ø¨Ù†Ø¸Ø§Ù…Ùƒ Ø§Ù„ÙØ¹Ù„ÙŠ ---
async function getUserId(): Promise<string | null> {
  return "test-user";
} = await supabase.auth.getUser(); return data.user?.id ?? null;
  //   Clerk:      const { userId } = auth(); return userId ?? null;
  return req.headers.get("x-user-id"); // placeholder Ù…Ø¤Ù‚Øª
}

// --- 2) Ø¬Ù„Ø¨ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ù† Ù‚Ø§Ø¹Ø¯Ø© Ø¨ÙŠØ§Ù†Ø§ØªÙƒ ÙˆÙ…Ø·Ø§Ø¨Ù‚ØªÙ‡Ø§ Ù…Ø¹ Ø§Ù„Ø´ÙƒÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ ---
async function loadProfileFromDB(userId: string): Promise<FinancialProfile> {
  // TODO: Ø§Ø³ØªØ¹Ù„Ù… Ø¹Ù† Ø¬Ø¯Ø§ÙˆÙ„ THE SFM Ù„Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ØŒ ÙˆØ§Ø¬Ù…Ø¹:
  //   - Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù†Ù‚Ø¯ÙŠØ©   -> cash
  //   - Ø§Ù„Ø£Ø³Ù‡Ù…/Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø±Ø§Øª -> investments (Ù…Ø¬Ù…ÙˆØ¹ Ù‚ÙŠÙ…Ù‡Ø§ Ø§Ù„Ø³ÙˆÙ‚ÙŠØ©)
  //   - Ø§Ù„Ø°Ù‡Ø¨              -> gold
  //   - Ø§Ù„Ø°Ù…Ù… Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©       -> receivables
  //   - Ø§Ù„Ø§Ù„ØªØ²Ø§Ù…Ø§Øª          -> liabilities
  //   - Ø§Ù„Ù†ØµØ§Ø¨: Ø«Ø§Ø¨Øª Ø£Ùˆ Ù…Ø­Ø³ÙˆØ¨ Ù…Ù† Ø³Ø¹Ø± Ø§Ù„Ø°Ù‡Ø¨ Ø§Ù„Ø­ÙŠ (nisabFromGoldPricePerGram)
  return {
    currency: "Ø¯.Ø¥",
    cash: 50000,
    investments: 220000,
    gold: 30000,
    receivables: 10000,
    liabilities: 20000,
    nisab: 24000,
  };
}

export async function GET(req: NextRequest) {
  const userId = "test-user";
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await loadProfileFromDB(userId);
  return NextResponse.json(computeZakat(profile), {
    headers: { "Cache-Control": "private, no-store" }, // Ù„Ø§ ØªÙØ®Ø²ÙŽÙ‘Ù† ÙÙŠ Ø£ÙŠ ÙƒØ§Ø´
  });
}

