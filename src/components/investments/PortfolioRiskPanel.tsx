"use client";

import type { PortfolioRiskSnapshot } from "@/lib/portfolio-risk/series";

type Props = {
  snapshot: PortfolioRiskSnapshot | null;
  loading?: boolean;
  error?: string | null;
  locale?: "ar" | "en";
};

export function PortfolioRiskPanel({ snapshot, loading = false, error, locale = "ar" }: Props) {
  const ar = locale === "ar";
  const t = ar
    ? { title: "مخاطر محفظتي", loading: "جارٍ تحليل بيانات المحفظة…", unavailable: "لا تتوفر بيانات موثوقة كافية لتحليل المخاطر.", volatility: "التقلب السنوي", var: "القيمة المعرضة للخطر يومياً (95%)", cvar: "متوسط خسائر أسوأ 5% من الأيام", drawdown: "أقصى تراجع تاريخي", concentration: "أكبر مركز", window: "فترة التحليل", observations: "أيام العوائد", caveat: "هذه مقاييس تاريخية وليست توقعاً أو ضماناً للخسائر المستقبلية." }
    : { title: "Portfolio risk", loading: "Analyzing portfolio data…", unavailable: "Insufficient verified portfolio data for risk analysis.", volatility: "Annualized volatility", var: "Daily historical VaR (95%)", cvar: "Average loss in worst 5% of days", drawdown: "Maximum historical drawdown", concentration: "Largest position", window: "Analysis window", observations: "Return observations", caveat: "Historical measures are not forecasts or guarantees of future losses." };
  const pct = (value: number) => new Intl.NumberFormat(ar ? "ar-KW" : "en-US", { style: "percent", maximumFractionDigits: 2 }).format(value);
  return (
    <section dir={ar ? "rtl" : "ltr"} aria-label={t.title} className="rounded-2xl border border-[#D4AF6A]/25 bg-[#06080C] p-5 text-white">
      <h2 className="text-xl font-semibold text-[#D4AF6A]">{t.title}</h2>
      {loading ? <p role="status" className="mt-4">{t.loading}</p> :
       !snapshot ? <p role="status" className="mt-4 text-slate-300">{error || t.unavailable}</p> :
       <>
         <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
           {[
             [t.volatility, pct(snapshot.metrics.volatilityAnnualized)],
             [t.var, pct(snapshot.metrics.historicalVar95)],
             [t.cvar, pct(snapshot.metrics.historicalCvar95)],
             [t.drawdown, pct(snapshot.metrics.maximumDrawdown)],
             [t.concentration, pct(snapshot.concentration.largestWeight)],
             [t.observations, String(snapshot.metrics.observations)],
           ].map(([label, value]) => (
             <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
               <dt className="text-sm text-slate-300">{label}</dt>
               <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
             </div>
           ))}
         </dl>
         <p className="mt-4 text-sm text-slate-300">{t.window}: <bdi>{snapshot.periodStart} – {snapshot.periodEnd}</bdi> · {snapshot.currency} · {snapshot.methodologyVersion}</p>
         <p className="mt-2 text-xs text-slate-400">{t.caveat}</p>
       </>}
    </section>
  );
}
