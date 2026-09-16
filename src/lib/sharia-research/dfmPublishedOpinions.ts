import { createHash } from 'node:crypto';
import { secureFetch } from './secureFetch';

export const DFM_PUBLICATION_PAGE = 'https://www.dfm.ae/the-exchange/statistics-reports/sharia-classification-list';
export type PublishedOpinion = { source: 'DFM'; exchange: 'XDFM' | 'DIFX'; symbol: string; name: string;
  opinion: 'compliant'; originalWording: string; asOf: string; sourceUrl: string; retrievedAt: string;
  sourceHash: string; quarter: number; year: number; reviewDue: boolean };
type Period = { year: number; quarter: number; date: string; exchanges: string[] };

export function selectDfmPublication(value: unknown, now = new Date()): Period {
  if (!Array.isArray(value) || value.length > 200) throw new Error('dfm_invalid_publication_index');
  const periods = value.flatMap(item => {
    const year = Number(item?.year), quarter = Number(item?.quarter);
    if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(quarter) || quarter < 1 || quarter > 4 || !Array.isArray(item?.exchanges)) return [];
    const date = new Date(Date.UTC(year, quarter * 3, 0)).toISOString().slice(0, 10);
    if (date !== item.date || Date.parse(date) > now.getTime()) return [];
    return [{ year, quarter, date, exchanges: item.exchanges.filter((x: unknown) => x === 'dfm' || x === 'nasdaq') }];
  }).sort((a, b) => b.date.localeCompare(a.date));
  if (!periods.length) throw new Error('dfm_no_valid_publication_period');
  return periods[0];
}

export function parseDfmOpinions(value: unknown, period: Period, exchange: string, retrievedAt: string, sourceHash: string, now = new Date()): PublishedOpinion[] {
  if (!period.exchanges.includes(exchange) || !['dfm', 'nasdaq'].includes(exchange)
    || !Array.isArray(value) || value.length > 500) throw new Error('dfm_invalid_classification_response');
  const seen = new Set<string>();
  // A historical published opinion is not a current SFM pass. Flag it after
  // the next reporting quarter ends; never infer a negative from non-membership.
  const reviewDue = now.getTime() > Date.UTC(period.year, period.quarter * 3 + 3, 0, 23, 59, 59);
  return value.map(item => {
    const symbol = typeof item?.symbol === 'string' ? item.symbol.trim().toUpperCase() : '';
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    const wording = typeof item?.remarks === 'string' ? item.remarks.trim() : '';
    if (!/^[A-Z0-9][A-Z0-9._-]{0,31}$/.test(symbol) || name.length < 3 || name.length > 240
      || !/^Shari[’']a Compliance$/i.test(wording) || seen.has(symbol)) throw new Error('dfm_unrecognized_or_duplicate_opinion');
    seen.add(symbol);
    return { source: 'DFM', exchange: exchange === 'dfm' ? 'XDFM' : 'DIFX', symbol, name, opinion: 'compliant',
      originalWording: wording, asOf: period.date, sourceUrl: DFM_PUBLICATION_PAGE, retrievedAt,
      sourceHash, quarter: period.quarter, year: period.year, reviewDue };
  });
}

export async function loadDfmPublishedOpinions(signal?: AbortSignal): Promise<PublishedOpinion[]> {
  const read = async (publicReadForm: Record<string, string>) => {
    const response = await secureFetch('https://api2.dfm.ae/web/widgets/v1/data', { publicReadForm,
      signal, acceptedContentTypes: ['application/json'], maxBytes: 2_000_000, cacheTtlMs: 6 * 3600_000,
      respectRobots: true, retries: 1, timeoutMs: 8_000 });
    return { data: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(response.body)), retrievedAt: response.retrievedAt,
      hash: createHash('sha256').update(response.body).digest('hex') };
  };
  const listing = await read({ Command: 'shariahlisting', Language: 'en' });
  const period = selectDfmPublication(listing.data);
  const results = await Promise.all(period.exchanges.map(async exchange => {
    const detail = await read({ Command: 'shariahlistingdetails', Language: 'en', year: String(period.year), quarter: String(period.quarter), exchange });
    return parseDfmOpinions(detail.data, period, exchange, detail.retrievedAt, detail.hash);
  }));
  return results.flat();
}
