import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/sharia-research/secureFetch', () => ({ secureFetch: vi.fn() }));
import { parseHoldingsCsv, parseIwmCsv } from '@/lib/market/shariahIwmHoldings';
const now = new Date('2026-09-15');
function fixture(extra = '', date = 'Sep 14, 2026') {
  const header = 'Ticker,Name,Sector,Asset Class,Market Value,Weight (%),Notional Value,Quantity,Price,Location,Exchange,Currency,FX Rate,Market Currency,Accrual Date';
  const rows = Array.from({ length: 1000 }, (_, i) => `T${i},Example ${i},Industrials,Equity,100,0.10,100,1,100,United States,NASDAQ,USD,1,USD,-`);
  return `iShares Russell 2000 ETF\nFund Holdings as of,"${date}"\n${header}\n${rows.join('\n')}${extra}`;
}
describe('iShares source-backed holdings parsing', () => {
  it('parses escaped quotes without evaluating cell text', () => {
    expect(parseHoldingsCsv('"A, B","say ""hello""",=1+1\r\n')).toEqual([['A, B','say "hello"','=1+1']]);
  });
  it('reads all rows and preserves rounding uncertainty', () => {
    const result = parseIwmCsv(fixture(), now);
    expect(result.holdings).toHaveLength(1000); expect(result.totalWeight).toBeCloseTo(100);
    expect(result.totalVerified).toBe(false); expect(result.asOf).toBe('2026-09-14');
  });
  it('retains a zero-weight derivative with positive notional exposure', () => {
    const result = parseIwmCsv(fixture('\nFUT,Russell future,Cash and/or Derivatives,Futures,0,0.00,10000,1,10000,-,Chicago Mercantile Exchange,USD,1,USD,-'), now);
    expect(result.nonEquityPositions).toEqual([expect.objectContaining({ weight: 0, notionalValue: 10000 })]);
  });
  it('retains negative cash exposure instead of dropping the row', () => {
    const result = parseIwmCsv(fixture('\nUSD,USD CASH,Cash and/or Derivatives,Cash,-10,-0.01,-10,-10,1,United States,-,USD,1,USD,-'), now);
    expect(result.nonEquityPositions[0].weight).toBe(-0.01);
  });
  it.each(['Sep 16, 2026', 'Aug 07, 2026', 'Feb 30, 2026'])('rejects future, stale or impossible dates: %s', date => {
    expect(() => parseIwmCsv(fixture('', date), now)).toThrow();
  });
  it('rejects wrong identity, duplicate positions, malformed numbers and truncation', () => {
    expect(() => parseIwmCsv(fixture().replace('iShares Russell 2000 ETF','Different Fund'), now)).toThrow();
    expect(() => parseIwmCsv(fixture().replace('T999,Example 999','T0,Example 0'), now)).toThrow();
    expect(() => parseIwmCsv(fixture().replace('100,0.10,100','100,NaN,100'), now)).toThrow();
    expect(() => parseIwmCsv(fixture().split('\n').slice(0,100).join('\n'), now)).toThrow();
    expect(() => parseHoldingsCsv('"unfinished')).toThrow();
  });
});
