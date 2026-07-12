import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const page = readFileSync(join(process.cwd(), 'src/app/khums/page.tsx'), 'utf8');

function functionSource(name: string, nextName: string) {
  const start = page.indexOf(`  async function ${name}`);
  const end = page.indexOf(`  async function ${nextName}`, start + 1);
  expect(start, `${name} should exist`).toBeGreaterThan(-1);
  expect(end, `${nextName} should follow ${name}`).toBeGreaterThan(start);
  return page.slice(start, end);
}

describe('Khums saved-year integrity', () => {
  it('preserves persisted zero-percent shares and defaults only absent values', () => {
    expect(page).toContain('year.imam_share_percent ?? 0.5');
    expect(page).toContain('year.sayyid_share_percent ?? 0.5');
    expect(page).not.toContain('toNumber(year.imam_share_percent) || 0.5');
    expect(page).not.toContain('toNumber(year.sayyid_share_percent) || 0.5');
  });

  it('blocks saves until the distribution split is exactly 100 percent with an accessible error', () => {
    const saveStart = page.indexOf('  async function saveKhumsYear()');
    const savingStart = page.indexOf('    setSaving(true);', saveStart);
    const validation = page.indexOf('    if (!splitIsValid) {', saveStart);

    expect(page).toContain('const splitIsValid = splitTotal === 100;');
    expect(validation).toBeGreaterThan(saveStart);
    expect(validation).toBeLessThan(savingStart);
    expect(page).toContain('id="khums-split-error"');
    expect(page).toContain('role="alert" aria-live="assertive"');
    expect(page).toContain("aria-describedby={!splitIsValid ? 'khums-split-error' : undefined}");
  });

  it('selects the year containing today and otherwise falls back to the latest end date', () => {
    expect(page).toContain('function selectKhumsYearForToday(');
    expect(page).toContain('year.start_date.slice(0, 10) <= currentDate && year.end_date.slice(0, 10) >= currentDate');
    expect(page).toContain('right.end_date.localeCompare(left.end_date)');
    expect(page).toContain('const selected = selectKhumsYearForToday(loadedYears, preferredYearId);');
  });

  it('counts only explicit matching-currency payments and explains exclusions', () => {
    expect(page).toContain('payments.filter(payment => normalizeCurrencyCode(payment.currency) === savedYearCurrency)');
    expect(page).toContain('payments.filter(payment => normalizeCurrencyCode(payment.currency) !== savedYearCurrency)');
    expect(page).toContain('const paidTotal = useMemo(() => matchingCurrencyPayments.reduce(');
    expect(page).toContain('integrityCopy.excludedPayments');
    expect(page).toContain('excludedCurrencyPayments.length > 0');
    expect(page).toContain('activeYear && !savedYearCurrency');
  });

  it('persists payments against saved currency and saved due, never unsaved form totals', () => {
    const addPayment = functionSource('addPayment()', 'deletePayment(payment: KhumsPayment)');

    expect(addPayment).toContain('currency: savedYearCurrency');
    expect(addPayment).toContain('statusForSavedKhumsDue(activeYear.khums_due, paidTotal + amount)');
    expect(addPayment).toContain(".eq('id', activeYear.id)");
    expect(addPayment).not.toContain('currency: yearForm.currency');
    expect(addPayment).not.toContain('totalIncome');
    expect(addPayment).not.toContain('totalExpenses');
  });

  it('recomputes and persists the selected year status after deleting a payment', () => {
    const deletePayment = functionSource('deletePayment(payment: KhumsPayment)', 'addReminder()');

    expect(deletePayment).toContain('matchingCurrencyPayments');
    expect(deletePayment).toContain('statusForSavedKhumsDue(activeYear.khums_due, remainingPaidTotal)');
    expect(deletePayment).toContain(".from('khums_years')");
    expect(deletePayment).toContain(".eq('id', activeYear.id)");
    expect(deletePayment).toContain('await loadYears(activeYear.id);');
  });

  it('announces loading, notices, and storage failures to assistive technology', () => {
    expect(page).toContain('role="status"');
    expect(page).toContain('aria-busy="true"');
    expect(page).toContain("role={message.type === 'error' ? 'alert' : 'status'}");
    expect(page).toContain("aria-live={message.type === 'error' ? 'assertive' : 'polite'}");
    expect(page).toContain('className="notice warn" role="alert" aria-live="assertive"');
  });
});
