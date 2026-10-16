import { describe, expect, it } from 'vitest';
import { businessAccess, resourceFor, resources, shortcuts } from '../../../apps/expo-go/native/catalog';
import { formValues, recordPayload, recordQuery, totalsByCurrency } from '../../../apps/expo-go/native/records';
import { consumeDetailBack, onDetailBack, onNavigate, openScreen } from '../../../apps/expo-go/native/navigation';

describe('native product boundaries and navigation', () => {
  it('keeps each product on its own resources', () => {
    expect(resourceFor('/customers', 'finance')).toBeUndefined();
    expect(resourceFor('/income', 'business')).toBeUndefined();
    expect(resourceFor('/invest', 'investor')?.path).toBe('/investments');
    expect(shortcuts.business.every(([, label]) => !['المال', 'الأسواق'].includes(label))).toBe(true);
  });
  it('routes within the app and consumes editor back before leaving a screen', () => {
    const paths: string[] = []; const off = onNavigate(path => paths.push(path));
    openScreen('/customers'); expect(paths).toEqual(['/customers']); off();
    const clean = onDetailBack(() => true); expect(consumeDetailBack()).toBe(true); clean(); expect(consumeDetailBack()).toBe(false);
  });
  it('matches business role restrictions and denies unknown roles', () => {
    expect(businessAccess('employee', '/sales')).toEqual({ view: false, write: false, remove: false });
    expect(businessAccess('accountant', '/employees')).toEqual({ view: true, write: false, remove: false });
    expect(businessAccess('accountant', '/sales').write).toBe(true);
    expect(businessAccess(null, '/sales').write).toBe(false);
  });
});
describe('native records and financial input', () => {
  const expense = resourceFor('/expenses', 'finance')!;
  const invoice = resourceFor('/invoices', 'business')!;
  it('scopes reads and mutations to the authenticated owner and row', () => {
    const user = '11111111-1111-4111-8111-111111111111'; const row = '22222222-2222-4222-8222-222222222222';
    const query = recordQuery(expense, user, row);
    expect(query).toContain(`user_id=eq.${user}`); expect(query).toContain(`id=eq.${row}`);
    expect(recordQuery(expense, user, undefined, 100)).toContain('offset=100');
    expect(() => recordQuery(expense, `${user}&or=()`, row)).toThrow('INVALID_ID');
  });
  it('accepts Arabic decimal digits without accepting malformed amounts', () => {
    const initial = { ...formValues(expense), name: 'مصروف', amount: '١٢٫٥٠' };
    expect(recordPayload(expense, initial).amount).toBe(12.5);
    for (const amount of ['1,2,3', '-1', 'Infinity', '12abc']) expect(() => recordPayload(expense, { ...initial, amount })).toThrow();
  });
  it('does not allow form input to replace ownership or undeclared fields', () => {
    const payload = recordPayload(expense, { ...formValues(expense), name: 'مصروف', amount: '10', user_id: 'other', id: 'other', role: 'admin' });
    expect(payload).not.toHaveProperty('user_id'); expect(payload).not.toHaveProperty('id'); expect(payload).not.toHaveProperty('role');
  });
  it('rejects impossible calendar dates and backwards invoice dates', () => {
    expect(() => recordPayload(expense, { ...formValues(expense), name: 'مصروف', amount: '1', date: '2026-02-30' })).toThrow();
    expect(() => recordPayload(invoice, { ...formValues(invoice), title: 'فاتورة', invoice_number: 'A1', amount: '1', invoice_date: '2026-10-10', due_date: '2026-10-09' })).toThrow();
  });
  it('roundtrips goal metadata without erasing existing note fields', () => {
    const goal = resourceFor('/goals', 'finance')!;
    const original = { goal: 'سفر', amount: 1000, duration: '12', notes: JSON.stringify({ currentAmount: 40, currency: 'USD', description: 'ملاحظة', deadline: '2027-01-01' }) };
    const form = formValues(goal, original); expect(form.currentAmount).toBe('40');
    const payload = recordPayload(goal, { ...form, currentAmount: '50' }, original);
    expect(JSON.parse(String(payload.notes))).toMatchObject({ currentAmount: 50, currency: 'USD', deadline: '2027-01-01' });
    expect(payload).not.toHaveProperty('currentAmount');
  });
  it('keeps multi-currency totals separate and omits unknown amounts', () => {
    expect(totalsByCurrency([{ amount: 10, currency: 'USD' }, { amount: '5', currency: 'KWD' }, { amount: null, currency: 'USD' }, { amount: 100 }])).toEqual([['USD', 10], ['KWD', 5]]);
  });
  it('has bounded, unique resource mappings and safe symbols', () => {
    expect(new Set(resources.map(r => r.path)).size).toBe(resources.length);
    const watch = resourceFor('/market-watchlist', 'investor')!;
    expect(recordPayload(watch, { ...formValues(watch), symbol: 'aapl' }).symbol).toBe('AAPL');
    expect(() => recordPayload(watch, { ...formValues(watch), symbol: '../bad' })).toThrow();
  });
});
