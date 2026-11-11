"use client";

import { useEffect, useState } from "react";

type RiskResponse = {
  currency: string;
  asOf: string;
  holdingsCount: number;
  concentration: { hhi: number; largestWeight: number };
  historicalMetrics: null;
  historicalMetricsStatus: string;
  dataQuality: { status: "partial"; coverage: string };
};
type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: RiskResponse }
  | { kind: "error"; code: string };

export function PortfolioRiskLive({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const ar = locale === "ar";
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/portfolio/risk", {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        const data: unknown = await response.json();
        if (!response.ok || !data || typeof data !== "object" ||
            !("concentration" in data) || !("currency" in data) ||
            !("dataQuality" in data)) {
          const code = data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : "RISK_UNAVAILABLE";
          setState({ kind: "error", code });
          return;
        }
        const risk = data as RiskResponse;
        if (risk.dataQuality?.status !== "partial" ||
            !Number.isFinite(risk.concentration?.largestWeight) ||
            !Number.isFinite(risk.concentration?.hhi) ||
            !/^[A-Z]{3}$/.test(risk.currency)) {
          setState({ kind: "error", code: "INVALID_RISK_RESPONSE" });
          return;
        }
        setState({ kind: "ready", data: risk });
      } catch (error) {
        if (!controller.signal.aborted) setState({ kind: "error", code: "RISK_UNAVAILABLE" });
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  const percent = (v: number) => new Intl.NumberFormat(ar ? "ar-KW" : "en-US", { style: "percent", maximumFractionDigits: 2 }).format(v);
  return (
    <section dir={ar ? "rtl" : "ltr"} className="rounded-2xl border border-[#D4AF6A]/30 bg-[#06080C] p-5 text-white" aria-label={ar ? "تحليل مخاطر محفظتي" : "Portfolio risk analysis"}>
      <h2 className="text-xl font-semibold text-[#D4AF6A]">{ar ? "تحليل مخاطر محفظتي" : "Portfolio risk analysis"}</h2>
      {state.kind === "loading" && <p role="status" className="mt-4">{ar ? "جارٍ تحميل البيانات الموثقة…" : "Loading verified data…"}</p>}
      {state.kind === "error" && <p role="status" className="mt-4 text-slate-300">{ar ? "التحليل غير متاح حتى تكتمل البيانات الموثقة." : "Analysis unavailable until verified data is complete."} <code>{state.code}</code></p>}
      {state.kind === "ready" && <>
        <p className="mt-3 text-sm text-amber-200">{ar ? "تحليل جزئي: بيانات المراكز الحالية فقط. لا تتوفر بعد بيانات تاريخية كافية لتقييم المخاطر بالكامل." : "Partial analysis: current holdings only. Verified historical data is not yet available."}</p>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-3"><dt className="text-sm text-slate-300">{ar ? "أكبر مركز" : "Largest position"}</dt><dd className="text-2xl font-semibold">{percent(state.data.concentration.largestWeight)}</dd></div>
          <div className="rounded-xl bg-white/5 p-3"><dt className="text-sm text-slate-300">{ar ? "مؤشر التركز HHI" : "Concentration HHI"}</dt><dd className="text-2xl font-semibold">{state.data.concentration.hhi.toFixed(3)}</dd></div>
          <div className="rounded-xl bg-white/5 p-3"><dt className="text-sm text-slate-300">{ar ? "عدد المراكز" : "Holdings"}</dt><dd className="text-2xl font-semibold">{state.data.holdingsCount}</dd></div>
          <div className="rounded-xl bg-white/5 p-3"><dt className="text-sm text-slate-300">{ar ? "عملة التقييم" : "Valuation currency"}</dt><dd className="text-2xl font-semibold">{state.data.currency}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-slate-400">{ar ? "وقت التقييم" : "As of"}: <bdi>{state.data.asOf}</bdi></p>
      </>}
    </section>
  );
}
