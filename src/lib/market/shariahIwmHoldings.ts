import { createHash } from 'node:crypto';
import { secureFetch } from '@/lib/sharia-research/secureFetch';

export const IWM_HOLDINGS_URL = 'https://www.ishares.com/us/products/239710/ishares-russell-2000-etf/latest-holdings.csv';
export type IwmHolding = { symbol: string; name: string; identifier: string; weight: number; currency: string;
  assetClass: string; exchange: string; notionalValue: number; marketValue: number };

const IWM_DISCLOSURE_START = 'The content contained herein is owned or licensed by BlackRock';
const IWM_DISCLOSURE_END = 'All other trademarks are those of their respective owners.';
const IWM_DISCLOSURE_PARAGRAPHS = [IWM_DISCLOSURE_START, 'Holdings subject to change.', 'The values for ',
  'Please see ', 'CAREFULLY CONSIDER ', 'This information ', 'This material ', 'The Funds ', 'The iShares Funds ', '©'];

/** Bounded RFC-4180 parser. Text and cells are never executed as formulas. */
export function parseHoldingsCsv(text: string): string[][] {
  return parseCsv(text, false);
}
function parseCsv(text: string, allowIwmDisclosure: boolean): string[][] {
  if (text.length > 2_000_000 || text.includes('\0')) throw new Error('fund_csv_size_or_encoding');
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false, quotedCell = false;
  const pushCell = () => { row.push(cell); cell = ''; closed = false; quotedCell = false; if (row.length > 30) throw new Error('fund_csv_column_limit'); };
  const pushRow = () => { pushCell(); rows.push(row); row = []; if (rows.length > 10000) throw new Error('fund_csv_row_limit'); };
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else cell += ch;
    } else if (ch === ',' || ch === '\n' || ch === '\r') {
      if (ch === ',') pushCell();
      else { if (ch === '\r' && input[i + 1] === '\n') i++; pushRow(); }
    } else if (ch === '"' && !cell && !closed) { quoted = true; quotedCell = true; }
    else { if (closed || ch === '"') throw new Error('fund_csv_invalid_quotes'); cell += ch; }
    // Only IWM's quoted first-cell disclosure may exceed a holdings-cell limit.
    // Its complete shape and terminal position are checked before any holdings return.
    const disclosure = allowIwmDisclosure && quotedCell && row.length === 0 && cell.startsWith(IWM_DISCLOSURE_START);
    if (cell.length > (disclosure ? 8192 : 2000)) throw new Error('fund_csv_cell_limit');
  }
  if (quoted) throw new Error('fund_csv_unclosed_quote');
  if (cell || row.length || closed) pushRow();
  return rows;
}
function number(text: string) {
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) throw new Error('fund_holdings_number_invalid');
  const value = Number(text.replace(/,/g, ''));
  if (!Number.isFinite(value)) throw new Error('fund_holdings_number_invalid');
  return value;
}
export function parseIwmCsv(text: string, now = new Date()) {
  const rows = parseCsv(text, true);
  if (rows[0]?.[0] !== 'iShares Russell 2000 ETF' || rows[1]?.[0] !== 'Fund Holdings as of') throw new Error('fund_identity_mismatch');
  const match = /^([A-Z][a-z]{2}) (\d{1,2}), (20\d{2})$/.exec(rows[1]?.[1] ?? '');
  const month = match ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[1]) : -1;
  const stamp = match && month >= 0 ? Date.UTC(Number(match[3]), month, Number(match[2])) : NaN;
  if (!Number.isFinite(stamp) || new Date(stamp).getUTCMonth() !== month || stamp > now.getTime()
    || now.getTime() - stamp > 7 * 86400_000) throw new Error('fund_holdings_date_invalid_or_stale');
  const columns = ['Ticker','Name','Sector','Asset Class','Market Value','Weight (%)','Notional Value','Quantity','Price','Location','Exchange','Currency','FX Rate','Market Currency','Accrual Date'];
  const header = rows.findIndex(row => row.length === columns.length && row.every((value, index) => value === columns[index]));
  if (header < 2 || header > 15) throw new Error('fund_holdings_layout_unrecognized');
  const disclosure = rows.findIndex(row => row[0]?.startsWith(IWM_DISCLOSURE_START));
  if (disclosure >= 0) {
    const row = rows[disclosure], paragraphs = row[0].split(/\r?\n/);
    // The official document ends in one quoted legal cell, not another data table.
    // Known paragraph order rejects embedded records and arbitrary appended prose.
    if (disclosure <= header || row.length !== 1 || row[0].includes('"') || !row[0].endsWith(IWM_DISCLOSURE_END)
      || paragraphs.length !== IWM_DISCLOSURE_PARAGRAPHS.length
      || paragraphs.some((paragraph, index) => !paragraph.startsWith(IWM_DISCLOSURE_PARAGRAPHS[index]))
      || !/^©20\d{2} BlackRock,/.test(paragraphs.at(-1)!)
      || !paragraphs.at(-1)!.includes('iSHARES, iBONDS and BLACKROCK')
      || rows.slice(disclosure + 1).some(tail => tail.some(cell => cell.trim()))) throw new Error('fund_disclosure_invalid');
  }
  const holdings: IwmHolding[] = [], identities = new Set<string>();
  for (const row of rows.slice(header + 1, disclosure < 0 ? undefined : disclosure)) {
    if (row.every(cell => !cell.trim())) continue;
    if (row.length !== columns.length || !row[0] || !row[1] || !row[3] || !row[10] || !/^[A-Z]{3}$/.test(row[11])) throw new Error('fund_holdings_row_invalid');
    const identifier = [row[0], row[1], row[3], row[10], row[13]].join('|');
    if (identities.has(identifier)) throw new Error('fund_holdings_duplicate');
    identities.add(identifier);
    const weight = number(row[5]);
    if (Math.abs(weight) > 100) throw new Error('fund_holdings_weight_invalid');
    holdings.push({ symbol: row[0], name: row[1], assetClass: row[3], marketValue: number(row[4]), weight,
      notionalValue: number(row[6]), exchange: row[10], currency: row[11], identifier });
  }
  const totalWeight = holdings.reduce((sum, item) => sum + item.weight, 0);
  // Published weights have only two decimals. Do not renormalize, turn rounded
  // zero positions into absent assets, or equate notional exposure with weight.
  if (holdings.length < 500 || holdings.length > 5000 || totalWeight < 90 || totalWeight > 110) throw new Error('fund_holdings_total_incomplete');
  return { asOf: new Date(stamp).toISOString().slice(0,10), totalWeight, holdings,
    roundedWeightResidual: 100 - totalWeight, totalVerified: false as const,
    nonEquityPositions: holdings.filter(item => item.assetClass !== 'Equity').map(({ name, assetClass, weight, notionalValue, currency }) => ({ name, assetClass, weight, notionalValue, currency })) };
}
export async function loadIwmHoldings(signal: AbortSignal) {
  const response = await secureFetch(IWM_HOLDINGS_URL, { signal, maxBytes: 2_000_000,
    acceptedContentTypes: ['text/plain', 'text/csv', 'application/octet-stream'], cacheTtlMs: 3600_000, respectRobots: true });
  if (response.finalUrl !== IWM_HOLDINGS_URL) throw new Error('fund_source_redirected');
  return { ...parseIwmCsv(new TextDecoder('utf-8', { fatal: true }).decode(response.body)),
    sourceHash: createHash('sha256').update(response.body).digest('hex'), retrievedAt: response.retrievedAt, sourceUrl: IWM_HOLDINGS_URL };
}
