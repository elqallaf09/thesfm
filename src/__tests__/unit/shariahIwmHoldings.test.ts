import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/sharia-research/secureFetch', () => ({ secureFetch: vi.fn() }));
import { parseHoldingsCsv, parseIwmCsv } from '@/lib/market/shariahIwmHoldings';
const now = new Date('2026-09-15');
function fixture(extra = '', date = 'Sep 14, 2026') {
  const header = 'Ticker,Name,Sector,Asset Class,Market Value,Weight (%),Notional Value,Quantity,Price,Location,Exchange,Currency,FX Rate,Market Currency,Accrual Date';
  const rows = Array.from({ length: 1000 }, (_, i) => `T${i},Example ${i},Industrials,Equity,100,0.10,100,1,100,United States,NASDAQ,USD,1,USD,-`);
  return `iShares Russell 2000 ETF\nFund Holdings as of,"${date}"\n${header}\n${rows.join('\n')}${extra}`;
}
// Only functional source markers are retained; the disclosure body is synthetic.
function disclosure(body = 'Synthetic legal text. '.repeat(110)) {
  return ['The content contained herein is owned or licensed by BlackRock ' + body,
    'Holdings subject to change. Synthetic notice.', 'The values for synthetic holdings are illustrative.',
    'Please see synthetic documentation.', 'CAREFULLY CONSIDER synthetic risks.',
    'This information is synthetic.', 'This material is synthetic.', 'The Funds synthetic distributor.',
    'The iShares Funds synthetic index notice.',
    '©2026 BlackRock, synthetic copyright. iSHARES, iBONDS and BLACKROCK. All other trademarks are those of their respective owners.',
  ].join('\n');
}
function quoted(text: string) { return `"${text.replace(/"/g, '""')}"`; }
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
  it.each(['\n', '\r\n'])('reads a bounded terminal disclosure without losing any holdings: %j', newline => {
    const source = fixture('\nFUT,Russell future,Cash and/or Derivatives,Futures,0,0.00,10000,1,10000,-,Chicago Mercantile Exchange,USD,1,USD,-'
      + '\nUSD,USD CASH,Cash and/or Derivatives,Cash,-10,-0.01,-10,-10,1,United States,-,USD,1,USD,-');
    const expected = parseIwmCsv(source, now);
    expect(parseIwmCsv((source + '\n' + quoted(disclosure()) + '\n').replace(/\n/g, newline), now)).toEqual(expected);
    expect(expected.holdings).toHaveLength(1002);
    expect(expected.nonEquityPositions.map(position => position.weight)).toEqual([0, -0.01]);
  });
  it('keeps the default cell limit and all holdings limits despite a recognized disclosure', () => {
    expect(() => parseHoldingsCsv(quoted(disclosure()))).toThrow('fund_csv_cell_limit');
    expect(() => parseIwmCsv(fixture().replace('Example 0', 'x'.repeat(2001)) + '\n' + quoted(disclosure()), now)).toThrow('fund_csv_cell_limit');
    expect(() => parseIwmCsv(fixture() + '\n' + quoted(disclosure('x'.repeat(8192))), now)).toThrow('fund_csv_cell_limit');
    expect(() => parseIwmCsv(fixture() + '\n' + quoted(disclosure('x'.repeat(2_000_000))), now)).toThrow('fund_csv_size_or_encoding');
    expect(() => parseIwmCsv(fixture() + '\n' + quoted(disclosure('\0')), now)).toThrow('fund_csv_size_or_encoding');
    expect(() => parseIwmCsv(fixture() + '\n' + Array(31).fill('x').join(','), now)).toThrow('fund_csv_column_limit');
    expect(() => parseIwmCsv(fixture() + '\n'.repeat(10000), now)).toThrow('fund_csv_row_limit');
  });
  it.each([
    'Unknown source footer.',
    disclosure().replace('BlackRock', 'Unknown issuer'),
    disclosure().replace('All other trademarks are those of their respective owners.', 'Unexpected ending.'),
    disclosure().replace('This information is synthetic.', 'Unknown paragraph.'),
    disclosure().replace('This information is synthetic.', 'FAKE,Holding,Industrials,Equity,100,1,100,1,100,US,NASDAQ,USD,1,USD,-'),
    disclosure().replace('This information is synthetic.', '"FAKE","Holding","Equity"'),
  ])('rejects unknown disclosures and embedded records: %#', footer => {
    expect(() => parseIwmCsv(fixture() + '\n' + quoted(footer), now)).toThrow();
  });
  it('requires the disclosure to be terminal, complete and after a complete holdings table', () => {
    const footer = quoted(disclosure());
    expect(() => parseIwmCsv(fixture() + '\n' + footer + '\nEXTRA,Holding,Industrials,Equity,100,1,100,1,100,US,NASDAQ,USD,1,USD,-', now)).toThrow('fund_disclosure_invalid');
    expect(() => parseIwmCsv(fixture() + '\n' + footer + '\nUnknown trailing text', now)).toThrow('fund_disclosure_invalid');
    expect(() => parseIwmCsv(fixture() + '\n' + footer.slice(0, -1), now)).toThrow('fund_csv_unclosed_quote');
    expect(() => parseIwmCsv(fixture().split('\n').slice(0, 100).join('\n') + '\n' + footer, now)).toThrow('fund_holdings_total_incomplete');
    expect(() => parseIwmCsv(fixture().replace('Ticker,Name', footer + '\nTicker,Name'), now)).toThrow('fund_disclosure_invalid');
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
