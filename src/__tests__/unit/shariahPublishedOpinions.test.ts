import { describe, expect, it } from 'vitest';
import { selectDfmPublication, parseDfmOpinions } from '@/lib/sharia-research/dfmPublishedOpinions';
import { verifiedKfhOpinion } from '@/lib/sharia-research/publishedOpinionCatalog';
import { validatePublicReadForm } from '@/lib/sharia-research/secureFetch';
const now = new Date('2026-09-15T12:00:00Z');
const period = { year: 2026, quarter: 1, date: '2026-03-31', exchanges: ['dfm','nasdaq'] };
const sample = [{ symbol: 'DIB', name: 'Dubai Islamic Bank', remarks: 'Shari’a Compliance' }];
describe('dated published opinions, distinct from the SFM calculation', () => {
  it('selects the latest valid period rather than assuming input order or a current quarter', () => {
    expect(selectDfmPublication([{ ...period, year: 2099 }, { ...period, date: '2026-02-31' }, period, { ...period, year: 2025, date: '2025-03-31' }], now)).toEqual(period);
  });
  it('keeps official historical positives dated and flags the need for a newer confirmation', () => {
    expect(parseDfmOpinions(sample, period, 'dfm', now.toISOString(), 'a'.repeat(64), now)[0]).toMatchObject({ opinion: 'compliant', asOf: '2026-03-31', reviewDue: true, exchange: 'XDFM' });
  });
  it('does not invent negative opinions for absent symbols', () => { expect(parseDfmOpinions([], period, 'dfm', now.toISOString(), 'a'.repeat(64), now)).toEqual([]); });
  it.each([{ value: [{ ...sample[0], remarks: 'Not compliant' }] }, { value: [sample[0], sample[0]] }, { value: [{ ...sample[0], symbol: '<script>' }] }])('rejects unknown semantics, duplicates and unsafe symbols', ({ value }) => {
    expect(() => parseDfmOpinions(value, period, 'dfm', now.toISOString(), 'a'.repeat(64), now)).toThrow();
  });
  it('rejects an unlisted venue', () => { expect(() => parseDfmOpinions(sample, period, 'nyse', now.toISOString(), 'a'.repeat(64), now)).toThrow(); });
  it('does not reuse the visual KFH board annotation if the PDF changes', () => { expect(() => verifiedKfhOpinion('0'.repeat(64), now.toISOString())).toThrow('kfh_board_report_changed_or_invalid'); });
  it('allows only the observed credential-free DFM read protocol', () => {
    expect(() => validatePublicReadForm('https://api2.dfm.ae/web/widgets/v1/data', { Command: 'shariahlisting', Language: 'en' })).not.toThrow();
    for (const [url, form] of [
      ['https://example.com/', { Command: 'shariahlisting', Language: 'en' }],
      ['https://api2.dfm.ae/web/widgets/v1/data', { Command: 'delete', Language: 'en' }],
      ['https://api2.dfm.ae/web/widgets/v1/data', { Command: 'shariahlisting', Language: 'en', key: 'unapproved' }],
    ] as const) expect(() => validatePublicReadForm(url, form)).toThrow();
  });
});
