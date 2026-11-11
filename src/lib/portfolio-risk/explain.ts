import type { PortfolioRiskSnapshot } from "./series";

export type RiskExplanation = {
  locale: "ar" | "en";
  summary: string;
  observations: string[];
  limitations: string[];
  methodologyVersion: string;
};
/** Grounded, deterministic explanation for AI Analyst; never infer missing metrics. */
export function explainPortfolioRisk(snapshot: PortfolioRiskSnapshot, locale: "ar" | "en" = "ar"): RiskExplanation {
  const ar = locale === "ar";
  const p = (n: number) => (n * 100).toFixed(1) + "%";
  const observations: string[] = [];
  if (snapshot.concentration.largestWeight >= 0.3) {
    observations.push(ar
      ? `أكبر مركز يمثل ${p(snapshot.concentration.largestWeight)} من المحفظة؛ راجع مخاطر التركّز.`
      : `Largest position is ${p(snapshot.concentration.largestWeight)} of the portfolio; review concentration exposure.`);
  }
  observations.push(ar
    ? `التقلب السنوي التاريخي ${p(snapshot.metrics.volatilityAnnualized)}، وأقصى تراجع تاريخي ${p(snapshot.metrics.maximumDrawdown)}.`
    : `Historical annualized volatility is ${p(snapshot.metrics.volatilityAnnualized)} and maximum drawdown is ${p(snapshot.metrics.maximumDrawdown)}.`);
  observations.push(ar
    ? `خسارة VaR اليومية التاريخية عند 95%: ${p(snapshot.metrics.historicalVar95)}؛ ومتوسط خسارة أسوأ 5% من الأيام: ${p(snapshot.metrics.historicalCvar95)}.`
    : `Daily historical 95% VaR loss: ${p(snapshot.metrics.historicalVar95)}; mean loss in worst 5% of days: ${p(snapshot.metrics.historicalCvar95)}.`);
  return {
    locale,
    summary: ar ? "تحليل تاريخي لمخاطر المحفظة، وليس توصية تداول." : "Historical portfolio risk analysis, not a trading recommendation.",
    observations,
    limitations: [ar
      ? `الفترة: ${snapshot.periodStart} إلى ${snapshot.periodEnd}، ${snapshot.metrics.observations} مشاهدة. الأداء السابق لا يضمن النتائج المستقبلية.`
      : `Window: ${snapshot.periodStart} to ${snapshot.periodEnd}; ${snapshot.metrics.observations} observations. Past performance does not guarantee future outcomes.`],
    methodologyVersion: snapshot.methodologyVersion,
  };
}
