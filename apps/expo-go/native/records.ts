import type { Resource, Row } from './catalog';

export function normalizeNumber(value: string) {
  return value.trim().replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/٫/g, '.').replace(/٬/g, '');
}
export function formValues(resource: Resource, row: Row = {}): Record<string, string> {
  let values = { ...row };
  if (resource.path === '/goals') {
    try { values = { ...values, ...JSON.parse(String(row.notes || '{}')) }; } catch { /* Legacy free text notes. */ }
  }
  if (resource.path === '/projects') values.stepsText = Array.isArray(row.steps) ? row.steps.join('\n') : '';
  return Object.fromEntries(resource.fields.map(field => [field.key, String(values[field.key] ?? (field.initial === 'today' ? new Date().toISOString().slice(0, 10) : field.initial ?? ''))]));
}
export function recordPayload(resource: Resource, form: Record<string, string>, original: Row = {}): Row {
  const payload: Row = {};
  for (const field of resource.fields) {
    let value = (form[field.key] ?? '').trim();
    if (field.required && !value) throw new Error(`أدخل ${field.label}`);
    if (!value) { payload[field.key] = null; continue; }
    if (field.kind === 'number') {
      value = normalizeNumber(value);
      if (!/^(?:\d+\.?\d*|\.\d+)$/.test(value) || !Number.isFinite(Number(value))) throw new Error(`أدخل رقماً صحيحاً في ${field.label}`);
      const number = Number(value);
      if ((field.min != null && number < field.min) || (field.max != null && number > field.max)) throw new Error(`تحقق من قيمة ${field.label}`);
      if (['payment_day', 'salary_day', 'duration'].includes(field.key) && !Number.isInteger(number)) throw new Error(`أدخل عدداً صحيحاً في ${field.label}`);
      payload[field.key] = number;
    } else if (field.kind === 'date') {
      const parsed = new Date(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`أدخل ${field.label} بصيغة YYYY-MM-DD`);
      payload[field.key] = value;
    } else if (field.kind === 'boolean') payload[field.key] = value === 'true';
    else {
      if (field.kind === 'currency' && !/^[A-Za-z]{3}$/.test(value)) throw new Error('أدخل رمز العملة من 3 أحرف مثل KWD');
      if (field.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('تحقق من البريد الإلكتروني');
      if (field.options && !field.options.some(([key]) => key === value)) throw new Error(`تحقق من ${field.label}`);
      payload[field.key] = field.kind === 'currency' ? value.toUpperCase() : value;
    }
  }
  if (resource.path === '/goals') {
    if (Number(payload.currentAmount) > Number(payload.amount)) throw new Error('المدخر يتجاوز المبلغ المستهدف');
    let prior: Row = {};
    try { prior = JSON.parse(String(original.notes || '{}')); } catch { /* Legacy note. */ }
    payload.notes = JSON.stringify({ ...prior, currentAmount: payload.currentAmount, monthlyContribution: payload.monthlyContribution, currency: payload.currency, description: payload.description });
    for (const key of ['currentAmount', 'monthlyContribution', 'currency', 'description']) delete payload[key];
    payload.duration = String(payload.duration); payload.duration_unit = 'month';
  }
  if (resource.path === '/projects') {
    payload.steps = String(payload.stepsText || '').split('\n').map(x => x.trim()).filter(Boolean);
    delete payload.stepsText;
    payload.budget = String(payload.budget ?? ''); payload.timeline = String(payload.timeline ?? '');
  }
  if (['/market-watchlist', '/alerts'].includes(resource.path)) {
    const symbol = String(payload.symbol).toUpperCase();
    if (!/^[A-Z0-9^][A-Z0-9._:=^\/-]{0,31}$/.test(symbol)) throw new Error('أدخل رمز أداة صالحاً');
    payload.symbol = symbol;
  }
  if (resource.path === '/employees') { payload.employee_name = payload.name; payload.payroll_due_day = payload.salary_day; }
  if (resource.path === '/debts' && Number(payload.remaining_amount) > Number(payload.original_amount)) throw new Error('الرصيد المتبقي يتجاوز أصل الالتزام');
  if (resource.path === '/invoices' && payload.due_date && String(payload.due_date) < String(payload.invoice_date)) throw new Error('تاريخ الاستحقاق يسبق تاريخ الفاتورة');
  return payload;
}

export function recordQuery(resource: Resource, userId: string, id?: string, offset = 0) {
  if (!/^[a-f0-9-]{36}$/i.test(userId) || (id && !/^[a-f0-9-]{36}$/i.test(id))) throw new Error('INVALID_ID');
  const query = new URLSearchParams({ select: '*', user_id: `eq.${userId}` });
  if (id) query.set('id', `eq.${id}`);
  else { query.set('order', 'created_at.desc,id.desc'); query.set('limit', '100'); query.set('offset', String(offset)); }
  return `/rest/v1/${resource.table}?${query}`;
}
export function totalsByCurrency(rows: Row[], key = 'amount'): [string, number][] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const code = String(row.currency || '').trim();
    const value = row[key];
    if (!/^[A-Z]{3}$/.test(code) || value == null || value === '' || !Number.isFinite(Number(value))) continue;
    totals.set(code, (totals.get(code) ?? 0) + Number(value));
  }
  return [...totals.entries()];
}
