import { describe, expect, it } from "vitest";
import { analyzeDailyReturns, concentration } from "./core";

describe("portfolio risk primitives", () => {
  it("rejects insufficient or invalid returns instead of inventing metrics", () => {
    expect(analyzeDailyReturns([0.01])).toEqual({ error: "INSUFFICIENT_OR_INVALID_RETURNS" });
    expect(analyzeDailyReturns(Array(60).fill(Number.NaN))).toEqual({ error: "INSUFFICIENT_OR_INVALID_RETURNS" });
    expect(analyzeDailyReturns(Array(60).fill(0), 0)).toEqual({ error: "INVALID_CALENDAR" });
  });
  it("returns zero risk metrics for constant zero returns", () => {
    expect(analyzeDailyReturns(Array(100).fill(0))).toEqual({
      observations: 100, volatilityAnnualized: 0, historicalVar95: 0, historicalCvar95: 0, maximumDrawdown: 0,
    });
  });
  it("calculates historical tail losses and compounded drawdown", () => {
    const values = [...Array(98).fill(0), -0.1, -0.2];
    const result = analyzeDailyReturns(values);
    expect(result).not.toHaveProperty("error");
    if ("error" in result) return;
    expect(result.historicalVar95).toBe(0);
    expect(result.historicalCvar95).toBeCloseTo(0.06);
    expect(result.maximumDrawdown).toBeCloseTo(0.28);
  });
  it("checks concentration weights", () => {
    expect(concentration([0.5, 0.5])).toEqual({ hhi: 0.5, largestWeight: 0.5 });
    expect(concentration([0.8, 0.3])).toEqual({ error: "INVALID_WEIGHTS" });
  });
});
