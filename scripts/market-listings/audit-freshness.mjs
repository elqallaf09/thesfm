#!/usr/bin/env node
// Read-only date audit. Never verifies evidence, renews records, or requests data.
import { readFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const DAY = 86_400_000;
export const WINDOW_DAYS = 90;
export const REVIEW_MAX_DAYS = 30;
function day(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
}
export function auditFreshness(records, now = Date.now()) {
  if (!Array.isArray(records) || !Number.isFinite(now)) throw new Error('Invalid audit input');
  const today = Math.floor(now / DAY) * DAY;
  const rows = records.map(row => {
    const first = day(row?.firstTradeDate), verified = day(row?.verifiedAt), review = day(row?.reviewAfter);
    let status;
    if (![first, verified, review].every(Number.isFinite) || first > verified || verified > today
      || review <= verified || review > verified + REVIEW_MAX_DAYS * DAY) status = 'invalid-dates';
    else if (first < today - WINDOW_DAYS * DAY) status = 'aged-out';
    else if (review <= today) status = 'expired';
    else if (review <= today + 7 * DAY) status = 'review-due';
    else status = 'active';
    return { symbol: row?.symbol, reviewAfter: row?.reviewAfter, status };
  });
  const counts = Object.fromEntries(['active', 'review-due', 'expired', 'aged-out', 'invalid-dates']
    .map(status => [status, rows.filter(row => row.status === status).length]));
  return { asOf: new Date(today).toISOString().slice(0, 10), counts, rows };
}
const safeText = value => String(value ?? '').replace(/[^a-zA-Z0-9 ._-]/g, '?');
export async function main() {
  const records = JSON.parse(await readFile(new URL('../../src/data/market-listings/verified-us-listings.json', import.meta.url), 'utf8'));
  const report = auditFreshness(records);
  const lines = ['## Reviewed US listings: date freshness', '', `UTC date: ${report.asOf}`, '',
    'Advisory only: date-current is not verification of evidence, complete coverage, or quote rights.', '',
    ...Object.entries(report.counts).map(([status, count]) => `- ${status}: ${count}`), '',
    '| Symbol | Review deadline (UTC) | Status |', '| --- | --- | --- |',
    ...report.rows.map(row => `| ${safeText(row.symbol)} | ${safeText(row.reviewAfter)} | ${row.status} |`), '',
    'Review original evidence manually. Never extend dates just because a URL responds. Aged-out rows need no renewal.'];
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  if (process.env.GITHUB_ACTIONS === 'true') {
    if (report.counts['review-due'] || report.counts.expired || report.counts['invalid-dates'])
      console.log('::warning::Reviewed listing records need attention; see date freshness summary. No records were changed.');
    if (!report.counts.active && !report.counts['review-due'])
      console.log('::warning::No date-current reviewed listings remain. This does not mean no new US listings exist.');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
