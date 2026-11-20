import type { PortfolioRiskSnapshot } from "./series";

export type StressScenario = {
  id: string;
  labelAr: string;
  labelEn: string;
  /** User-entered hypothetical percentage shock, expressed as a return fraction. */
  shock: number;
};
export type StressOutcome = {
  id: string;
  shock: number;
  hypotheticalChange: number;
  hypotheticalEndingValue: number;
};

/**
 * Applies a user-defined shock to the current verified portfolio value.
 * This is a mechanical scenario, not a forecast or probability estimate.
 * The snapshot must be independently verified before displaying historical metrics.
 */
export function simulatePortfolioShock(
  currentValue: number,
  scenarios: StressScenario[],
): StressOutcome[] | { error: "INVALID_SCENARIO_INPUT" } {
  if (!Number.isFinite(currentValue) || currentValue <= 0 ||
      !scenarios.length || scenarios.length > 20 ||
      scenarios.some(s => !s.id.trim() || !Number.isFinite(s.shock) || s.shock < -1 || s.shock > 10) ||
      new Set(scenarios.map(s => s.id)).size !== scenarios.length) {
    return { error: "INVALID_SCENARIO_INPUT" };
  }
  return scenarios.map(s => ({
    id: s.id,
    shock: s.shock,
    hypotheticalChange: currentValue * s.shock,
    hypotheticalEndingValue: currentValue * (1 + s.shock),
  }));
}

/** Metadata for a verified historical snapshot; never returns invented scenario shocks. */
export function riskScenarioContext(snapshot: PortfolioRiskSnapshot) {
  return {
    methodologyVersion: snapshot.methodologyVersion,
    historicalWindow: { from: snapshot.periodStart, to: snapshot.periodEnd },
    currency: snapshot.currency,
    historicalObservations: snapshot.metrics.observations,
    disclaimer: "HYPOTHETICAL_NOT_FORECAST" as const,
  };
}
