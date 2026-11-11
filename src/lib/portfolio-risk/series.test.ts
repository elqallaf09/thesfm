import { describe, expect, it } from "vitest";
import { analyzePortfolioSeries, type NavPoint } from "./series";

function points(): NavPoint[] {
  const start = Date.UTC(2025,0,1);
  return Array.from({length: 61},(_,i)=>({
    date: new Date(start+i*86400000).toISOString().slice(0,10),
    nav: 1000+i*10, netExternalFlow: 10,
  }));
}
describe("portfolio NAV series",()=>{
  it("subtracts contributions instead of treating them as investment returns",()=>{
    const result=analyzePortfolioSeries({points:points(),weights:[0.4,0.6],currency:"KWD"});
    expect(result).not.toHaveProperty("error");
    if("error" in result)return;
    expect(result.metrics.volatilityAnnualized).toBeCloseTo(0);
    expect(result.metrics.historicalVar95).toBe(0);
    expect(result.concentration.hhi).toBeCloseTo(0.52);
  });
  it("fails closed on missing days, duplicates, invalid currency and short histories",()=>{
    expect(analyzePortfolioSeries({points:points().slice(0,2),weights:[1],currency:"KWD"})).toEqual({error:"INVALID_NAV_SERIES"});
    const duplicates=points();duplicates[2].date=duplicates[1].date;
    expect(analyzePortfolioSeries({points:duplicates,weights:[1],currency:"KWD"})).toEqual({error:"INVALID_NAV_SERIES"});
    expect(analyzePortfolioSeries({points:points(),weights:[1],currency:"kwd"})).toEqual({error:"INVALID_CURRENCY"});
    expect(analyzePortfolioSeries({points:points(),weights:[0.7],currency:"KWD"})).toEqual({error:"INVALID_POSITIONS"});
  });
});
