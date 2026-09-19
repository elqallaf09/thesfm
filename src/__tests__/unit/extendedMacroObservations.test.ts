import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentMacroObservation, type MacroObservation } from '@/domain/intelligence/macroObservations';
import { BLS_SERIES, parseBlsObservations, parseUsGdpCsv } from '@/providers/intelligence/usMacroObservations';
import { parseWorldBankObservations } from '@/providers/intelligence/worldBankMacroObservations';

const now = Date.parse('2026-09-19T12:00:00Z');
const row = (year: string, period: string, value: unknown) => ({ year, period, value });
const bls = (series: keyof typeof BLS_SERIES, data: unknown[]) => ({ status: 'REQUEST_SUCCEEDED', Results: { series: [{ seriesID: BLS_SERIES[series], data }] } });
const wb = (year: string, value: unknown, country = 'KW', id = 'NY.GDP.MKTP.KD.ZG') => ({ indicator: { id }, country: { id: country }, date: year, value });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('published macroeconomic observations', () => {
  it('derives CPI YoY only from the same month one year earlier and uses a completed observation period', () => {
    const [result] = parseBlsObservations(bls('CPI_YOY', [row('2026', 'M08', '330'), row('2025', 'M08', '300'), row('2026', 'M07', '327'), row('2025', 'M07', '300')]), 'CPI_YOY', now);
    expect(result.value).toBeCloseTo(10); expect(result.previous).toBeCloseTo(9);
    expect(result).toMatchObject({ period: '2026-08-31', previousPeriod: '2026-07-31', provider: 'BLS', country: 'US' });
    expect(result).not.toHaveProperty('forecast');
  });
  it('never substitutes a nearby year, missing base, annual average or invalid period for inflation', () => {
    expect(parseBlsObservations(bls('CPI_YOY', [row('2026', 'M08', '330'), row('2025', 'M07', '300'), row('2026', 'M13', '340')]), 'CPI_YOY', now)).toEqual([]);
    expect(parseBlsObservations(bls('UNEMPLOYMENT', [row('2026', 'M13', '4'), row('2026', 'M00', '4')]), 'UNEMPLOYMENT', now)).toEqual([]);
  });
  it('preserves real zero, rejects future periods and does not compare nonadjacent months', () => {
    const [result] = parseBlsObservations(bls('UNEMPLOYMENT', [row('2026', 'M08', '0'), row('2026', 'M06', '5'), row('2026', 'M09', '8')]), 'UNEMPLOYMENT', now);
    expect(result).toMatchObject({ value: 0, previous: null, previousPeriod: null, period: '2026-08-31' });
  });
  it.each([null, '', ' ', false, 'NaN', '4x', '-'])('rejects missing BLS numbers: %s', value => {
    expect(parseBlsObservations(bls('UNEMPLOYMENT', [row('2026', 'M08', value)]), 'UNEMPLOYMENT', now)).toEqual([]);
  });
  it('rejects denied responses, another series, stale monthly data and conflicting duplicates', () => {
    expect(parseBlsObservations({ ...bls('UNEMPLOYMENT', [row('2026', 'M08', '4')]), status: 'REQUEST_NOT_PROCESSED' }, 'UNEMPLOYMENT', now)).toEqual([]);
    expect(parseBlsObservations(bls('CPI_YOY', [row('2026', 'M08', '4')]), 'UNEMPLOYMENT', now)).toEqual([]);
    expect(parseBlsObservations(bls('UNEMPLOYMENT', [row('2025', 'M08', '4')]), 'UNEMPLOYMENT', now)).toEqual([]);
    expect(parseBlsObservations(bls('UNEMPLOYMENT', [row('2026', 'M08', '4'), row('2026', 'M08', '5')]), 'UNEMPLOYMENT', now)).toEqual([]);
  });
  it('labels BEA growth as annualized quarterly change without performing another annualization', () => {
    const [result] = parseUsGdpCsv('observation_date,A191RL1Q225SBEA\n2026-01-01,-0.5\n2026-04-01,1.5\n2026-07-01,9\n', now);
    expect(result).toMatchObject({ series: 'GDP_QOQ_ANNUALIZED', value: 1.5, previous: -0.5, period: '2026-06-30', previousPeriod: '2026-03-31' });
    expect(parseUsGdpCsv('observation_date,WRONG\n2026-04-01,1.5', now)).toEqual([]);
    expect(parseUsGdpCsv('<html>Denied</html>', now)).toEqual([]);
  });
  it('matches World Bank country and indicator, preserves negatives and rejects null, future and stale annual values', () => {
    const output = parseWorldBankObservations([{}, [wb('2025', -1.5), wb('2024', 2), wb('2025', 99, 'US'), wb('2026', 10), wb('2025', null, 'KW', 'FP.CPI.TOTL.ZG')]], 'KW', 'KWD', now);
    expect(output).toHaveLength(1); expect(output[0]).toMatchObject({ country: 'KW', currency: 'KWD', series: 'GDP_ANNUAL', value: -1.5, previous: 2, period: '2025-12-31' });
    expect(parseWorldBankObservations([{}, [wb('2020', 5)]], 'KW', 'KWD', now)).toEqual([]);
    expect(parseWorldBankObservations([{}, [wb('2025', '3')]], 'KW', 'KWD', now)).toEqual([]);
    expect(parseWorldBankObservations([{}, [wb('2025', 5), wb('2025', 4)]], 'KW', 'KWD', now)).toEqual([]);
  });
  it('retains the ILO modelled-estimate attribution', () => {
    const [sample] = parseWorldBankObservations([{}, [wb('2025', 2.1, 'KW', 'SL.UEM.TOTL.ZS')]], 'KW', 'KWD', now);
    expect(sample.provider).toContain('modelled estimate');
  });
  it('uses series-specific freshness and never renews an old monthly or annual period from a fresh retrieval', () => {
    const sample: MacroObservation = { series: 'CPI_YOY', country: 'US', currency: 'USD', value: 3, previous: null, previousPeriod: null, unit: '%', period: '2026-08-31', retrievedAt: new Date(now).toISOString(), provider: 'BLS', sourceUrl: 'https://www.bls.gov/cpi/' };
    expect(currentMacroObservation(sample, now)).toBe(true);
    expect(currentMacroObservation({ ...sample, series: 'SOFR' }, now)).toBe(false);
    expect(currentMacroObservation({ ...sample, period: '2026-01-31' }, now)).toBe(false);
    expect(currentMacroObservation({ ...sample, period: '2026-02-30' }, now)).toBe(false);
    expect(currentMacroObservation({ ...sample, retrievedAt: '2026-09-20T00:00:00Z' }, now)).toBe(false);
  });
  it('deduplicates source requests and retains dated valid evidence during a transient outage', async () => {
    vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now);
    const sample = parseWorldBankObservations([{}, [wb('2025', 2)]], 'KW', 'KWD', now);
    const { cachedMacroObservations } = await import('@/providers/intelligence/macroObservationCache');
    const loader = vi.fn().mockResolvedValue(sample);
    const [first, second] = await Promise.all([cachedMacroObservations('test:kw', 3600, loader), cachedMacroObservations('test:kw', 3600, loader)]);
    expect(first).toEqual(second); expect(loader).toHaveBeenCalledTimes(1);
    vi.setSystemTime(now + 2 * 3600_000); loader.mockRejectedValue(new Error('outage'));
    expect(await cachedMacroObservations('test:kw', 3600, loader)).toEqual(first);
    vi.setSystemTime(now + 8 * 86_400_000);
    expect(await cachedMacroObservations('test:kw', 3600, loader)).toEqual([]);
  });
});
