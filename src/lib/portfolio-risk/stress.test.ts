import { describe, expect, it } from "vitest";
import { simulatePortfolioShock } from "./stress";
describe("explicit hypothetical stress scenarios", () => {
  it("calculates a user-specified negative shock without forecasting", () => {
    expect(simulatePortfolioShock(1000, [{id:"user-shock",labelAr:"صدمة",labelEn:"Shock",shock:-0.2}])).toEqual([
      {id:"user-shock",shock:-0.2,hypotheticalChange:-200,hypotheticalEndingValue:800},
    ]);
  });
  it("rejects non-finite values, impossible losses and duplicate scenario IDs", () => {
    const scenario = {id:"s",labelAr:"",labelEn:"",shock:-1.1};
    expect(simulatePortfolioShock(1000,[scenario])).toEqual({error:"INVALID_SCENARIO_INPUT"});
    expect(simulatePortfolioShock(Number.NaN,[{...scenario,shock:-0.1}])).toEqual({error:"INVALID_SCENARIO_INPUT"});
    expect(simulatePortfolioShock(1000,[{...scenario,shock:-0.1},{...scenario,shock:-0.2}])).toEqual({error:"INVALID_SCENARIO_INPUT"});
  });
});
