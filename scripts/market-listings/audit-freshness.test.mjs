import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditFreshness, WINDOW_DAYS, REVIEW_MAX_DAYS } from './audit-freshness.mjs';
const row = { symbol: 'TEST', firstTradeDate: '2026-11-01', verifiedAt: '2026-11-16', reviewAfter: '2026-12-16' };
const status = (date, patch = {}) => auditFreshness([{ ...row, ...patch }], Date.parse(date)).rows[0].status;
test('UTC due and expiry boundaries match runtime, without changing records', () => {
  assert.equal(status('2026-12-08T23:59:59Z'), 'active');
  assert.equal(status('2026-12-09T00:00:00Z'), 'review-due');
  assert.equal(status('2026-12-15T23:59:59Z'), 'review-due');
  assert.equal(status('2026-12-16T00:00:00Z'), 'expired');
  const input = structuredClone(row);
  auditFreshness([input], Date.parse('2026-12-16'));
  assert.deepEqual(input, row);
});
test('90-day inclusive boundary and aged-out precedence', () => {
  assert.equal(status('2026-11-16', { firstTradeDate: '2026-08-18' }), 'active');
  assert.equal(status('2026-11-16', { firstTradeDate: '2026-08-17' }), 'aged-out');
  assert.equal(status('2027-02-01'), 'aged-out');
});
test('invalid/future/inverted/overlong review dates are not date-current', () => {
  for (const patch of [{ firstTradeDate: '2026-02-30' }, { verifiedAt: '2026-11-17' },
    { firstTradeDate: '2026-11-17' }, { reviewAfter: '2026-11-16' }, { reviewAfter: '2026-12-17' }])
    assert.equal(status('2026-11-16', patch), 'invalid-dates');
  assert.equal(auditFreshness([null], Date.parse('2026-11-16')).rows[0].status, 'invalid-dates');
  assert.equal(auditFreshness([]).counts.active, 0);
});
test('audit window constants stay aligned with runtime validator', async () => {
  const source = await readFile(new URL('../../src/lib/market-news/verifiedListings.ts', import.meta.url), 'utf8');
  assert.match(source, new RegExp(`NEW_LISTING_WINDOW_DAYS = ${WINDOW_DAYS};`));
  assert.match(source, new RegExp(`LISTING_REVIEW_MAX_DAYS = ${REVIEW_MAX_DAYS};`));
});
