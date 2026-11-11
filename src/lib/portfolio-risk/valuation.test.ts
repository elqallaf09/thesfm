import { describe, expect, it } from "vitest";
import { validatePositionValuations, type PositionValuation } from "./valuation";
const now = Date.parse("2026-11-11T12:00:00Z");
const base: PositionValuation = { valueInBaseCurrency: 100, baseCurrency: "KWD", valuedAt: "2026-11-10T12:00:00Z", source: "recorded", sourceQuality: "verified" };
describe("valuation quality gate", () => {
  it("allows a verified zero-valued holding alongside positive holdings", () => {
    const result = validatePositionValuations([base, {...base, valueInBaseCurrency: 0}], now);
    expect(result).toMatchObject({ ok: true, total: 100, weights: [1,0] });
  });
  it("rejects zero total value", () => {
    expect(validatePositionValuations([{...base,valueInBaseCurrency:0}],now)).toEqual({ok:false,code:"ZERO_PORTFOLIO_VALUE"});
  });
  it("rejects missing, stale, future, mixed currency and negative valuations", () => {
    for (const p of [
      {...base, valueInBaseCurrency: null},
      {...base, valueInBaseCurrency: -1},
      {...base, baseCurrency: "usd"},
      {...base, valuedAt: "2026-10-01T00:00:00Z"},
      {...base, valuedAt: "2026-11-12T00:00:00Z"},
      {...base, sourceQuality: "stale"},
    ]) expect(validatePositionValuations([p],now)).toMatchObject({ok:false});
    expect(validatePositionValuations([base,{...base,baseCurrency:"USD"}],now)).toMatchObject({ok:false});
  });
});
