import { describe, expect, it } from 'vitest';
import { parseEiaChokepointsHtml } from '@/lib/market/eiaChokepoints';

describe('EIA global chokepoint parser', () => {
  it('extracts the latest Hormuz and Bab el-Mandeb oil-flow baselines', () => {
    const html = [
      '<div>Release Date: August 12, 2026</div>',
      '<h1>Global Energy Security Data</h1>',
      '<table>',
      '<tr><th></th><th>1Q25</th><th>2Q25</th><th>3Q25</th><th>4Q25</th><th>1Q26</th><th>2Q26</th></tr>',
      '<tr><td>Strait of Malacca</td><td>22.3</td><td>23.8</td><td>23.4</td><td>24.9</td><td>21.3</td><td>16.6</td></tr>',
      '<tr><td>Strait of Hormuz</td><td>20.9</td><td>21.0</td><td>21.3</td><td>21.6</td><td>14.9</td><td>4.9</td></tr>',
      '<tr><td>Bab el-Mandeb</td><td>3.9</td><td>4.5</td><td>4.6</td><td>5.4</td><td>5.6</td><td>8.1</td></tr>',
      '</table>',
      '<p>Since the end of February 2026, AIS signal data for ships transiting the Strait of Hormuz have become especially unreliable. For 2026 Hormuz volumes, tanker tracking data are being revised frequently.</p>',
    ].join('');
    const result = parseEiaChokepointsHtml(html, '2026-09-20T00:00:00.000Z');

    expect(result?.releaseDate).toBe('2026-08-12');
    expect(result?.hormuz).toMatchObject({
      period: '2Q26',
      millionBarrelsPerDay: 4.9,
      previousPeriod: '1Q26',
      previousMillionBarrelsPerDay: 14.9,
      changeMillionBarrelsPerDay: -10,
    });
    expect(result?.babElMandeb).toMatchObject({
      period: '2Q26',
      millionBarrelsPerDay: 8.1,
      previousPeriod: '1Q26',
      previousMillionBarrelsPerDay: 5.6,
      changeMillionBarrelsPerDay: 2.5,
    });
    expect(result?.aisReliabilityCaveat).toBe(true);
    expect(result?.caveat).toContain('AIS');
  });

  it('rejects pages without the paired chokepoint table', () => {
    expect(parseEiaChokepointsHtml('<table><tr><td>Strait of Hormuz</td><td>4.9</td></tr></table>')).toBeNull();
  });
});
