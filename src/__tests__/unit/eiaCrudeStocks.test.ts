import { describe, expect, it } from 'vitest';
import { parseEiaCommercialCrudeStocksHtml } from '@/lib/market/eiaCrudeStocks';

describe('EIA commercial crude stocks parser', () => {
  it('extracts the latest two U.S. weekly observations from the EIA table', () => {
    const html = '<table>'
      + '<tr><th></th><th>08/28/26</th><th>09/04/26</th><th>09/11/26</th><th>View History</th></tr>'
      + '<tr><td>U.S.</td><td>424,460</td><td>424,069</td><td>423,429</td><td>1982-2026</td></tr>'
      + '</table><div>Release Date: 9/16/2026</div>';
    const result = parseEiaCommercialCrudeStocksHtml(html, '2026-09-20T00:00:00.000Z');
    expect(result).toMatchObject({
      latest: 423.429,
      previous: 424.069,
      weeklyChange: -0.64,
      asOf: '2026-09-11',
      previousAsOf: '2026-09-04',
      releaseDate: '2026-09-16',
    });
    expect(result?.weeklyChangePct).toBeCloseTo(-0.15, 2);
  });

  it('returns null when the table does not contain enough dated U.S. observations', () => {
    expect(parseEiaCommercialCrudeStocksHtml('<table><tr><td>U.S.</td><td>100</td></tr></table>')).toBeNull();
  });
});
