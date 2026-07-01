// lib/wakeel.ts
// منطق مشترك بين راوت المحفظة وراوت الوكيل — حساب الزكاة وبناء برومبت النظام.

export type FinancialProfile = {
  currency: string;       // مثال: "د.إ"
  cash: number;           // نقد + حسابات بنكية
  investments: number;    // أسهم / صناديق / استثمارات
  gold: number;           // قيمة الذهب
  receivables: number;    // ديون مستحقة لك (يُرجى استلامها)
  liabilities: number;    // التزامات قصيرة الأجل عليك
  nisab: number;          // قيمة النصاب (يُفضّل تحديثها بسعر الذهب/الفضة الحالي)
};

export type ZakatSummary = FinancialProfile & {
  totalAssets: number;
  zakatableBase: number;
  zakatRate: "2.5%";
  zakatDue: number;
  zakatStatus: "due" | "not_due";
};

// الزكاة = 2.5% من الوعاء الزكوي إذا بلغ النصاب فأكثر.
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

// النصاب من سعر جرام الذهب (85 جرام). اربطها بمصدر سعر حي إن رغبت.
export function nisabFromGoldPricePerGram(pricePerGram: number): number {
  return Math.round(85 * pricePerGram);
}

export function buildSystemPrompt(name: string, summary: ZakatSummary): string {
  return (
`You are ${name} (وكيل), an elite personal AI assistant for the owner of THE SFM (a smart financial management platform). ` +
`You speak OUT LOUD, so answers are short, natural and conversational — usually 1 to 4 sentences, no markdown, no bullet symbols. ` +
`Reply in the SAME language and dialect the user uses. If they use Gulf Arabic, reply in clear Gulf Arabic. ` +
`You have a LIVE web_search tool — use it for current data (gold/silver price, stock prices, market news, FX) and state figures naturally. ` +
`You have the user's REAL financial profile below. Use ONLY these numbers for portfolio summaries and zakat; never invent holdings. ` +
`Zakat = 2.5% of zakatableBase when zakatableBase >= nisab. When asked about zakat, give the amount clearly with the currency. ` +
`Be proactive, precise, and warm — like a trusted chief of staff. Refer to yourself as ${name} when natural.\n\n` +
`USER_FINANCIAL_PROFILE = ${JSON.stringify(summary)}`
  );
}
