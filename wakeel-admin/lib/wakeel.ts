// lib/wakeel.ts
// منطق مشترك: حساب الزكاة + بناء برومبت النظام (مع تحليلات الأدمن اختيارياً).

export type FinancialProfile = {
  currency: string;
  cash: number;
  investments: number;
  gold: number;
  receivables: number;
  liabilities: number;
  nisab: number;
};

export type ZakatSummary = FinancialProfile & {
  totalAssets: number;
  zakatableBase: number;
  zakatRate: "2.5%";
  zakatDue: number;
  zakatStatus: "due" | "not_due";
};

export function computeZakat(p: FinancialProfile): ZakatSummary {
  const totalAssets = p.cash + p.investments + p.gold + p.receivables;
  const zakatableBase = Math.max(0, totalAssets - p.liabilities);
  const due = zakatableBase >= p.nisab;
  return {
    ...p,
    totalAssets,
    zakatableBase,
    zakatRate: "2.5%",
    zakatDue: due ? Math.round(zakatableBase * 0.025) : 0,
    zakatStatus: due ? "due" : "not_due",
  };
}

export function nisabFromGoldPricePerGram(pricePerGram: number): number {
  return Math.round(85 * pricePerGram);
}

// analytics اختياري: يُمرَّر فقط لو المستخدم أدمن.
export function buildSystemPrompt(
  name: string,
  summary: ZakatSummary,
  analytics?: unknown | null
): string {
  let base =
`You are ${name} (وكيل), an elite personal AI assistant for the owner of THE SFM (a smart financial management platform). ` +
`You speak OUT LOUD, so answers are short, natural and conversational — usually 1 to 4 sentences, no markdown, no bullet symbols. ` +
`Reply in the SAME language and dialect the user uses. If they use Gulf Arabic, reply in clear Gulf Arabic. ` +
`You have a LIVE web_search tool — use it for current data (gold/silver price, stock prices, market news, FX) and state figures naturally. ` +
`You have the user's REAL financial profile below. Use ONLY these numbers for portfolio summaries and zakat; never invent holdings. ` +
`Zakat = 2.5% of zakatableBase when zakatableBase >= nisab. ` +
`Be proactive, precise, and warm — like a trusted chief of staff. Refer to yourself as ${name} when natural.\n\n` +
`USER_FINANCIAL_PROFILE = ${JSON.stringify(summary)}`;

  if (analytics) {
    base +=
`\n\nThe user is the ADMIN of THE SFM, so you MAY share site-wide analytics. ` +
`SITE_ANALYTICS = ${JSON.stringify(analytics)}. ` +
`Field meanings: visitors_total/visitors_30d = how many people entered the site, ` +
`buyers_total = how many people purchased a service, ` +
`top_page/top_page_views = the most visited page, ` +
`top_feature/top_feature_uses = the most used feature. State the numbers naturally when asked.`;
  } else {
    base +=
`\n\nThe user is NOT an admin. If asked about site-wide analytics (visitors, sales, top pages/features), ` +
`politely say you can only share that with the admin account.`;
  }
  return base;
}
